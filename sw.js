const CACHE_NAME = 'rt321-calc-v1.2';
const ASSETS_TO_CACHE = [
    './',
    './index.html',
    './manifest.json',
    './icon-192.png',
    './icon-512.png'
];

// 1. INSTALL EVENT
self.addEventListener('install', event => {
    // Forces the waiting service worker to become the active service worker.
    self.skipWaiting();
    
    event.waitUntil(
        caches.open(CACHE_NAME).then(cache => {
            // We use a softer approach here. If an icon is missing (404), 
            // it logs a warning but doesn't crash the entire installation.
            return Promise.allSettled(
                ASSETS_TO_CACHE.map(url => cache.add(url).catch(err => console.warn(`Skipped ${url}:`, err)))
            );
        })
    );
});

// 2. ACTIVATE EVENT (Cleanup)
self.addEventListener('activate', event => {
    // Ensures the service worker takes control of the page immediately
    event.waitUntil(clients.claim());
    
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cache => {
                    if (cache !== CACHE_NAME) {
                        return caches.delete(cache);
                    }
                })
            );
        })
    );
});

// 3. FETCH EVENT (Stale-While-Revalidate Strategy)
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request).then(cachedResponse => {
            
            // Background network fetch to get the freshest version
            const fetchPromise = fetch(event.request).then(networkResponse => {
                // If the fetch is successful, update the cache silently
                if (networkResponse && networkResponse.status === 200) {
                    caches.open(CACHE_NAME).then(cache => {
                        cache.put(event.request, networkResponse.clone());
                    });
                }
                return networkResponse;
            }).catch(() => {
                // Silently fail the network request if the user is offline.
                // The app will continue to run perfectly using the cachedResponse.
            });

            // Return the instant cached version if we have it.
            // If we don't have it in cache yet, wait for the network fetch.
            return cachedResponse || fetchPromise;
        })
    );
});
