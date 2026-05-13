// Service Worker minimo: sem cache para dados sensiveis.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()))

// Sem cache: todas as requisicoes vao direto a rede.
self.addEventListener('fetch', (event) => {
  event.respondWith(fetch(event.request))
})

self.addEventListener('push', (event) => {
  if (!event.data) return

  const data = event.data.json()
  const url = typeof data.url === 'string' && data.url.startsWith('/') ? data.url : '/'

  event.waitUntil(
    self.registration.showNotification(data.title || 'Alicerce', {
      body: data.body || 'Acesse o sistema para visualizar.',
      icon: data.icon || '/icons/icon-192.png',
      badge: data.badge || '/icons/icon-96.png',
      data: {
        url,
        notificationId: data.notificationId || null,
      },
    })
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()

  const url = event.notification.data?.url || '/'
  const targetUrl = new URL(url, self.location.origin).href

  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: 'window', includeUncontrolled: true })
    for (const client of windows) {
      if ('focus' in client && client.url.startsWith(self.location.origin)) {
        await client.focus()
        if ('navigate' in client) return client.navigate(targetUrl)
        return
      }
    }
    return clients.openWindow(targetUrl)
  })())
})
