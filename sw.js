const CACHE_NAME = 'apocalypsis-cache-v2'; // Incremented cache version
const urlsToCache = [
  '/',
  '/index.html',
  '/charters.html',
  '/groups.html',
  '/rules.html',
  '/administration.html',
  '/404.html',
  '/map.html',
  '/rating.html',
  '/assets/css/main.css',
  '/assets/css/components.css',
  '/assets/css/pages/charters.css',
  '/assets/css/pages/groups-redesign.css',
  '/assets/css/pages/rules.css',
  '/assets/css/pages/administration.css',
  '/assets/css/pages/index.css',
  '/assets/css/map-page.css',
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
  '/assets/js/pages/rules.js',
  '/assets/js/pages/administration.js',
  '/assets/js/map-page.js',
  '/assets/images/logo.png',
  '/assets/images/background.jpg',
  '/assets/images/map-prew.webp',
  '/assets/images/tg_avatar_placeholder.png'
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Opened cache and caching new assets');
        return cache.addAll(urlsToCache);
      })
  );
});

self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
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
