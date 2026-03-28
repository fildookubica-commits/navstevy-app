// ⚠️ VERZIA — zmeň toto číslo pri každom nasadení novej verzie
const CACHE_NAME = 'dochadzka-mars-v14';

const urlsToCache = [
  '/navstevy-app/',
  '/navstevy-app/index.html',
  '/navstevy-app/manifest.json'
];

// ── INSTALL ──────────────────────────────────────────────────────
// NEKČAKAJ na skipWaiting tu — nechaj SW čakať kým klient klikne "Aktualizovať"
self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache).catch(function() {});
    })
  );
  // POZOR: skipWaiting() TU NEVOLAJ — inak waiting nikdy nenastatne
});

// ── ACTIVATE ─────────────────────────────────────────────────────
self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames
          .filter(function(name) { return name !== CACHE_NAME; })
          .map(function(name) { return caches.delete(name); })
      );
    }).then(function() {
      return self.clients.claim();
    }).then(function() {
      // Pošli RELOAD všetkým klientom — stránka sa sama obnoví
      return self.clients.matchAll({ type: 'window' }).then(function(clients) {
        clients.forEach(function(client) {
          client.postMessage({ type: 'SW_UPDATED', version: CACHE_NAME });
        });
      });
    })
  );
});

// ── FETCH ────────────────────────────────────────────────────────
self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // Google Scripts — vždy sieť
  if (url.includes('script.google.com')) {
    if (url.includes('callback=gs_cb')) {
      event.respondWith(
        fetch(event.request).catch(function() {
          var m = url.match(/callback=(gs_cb_\d+)/);
          var cb = m ? m[1] : 'gs_cb';
          return new Response(cb + '({})', {
            headers: { 'Content-Type': 'application/javascript' }
          });
        })
      );
    }
    return;
  }

  // Network first pre HTML — vždy skúsi najnovšiu verziu
  if (url.endsWith('/') || url.includes('index.html')) {
    event.respondWith(
      fetch(event.request).then(function(resp) {
        if (resp && resp.status === 200) {
          var clone = resp.clone();
          caches.open(CACHE_NAME).then(function(c) { c.put(event.request, clone); });
        }
        return resp;
      }).catch(function() {
        return caches.match(event.request);
      })
    );
    return;
  }

  // Cache first pre ostatné
  event.respondWith(
    caches.match(event.request).then(function(cached) {
      if (cached) return cached;
      return fetch(event.request).then(function(resp) {
        if (!resp || resp.status !== 200 || resp.type === 'opaque') return resp;
        var clone = resp.clone();
        caches.open(CACHE_NAME).then(function(c) { c.put(event.request, clone); });
        return resp;
      }).catch(function() {
        return caches.match('/navstevy-app/index.html');
      });
    })
  );
});

// ── SPRÁVY OD KLIENTA ────────────────────────────────────────────
self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    // Klient klikol "Aktualizovať" — aktivuj nový SW
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'DO_SYNC') {
    self.clients.matchAll({ type: 'window' }).then(function(clients) {
      clients.forEach(function(c) { c.postMessage({ type: 'DO_SYNC' }); });
    });
  }
});
