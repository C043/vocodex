// VOCODEX service worker: keeps the app shell and built assets available
// offline. API calls (another origin) and non-GET requests are never touched.
const CACHE = "vocodex-v1"
const SHELL = ["/", "/manifest.webmanifest", "/icon.svg", "/icon-192.png"]

self.addEventListener("install", event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)))
  self.skipWaiting()
})

self.addEventListener("activate", event => {
  event.waitUntil(
    caches
      .keys()
      .then(keys =>
        Promise.all(keys.filter(key => key !== CACHE).map(key => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", event => {
  const { request } = event
  const url = new URL(request.url)
  if (request.method !== "GET" || url.origin !== self.location.origin) return

  if (request.mode === "navigate") {
    // Network first so deploys show up; cached shell when offline
    event.respondWith(
      fetch(request).catch(() =>
        caches.open(CACHE).then(cache => cache.match("/"))
      )
    )
    return
  }

  if (url.pathname.startsWith("/assets/")) {
    // Hashed file names never change, so the first copy is good forever
    event.respondWith(
      caches.open(CACHE).then(cache =>
        cache.match(request).then(
          cached =>
            cached ||
            fetch(request).then(response => {
              if (response.ok) cache.put(request, response.clone())
              return response
            })
        )
      )
    )
  }
})
