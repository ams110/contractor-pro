import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'
import { CacheableResponsePlugin } from 'workbox-cacheable-response'

const SUPABASE_CACHE = 'supabase-cache'

// Workbox precache (injected by vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST || [])
cleanupOutdatedCaches()

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
      for (const client of list) {
        if ('focus' in client) return client.focus()
      }
      return clients.openWindow(url)
    })
  )
})
