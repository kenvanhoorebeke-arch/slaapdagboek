// Service Worker voor Slaapdagboek PWA
// Versie verhogen bij elke nieuwe release om cache te verversen
const CACHE_NAAM = 'slaapdagboek-v3';

// Bestanden die offline beschikbaar moeten zijn
const TE_CACHEN = [
  './',
  './index.html',
  './manifest.json',
  './icon-192.png',
  './icon-512.png',
  'https://fonts.googleapis.com/css2?family=Nunito:wght@300;400;600;700;800&family=Lora:ital,wght@0,500;1,400&display=swap'
];

// ── Installatie: cache alle bestanden ────────────────────────────
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAAM).then(cache => {
      // Fonts apart proberen (mogen falen)
      const lokaal = TE_CACHEN.filter(u => !u.startsWith('http'));
      const extern = TE_CACHEN.filter(u => u.startsWith('http'));
      return cache.addAll(lokaal).then(() => {
        return Promise.allSettled(extern.map(u => cache.add(u)));
      });
    })
  );
  self.skipWaiting();
});

// ── Activatie: verwijder oude caches ─────────────────────────────
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_NAAM)
          .map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: cache-first strategie ─────────────────────────────────
self.addEventListener('fetch', event => {
  // Alleen GET requests cachen
  if (event.request.method !== 'GET') return;

  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) return cached;
      // Niet in cache: haal op van netwerk en sla op
      return fetch(event.request).then(response => {
        if (!response || response.status !== 200) return response;
        const kopie = response.clone();
        caches.open(CACHE_NAAM).then(cache => cache.put(event.request, kopie));
        return response;
      }).catch(() => {
        // Netwerk niet beschikbaar en niet in cache
        return new Response('Offline — geen verbinding', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' }
        });
      });
    })
  );
});
