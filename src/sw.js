import { cleanupOutdatedCaches, precacheAndRoute } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

// Workbox precache (injected by vite-plugin-pwa)
precacheAndRoute(self.__WB_MANIFEST || [])
cleanupOutdatedCaches()

// Runtime caching — Supabase API
registerRoute(
  ({ url }) => /^https:\/\/.*\.supabase\.co\/.*/i.test(url.href),
  new NetworkFirst({
    cacheName: 'supabase-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 86400 })],
    networkTimeoutSeconds: 10,
  })
)

// ── Push Notification handler (background) ──────────────────────────────────
self.addEventListener('push', event => {
  if (!event.data) return
  let data = { title: 'Contractor Pro', body: '' }
  try { data = event.data.json() } catch { data.body = event.data.text() }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:      data.body,
      icon:      '/pwa-192.png',
      badge:     '/pwa-192.png',
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
