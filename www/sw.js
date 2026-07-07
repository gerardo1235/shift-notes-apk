/* ═══════════════════════════════════════════════════════════
   Shift Notes – Service Worker  (premium dark build)
   Cache-first for app shell · stale-while-revalidate for data
   ═══════════════════════════════════════════════════════════ */

const CACHE    = 'shiftnotes-premium-v1';
const FALLBACK = '/index.html';

const PRECACHE = [
  '/',
  '/index.html',
  '/styles.css',
  '/app.js',
  '/manifest.webmanifest',
  '/icons/icon-192.png',
  '/icons/icon-512.png',
];

// ── Install ───────────────────────────────────────────────
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// ── Activate: purge old caches ────────────────────────────
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: cache-first with network fallback ──────────────
self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  if (!e.request.url.startsWith(self.location.origin)) return;

  e.respondWith(
    caches.match(e.request).then(cached => {
      const network = fetch(e.request).then(res => {
        if (res && res.status === 200 && res.type === 'basic') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      }).catch(() => null);

      return cached || network.catch(() => {
        if (e.request.mode === 'navigate') return caches.match(FALLBACK);
      });
    })
  );
});

// ── Background Sync ───────────────────────────────────────
self.addEventListener('sync', e => {
  if (e.tag === 'sync-shift-data') {
    console.log('[SW] background sync: shift-data');
  }
});

// ── Push ──────────────────────────────────────────────────
self.addEventListener('push', e => {
  if (!e.data) return;
  const d = e.data.json();
  e.waitUntil(
    self.registration.showNotification(d.title || 'Shift Notes', {
      body:  d.body  || '',
      icon:  '/icons/icon-192.png',
      badge: '/icons/icon-96.png',
      tag:   'shift-notes',
      renotify: true,
    })
  );
});
