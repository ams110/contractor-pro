import { cleanupOutdatedCaches, precacheAndRoute, createHandlerBoundToURL } from 'workbox-precaching'
import { registerRoute, NavigationRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

const SUPABASE_CACHE = 'supabase-cache'
const BASE = import.meta.env.BASE_URL || '/'

// Workbox precache (injected by vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST || [])
cleanupOutdatedCaches()

// ── تنقّلات (SPA fallback) — تطبيقان على نفس الأصل ────────────────────────────
// المالك يُخدَم من `index.html` وبوّابة العامل من `worker.html`. بلا هذا التوجيه
// كان `/worker` (وهو rewrite على الخادم) لا يطابق أي مدخل precache، فأول فتح
// أوفلاين — أو بعد rewrite — يقدر يخدم وثيقة المالك للعامل. نوجّه كل تنقّل
// لوثيقته الصحيحة. الطلبات غير التنقّلية (أصول/API) لا تمرّ من هنا.
// (نُسجّل توجيه البوّابة فقط — تنقّلات المالك تبقى على سلوكها السابق (الشبكة)
//  كي لا نحجب صفحات الـprerender الثابتة لكل مسار.)
const WORKER_NAV_RE = /(?:^|\/)worker(?:\.html)?(?:\/|$|\?)/
try {
  registerRoute(new NavigationRoute(
    createHandlerBoundToURL(`${BASE}worker.html`),
    { allowlist: [WORKER_NAV_RE] }
  ))
} catch { /* worker.html غير موجود بالـprecache (بناء قديم) — بلا كسر */ }

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
