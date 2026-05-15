import { precacheAndRoute, cleanupOutdatedCaches } from 'workbox-precaching'
import { registerRoute } from 'workbox-routing'
import { NetworkFirst } from 'workbox-strategies'
import { ExpirationPlugin } from 'workbox-expiration'

cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)

// Supabase API → NetworkFirst
registerRoute(
  ({ url }) => url.hostname.endsWith('.supabase.co'),
  new NetworkFirst({
    cacheName: 'supabase-cache',
    plugins: [new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: 86400 })],
    networkTimeoutSeconds: 10,
  })
)

// استقبال Push Notification من السيرفر (حتى لما التطبيق مغلق)
self.addEventListener('push', (event) => {
  let data = { title: 'Contractor Pro', body: '' }
  try { data = { ...data, ...event.data?.json() } } catch { /* ignore */ }

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body:      data.body,
      icon:      data.icon  || '/pwa-192.png',
      badge:     data.badge || '/pwa-192.png',
      tag:       data.type  || 'general',
      renotify:  true,
      dir:       'rtl',
      lang:      'ar',
      vibrate:   [200, 100, 200],
      data:      { url: '/' },
    })
  )
})

// فتح التطبيق عند النقر على الإشعار
self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if ('focus' in client) return client.focus()
      }
      return clients.openWindow('/')
    })
  )
})
