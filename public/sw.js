const CACHE = 'fts-shell-v1'

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys()
    await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))
    await self.clients.claim()
  })())
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  event.respondWith((async () => {
    try {
      const fresh = await fetch(req)
      if (fresh && fresh.status === 200) {
        const cache = await caches.open(CACHE)
        cache.put(req, fresh.clone())
      }
      return fresh
    } catch (err) {
      const cached = await caches.match(req)
      if (cached) return cached
      if (req.mode === 'navigate') {
        const index = (await caches.match('/index.html')) || (await caches.match('/'))
        if (index) return index
      }
      throw err
    }
  })())
})
