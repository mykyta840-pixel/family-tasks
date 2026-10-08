// Service worker: офлайн-кэш (как раньше) + приём push-уведомлений.
import { clientsClaim } from 'workbox-core'
import { cleanupOutdatedCaches, createHandlerBoundToURL, precacheAndRoute } from 'workbox-precaching'
import { NavigationRoute, registerRoute } from 'workbox-routing'

self.skipWaiting()
clientsClaim()
cleanupOutdatedCaches()
precacheAndRoute(self.__WB_MANIFEST)
registerRoute(new NavigationRoute(createHandlerBoundToURL('index.html')))

// ---------- PUSH ----------
self.addEventListener('push', (event) => {
  let d = {}
  try {
    d = event.data ? event.data.json() : {}
  } catch {
    d = { body: event.data ? event.data.text() : '' }
  }
  const title = d.title || 'Family'
  // iOS требует показывать уведомление на каждый push, поэтому показываем всегда
  event.waitUntil(
    (async () => {
      await self.registration.showNotification(title, {
        body: d.body || '',
        icon: '/icon-192.png',
        badge: '/badge-96.png',
        vibrate: [120, 60, 120],
        tag: d.tag || undefined,
        renotify: Boolean(d.tag),
        data: { url: d.url || '/', tag: d.tag || '' },
      })
      // Уведомление показано на этом устройстве: сообщаем открытым окнам (нужно для подтверждения теста)
      const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      list.forEach((c) => c.postMessage({ type: 'push-received', tag: d.tag || '' }))
    })(),
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const tag = (event.notification.data && event.notification.data.tag) || ''
  const url = new URL((event.notification.data && event.notification.data.url) || '/', self.location.origin).href
  event.waitUntil(
    (async () => {
      const list = await self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      for (const c of list) {
        if (new URL(c.url).origin === self.location.origin) {
          await c.focus()
          c.postMessage({ type: 'push-open', url })
          if (tag) c.postMessage({ type: 'push-received', tag })
          return
        }
      }
      await self.clients.openWindow(url)
    })(),
  )
})

// Браузер сменил подписку: просим приложение подписаться заново
self.addEventListener('pushsubscriptionchange', (event) => {
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
      list.forEach((c) => c.postMessage({ type: 'push-resubscribe' }))
    }),
  )
})
