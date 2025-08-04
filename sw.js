const CACHE_NAME = 'apocalypsis-cache-v1';
const urlsToCache = [
  '/',
  '/index.html',
  '/charters.html',
  '/groups.html',
  '/assets/css/main.css',
  '/assets/css/components.css',
  '/assets/css/pages/charters.css',
  '/assets/css/pages/groups.css',
  '/assets/js/main.js',
  '/assets/js/modules/charter-view.js',
  '/assets/js/modules/custom-alert.js',
  '/assets/js/modules/form.js',
  '/assets/js/modules/image-processor.js',
  '/assets/js/modules/spellchecker.js',
  '/assets/js/modules/tgcheck.js',
  '/assets/js/pages/charters.js',
  '/assets/js/pages/groups.js',
  '/assets/js/pages/index.js',
  '/assets/images/logo.png',
  '/assets/images/background.jpg'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
