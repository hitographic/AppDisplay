// MDS Track - Service Worker
// Version 1.3.0 - Added Master Data page support

const CACHE_NAME = 'mds-track-v1.3.0';
const URLS_TO_CACHE = [
  '/',
  '/AppDisplay/',
  '/AppDisplay/index.html',
  '/AppDisplay/records/',
  '/AppDisplay/records/index.html',
  '/AppDisplay/records.html',
  '/AppDisplay/master.html',
  '/AppDisplay/create-display/',
  '/AppDisplay/create-display/index.html',
  '/AppDisplay/users/',
  '/AppDisplay/users/index.html',
  '/AppDisplay/css/style.css',
  '/AppDisplay/js/config.js',
  '/AppDisplay/js/auth.js',
  '/AppDisplay/js/login.js',
  '/AppDisplay/js/records.js',
  '/AppDisplay/js/sheets-db.js',
  '/AppDisplay/js/storage.js',
  '/AppDisplay/js/create-display.js',
  '/AppDisplay/js/master.js',
  '/AppDisplay/js/test-data.js',
  '/AppDisplay/assets/Favicon MDS.png',
  '/AppDisplay/assets/App MDS.png',
  '/AppDisplay/assets/Login MDS.png',
  '/AppDisplay/assets/Navigation MDS.png',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/webfonts/fa-solid-900.woff2'
];

// Install event - cache essential files
self.addEventListener('install', event => {
  console.log('[ServiceWorker] Installing...');
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => {
      console.log('[ServiceWorker] Caching app shell');
      // Cache files one by one to continue even if some fail
      return Promise.allSettled(
        URLS_TO_CACHE.map(url => 
          cache.add(url).catch(err => {
            console.warn(`[ServiceWorker] Failed to cache ${url}:`, err.message);
          })
        )
      ).then(() => console.log('[ServiceWorker] Cache installation completed'));
    }).catch(err => {
      console.warn('[ServiceWorker] Cache open error:', err);
      return Promise.resolve();
    })
  );
  self.skipWaiting();
});

// Activate event - clean old caches
self.addEventListener('activate', event => {
  console.log('[ServiceWorker] Activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[ServiceWorker] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Fetch event - different strategies for different content types
self.addEventListener('fetch', event => {
  // Skip cross-origin requests (except CDN and Google)
  if (!event.request.url.includes(self.location.origin) && 
      !event.request.url.includes('cdnjs.cloudflare.com') &&
      !event.request.url.includes('googleapis.com') &&
      !event.request.url.includes('google.com') &&
      !event.request.url.includes('lh3.googleusercontent.com') &&
      !event.request.url.includes('drive.google.com')) {
    return;
  }

  // NETWORK-FIRST strategy for JS files (to get latest updates)
  if (event.request.method === 'GET' && event.request.url.includes('.js')) {
    event.respondWith(
      fetch(event.request)
        .then(response => {
          if (!response || response.status !== 200) {
            // Network failed, try cache
            return caches.match(event.request).then(cached => cached || response);
          }
          
          // Network success - update cache
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        })
        .catch(() => {
          // Offline - return from cache
          return caches.match(event.request);
        })
    );
    return;
  }

  // CACHE-FIRST strategy for static assets (images, fonts, CSS)
  if (event.request.method === 'GET' && 
      (event.request.url.includes('.css') || 
       event.request.url.includes('.png') || 
       event.request.url.includes('.jpg') ||
       event.request.url.includes('.woff'))) {
    
    event.respondWith(
      caches.match(event.request).then(response => {
        if (response) {
          return response;
        }
        
        return fetch(event.request).then(response => {
          if (!response || response.status !== 200 || response.type !== 'basic') {
            return response;
          }
          
          const responseToCache = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, responseToCache);
          });
          
          return response;
        }).catch(() => {
          // Return cached response if network fails
          return caches.match(event.request);
        });
      })
    );
    return;
  }

  // Network first for HTML and API calls
  event.respondWith(
    fetch(event.request)
      .then(response => {
        if (!response || response.status !== 200) {
          return response;
        }
        
        // Cache successful responses
        const responseToCache = response.clone();
        caches.open(CACHE_NAME).then(cache => {
          cache.put(event.request, responseToCache);
        });
        
        return response;
      })
      .catch(() => {
        // Fallback to cache
        return caches.match(event.request).then(response => {
          if (response) {
            return response;
          }
          
          // Return offline page if available
          if (event.request.mode === 'navigate') {
            return caches.match('/AppDisplay/index.html');
          }
          
          return new Response('Offline - Resource not available', {
            status: 503,
            statusText: 'Service Unavailable',
            headers: new Headers({
              'Content-Type': 'text/plain'
            })
          });
        });
      })
  );
});

// Background sync (optional - for future use)
self.addEventListener('sync', event => {
  if (event.tag === 'sync-data') {
    event.waitUntil(
      fetch('/sync-data').then(response => response.json())
        .catch(err => console.log('[ServiceWorker] Sync failed:', err))
    );
  }
});

console.log('[ServiceWorker] Script loaded');
