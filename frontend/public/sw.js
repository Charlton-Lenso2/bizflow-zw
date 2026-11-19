const CACHE_NAME = 'bizflow-shell-v1'

const APP_SHELL = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/bizflow-mark.svg',
  '/bizflow-icon-192.png',
  '/bizflow-icon-512.png',
  '/apple-touch-icon.png',
]

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)),
  )

  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) =>
      Promise.all(
        cacheNames
          .filter((cacheName) => cacheName.startsWith('bizflow-shell-') && cacheName !== CACHE_NAME)
          .map((cacheName) => caches.delete(cacheName)),
      ),
    ),
  )

  self.clients.claim()
})

self.addEventListener('fetch', (event) => {
  const request = event.request
  const requestUrl = new URL(request.url)

  if (request.method !== 'GET' || requestUrl.origin !== self.location.origin) {
    return
  }

  // Let the browser handle Vite's generated assets and all API requests normally.
  if (
    requestUrl.pathname.startsWith('/assets/') ||
    requestUrl.pathname.startsWith('/rest/') ||
    requestUrl.pathname.startsWith('/auth/') ||
    requestUrl.pathname.startsWith('/functions/')
  ) {
    return
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put('/index.html', copy))
          }

          return response
        })
        .catch(async () => {
          return (await caches.match('/index.html')) || (await caches.match('/'))
        }),
    )

    return
  }

  if (APP_SHELL.includes(requestUrl.pathname)) {
    event.respondWith(
      caches.match(request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse
        }

        return fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone()
            caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
          }

          return response
        })
      }),
    )
  }
})
