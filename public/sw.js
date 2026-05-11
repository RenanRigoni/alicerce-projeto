// Service Worker mínimo — sem cache para dados sensíveis
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

// Sem cache: todas as requisições vão direto à rede
self.addEventListener('fetch', (e) => {
  e.respondWith(fetch(e.request))
})
