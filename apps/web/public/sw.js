// ─── BUMP THIS ON EVERY DEPLOY THAT CHANGES SERVER-RENDERED HTML ───────────
const CACHE_VERSION = 'v6'
// ─────────────────────────────────────────────────────────────────────────────

const CACHE_NAME = `lx2-${CACHE_VERSION}`

// Pages to pre-cache so the app shell works offline
const PRECACHE_URLS = [
  '/',
  '/play',
  '/offline',
  '/manifest.json',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
  '/icons/apple-touch.png',
]

// Install: pre-cache the app shell, then activate immediately
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  )
})

// Activate: delete stale caches, claim all clients
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

// ─── Cache strategies ─────────────────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request)
  if (cached) return cached
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    return new Response('Asset unavailable offline', { status: 503, statusText: 'Service Unavailable' })
  }
}

async function networkFirst(request) {
  try {
    const response = await fetch(request)
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, response.clone())
    }
    return response
  } catch {
    const cached = await caches.match(request)
    if (cached) return cached
    // Fall back to the offline page for navigation requests
    if (request.mode === 'navigate') {
      const offlinePage = await caches.match('/offline')
      if (offlinePage) return offlinePage
    }
    return new Response('Offline', { status: 503, statusText: 'Service Unavailable' })
  }
}

// Stale-while-revalidate for fonts/images: serve cached, update in background
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME)
  const cached = await cache.match(request)

  const fetchPromise = fetch(request).then(response => {
    if (response.ok) cache.put(request, response.clone())
    return response
  }).catch(() => cached)

  return cached || fetchPromise
}

// ─── Fetch handler ────────────────────────────────────────────────────────────

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Only handle same-origin requests
  if (url.origin !== self.location.origin) return

  // Skip non-GET requests (mutations should not be cached)
  if (request.method !== 'GET') return

  // Static assets: cache-first (content-hashed, safe to cache forever)
  if (url.pathname.startsWith('/_next/static/')) {
    event.respondWith(cacheFirst(request))
    return
  }

  // Fonts: stale-while-revalidate (large, rarely change)
  if (url.pathname.startsWith('/_next/static/media/') || url.pathname.match(/\.(woff2?|ttf|otf)$/)) {
    event.respondWith(staleWhileRevalidate(request))
    return
  }

  // Icons and images in /icons/: stale-while-revalidate
  if (url.pathname.startsWith('/icons/')) {
    event.respondWith(staleWhileRevalidate(request))
    return
  }

  // Navigation requests: network-first with cache fallback → offline page
  if (request.mode === 'navigate') {
    event.respondWith(networkFirst(request))
    return
  }

  // Everything else: network-only (Supabase API, etc.)
})
