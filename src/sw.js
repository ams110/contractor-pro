import { cleanupOutdatedCaches, precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'
import { clientsClaim } from 'workbox-core'
import { WORKER_HOST, isProdDomain } from './lib/workerApp.js'

const SUPABASE_CACHE = 'supabase-cache'
const BASE = import.meta.env.BASE_URL || '/'
const HOST = self.location.hostname
const ON_WORKER_HOST = HOST === WORKER_HOST

// ⚠️ `registerType: 'autoUpdate'` مع استراتيجية `injectManifest` **لا** يفعّل
// النسخة الجديدة لحاله — لازم الـSW نفسه يتخطّى الانتظار ويستلم العملاء. بلا
// هذا يظلّ SW قديم مسيطراً إلى أن تُغلق كل النوافذ، فيخدم نسخة قديمة من الكاش
// (صار فعلياً: SW قديم كان يخدم `worker.html` مخزّنة ويمنع تحويل `/worker`).
self.skipWaiting()
clientsClaim()

// Workbox precache (injected by vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST || [])
cleanupOutdatedCaches()

// ── تنقّلات البوّابة (SPA fallback) ───────────────────────────────────────────
// على **نطاق البوّابة** نخدم `worker.html` من الـprecache فتشتغل أوفلاين.
//
// 🔴 وعلى **نطاق المالك بالإنتاج ممنوع** اعتراض `/worker` إطلاقاً: هناك المسار
// لازم يوصل الشبكة كي ينفّذ الخادمُ التحويلَ لنطاق البوّابة. اعتراضه كان يخدم
// `worker.html` مخزّنة فلا يصير أي تحويل — والمستخدم يعلق على نسخة قديمة
// (صار فعلياً بعد نقل البوّابة لنطاقها: العنوان يظلّ app.kabblan.com/worker
// ويظهر لوغو قديم). التطوير/المعاينة يبقيان على المسار فيُسجَّل التوجيه فيهما.
const WORKER_NAV_RE = /(?:^|\/)worker(?:\.html)?(?:\/|$|\?)/
if (ON_WORKER_HOST || !isProdDomain(HOST)) {
  try {
    registerRoute(new NavigationRoute(
      createHandlerBoundToURL(`${BASE}worker.html`),
      { allowlist: [WORKER_NAV_RE] }
    ))
  } catch { /* worker.html غير موجود بالـprecache (بناء قديم) — بلا كسر */ }
}

// Runtime caching — Supabase API.
// نخزّن فقط قراءات GET الناجحة، ونستثني نقاط المصادقة (/auth/v1/ — توكنات/جلسات
// لا يجوز تخزينها أبداً). يُمسح الكاش عند تسجيل الخروج (رسالة من التطبيق) تجنّباً
// لتسريب بيانات مستخدم سابق على جهاز مشترك.
registerRoute(
  ({ url, request }) =>
    request.method === 'GET' &&
    /^https:\/\/.*\.supabase\.co\//i.test(url.href) &&
    !/\/auth\/v1\//i.test(url.pathname),
  new NetworkFirst({
    cacheName: SUPABASE_CACHE,
    plugins: [
      new CacheableResponsePlugin({ statuses: [200] }),
      new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 86400 }),
    ],
    networkTimeoutSeconds: 10,
  })
)

// مسح كاش بيانات Supabase عند تسجيل الخروج (يُستدعى من التطبيق)
self.addEventListener('message', (event) => {
  if (event.data?.type === 'CLEAR_SUPABASE_CACHE') {
    event.waitUntil(caches.delete(SUPABASE_CACHE))
  }
  // يرسلها عميل vite-plugin-pwa عند اكتشاف نسخة جديدة (نمط autoUpdate)
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting()
})

// ── Push Notification handler (background) ──────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return
  let data = { title: 'كبلان', body: '' }
  try { data = event.data.json() } catch { data.body = event.data.text() }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:      data.body,
      icon:      '/pwa-192.png',
      badge:     '/badge-96.png',
      tag:       data.tag || 'cpro-notif',
      renotify:  true,
      dir:       'rtl',
      lang:      'ar',
      data:      { url: data.url || '/' },
    })
  )
})

// ── Notification click — focus or open the app ──────────────────────────────
self.addEventListener('notificationclick', event => {
  event.notification.close()
  const url = event.notification.data?.url || '/'
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(list => {
      // الإشعارات تخصّ تطبيق المالك — نتجاهل نوافذ بوّابة العامل (تطبيق منفصل)
      // كي لا نفتح البوّابة على إشعار المالك.
      const own = list.filter(c => !WORKER_NAV_RE.test(c.url || ''))
      for (const client of own) {
        if ('focus' in client) return client.focus()
      }
      return clients.openWindow(url)
    })
  )
})
