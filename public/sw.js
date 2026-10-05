// Service worker mínimo: hace que la app se pueda instalar.
// No guarda nada en caché para que siempre se vean los datos del momento.
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()))
self.addEventListener('fetch', () => {})
