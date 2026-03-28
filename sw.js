// ⚠️ VERZIA — zmeň toto číslo pri každom nasadení novej verzie (napr. v4, v5...)
// Appka automaticky zobrazí "Dostupná aktualizácia" banner
const CACHE_NAME = 'dochadzka-mars-v7';

const urlsToCache = [
  '/navstevy-app/',
  '/navstevy-app/index.html',
  '/navstevy-app/manifest.json'
];

// ── INSTALL ──────────────────────────────────────────────────────
self.addEventListener('install', function(event) {
  // NEKČAKAJ — nová verzia sa aktivuje hneď po refreshi (nie až keď sa zatvoria všetky taby)
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache).catch(function() {});
    })
  );
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
      // Prevezmeme kontrolu nad všetkými otvorenými tabmi okamžite
      return self.clients.claim();
    }).then(function() {
      // Oznám všetkým klientom že nová verzia je aktívna
      return self.clients.matchAll({ type: 'window' }).then(function(clients) {
        clients.forEach(function(client) {
          client.postMessage({ type: 'SW_ACTIVATED', version: CACHE_NAME });
        });
      });
    })
  );
});

// ── FETCH ────────────────────────────────────────────────────────
self.addEventListener('fetch', function(event) {
  var url = event.request.url;

  // Google Scripts JSONP — sieť first, pri offline vráti prázdny callback
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

  // Network first pre index.html — vždy skúsi stiahnuť novú verziu
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

  // Cache first pre ostatné súbory
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
  // ⚡ SKIP_WAITING — klient žiada okamžitú aktiváciu novej verzie
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data && event.data.type === 'DO_SYNC') {
    self.clients.matchAll({ type: 'window' }).then(function(clients) {
      clients.forEach(function(c) { c.postMessage({ type: 'DO_SYNC' }); });
    });
  }
  if (event.data && event.data.type === 'CHECK_UPDATE') {
    self.clients.matchAll({ type: 'window' }).then(function(clients) {
      clients.forEach(function(c) {
        c.postMessage({ type: 'CURRENT_VERSION', version: CACHE_NAME });
      });
    });
  }
});
