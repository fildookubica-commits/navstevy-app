const CACHE_NAME = 'dochadzka-mars-v3';
const urlsToCache = [
  '/navstevy-app/',
  '/navstevy-app/index.html',
  '/navstevy-app/manifest.json'
];

self.addEventListener('install', function(event) {
  event.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(urlsToCache);
    }).catch(function() {})
  );
  self.skipWaiting();
});

self.addEventListener('activate', function(event) {
  event.waitUntil(
    caches.keys().then(function(cacheNames) {
      return Promise.all(
        cacheNames.filter(function(n) { return n !== CACHE_NAME; }).map(function(n) { return caches.delete(n); })
      );
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', function(event) {
  var url = event.request.url;
  if (url.includes('script.google.com')) {
    if (url.includes('callback=gs_cb')) {
      event.respondWith(
        fetch(event.request).catch(function() {
          var m = url.match(/callback=(gs_cb_\d+)/);
          var cb = m ? m[1] : 'gs_cb';
          return new Response(cb + '({})', { headers: { 'Content-Type': 'application/javascript' } });
        })
      );
    }
    return;
  }
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

self.addEventListener('message', function(event) {
  if (event.data && event.data.type === 'DO_SYNC') {
    self.clients.matchAll().then(function(clients) {
      clients.forEach(function(c) { c.postMessage({ type: 'DO_SYNC' }); });
    });
  }
});
