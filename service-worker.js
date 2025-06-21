// Service Worker for PWA
const CACHE_NAME = 'shoppwa-v1.0.0';
const STATIC_CACHE = 'shoppwa-static-v1.0.0';
const DYNAMIC_CACHE = 'shoppwa-dynamic-v1.0.0';

// Files to cache immediately
const STATIC_ASSETS = [
    './',
    './index.html',
    './styles.css',
    './app.js',
    './manifest.json',
    './images/icon-192x192.png',
    './images/icon-512x512.png',
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0/css/all.min.css'
];

// Dynamic cache patterns
const CACHE_PATTERNS = {
    images: /\.(png|jpg|jpeg|gif|svg|webp)$/i,
    fonts: /\.(woff|woff2|ttf|otf)$/i,
    api: /\/api\//
};

// Install event - cache static assets
self.addEventListener('install', (event) => {
    console.log('🔧 Service Worker: Installing...');
    
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then((cache) => {
                console.log('📦 Service Worker: Caching static assets...');
                return cache.addAll(STATIC_ASSETS);
            })
            .then(() => {
                console.log('✅ Service Worker: Static assets cached successfully');
                return self.skipWaiting();
            })
            .catch((error) => {
                console.error('❌ Service Worker: Failed to cache static assets:', error);
            })
    );
});

// Activate event - cleanup old caches
self.addEventListener('activate', (event) => {
    console.log('🚀 Service Worker: Activating...');
    
    event.waitUntil(
        Promise.all([
            // Clean up old caches
            caches.keys().then((cacheNames) => {
                return Promise.all(
                    cacheNames.map((cacheName) => {
                        if (cacheName !== STATIC_CACHE && cacheName !== DYNAMIC_CACHE) {
                            console.log('🗑️ Service Worker: Deleting old cache:', cacheName);
                            return caches.delete(cacheName);
                        }
                    })
                );
            }),
            // Take control of all open clients
            self.clients.claim()
        ]).then(() => {
            console.log('✅ Service Worker: Activated successfully');
        })
    );
});

// Fetch event - serve from cache or network
self.addEventListener('fetch', (event) => {
    const request = event.request;
    const url = new URL(request.url);
    
    // Skip non-GET requests
    if (request.method !== 'GET') {
        return;
    }
    
    // Skip chrome-extension and other protocols
    if (!request.url.startsWith('http')) {
        return;
    }
    
    event.respondWith(
        handleFetchRequest(request)
    );
});

// Main fetch handling logic
async function handleFetchRequest(request) {
    const url = new URL(request.url);
    
    try {
        // Strategy 1: Cache First for static assets
        if (isStaticAsset(request)) {
            return await cacheFirstStrategy(request);
        }
        
        // Strategy 2: Network First for API calls
        if (isApiRequest(request)) {
            return await networkFirstStrategy(request);
        }
        
        // Strategy 3: Stale While Revalidate for images and fonts
        if (isImageOrFont(request)) {
            return await staleWhileRevalidateStrategy(request);
        }
        
        // Strategy 4: Network First with cache fallback for everything else
        return await networkFirstWithFallbackStrategy(request);
        
    } catch (error) {
        console.error('❌ Service Worker: Fetch error:', error);
        return await getOfflineFallback(request);
    }
}

// Cache First Strategy - for static assets
async function cacheFirstStrategy(request) {
    const cachedResponse = await caches.match(request);
    
    if (cachedResponse) {
        // Optionally update cache in background
        updateCacheInBackground(request);
        return cachedResponse;
    }
    
    return await fetchAndCache(request, STATIC_CACHE);
}

// Network First Strategy - for API calls
async function networkFirstStrategy(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cache successful API responses
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // Fall back to cache
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        throw error;
    }
}

// Stale While Revalidate Strategy - for images and fonts
async function staleWhileRevalidateStrategy(request) {
    const cachedResponse = await caches.match(request);
    
    // Always try to update cache in background
    const fetchPromise = fetchAndCache(request, DYNAMIC_CACHE);
    
    // Return cached version immediately if available
    if (cachedResponse) {
        return cachedResponse;
    }
    
    // Otherwise wait for network
    return await fetchPromise;
}

// Network First with Fallback Strategy
async function networkFirstWithFallbackStrategy(request) {
    try {
        const networkResponse = await fetch(request);
        
        if (networkResponse.ok) {
            // Cache successful responses
            const cache = await caches.open(DYNAMIC_CACHE);
            cache.put(request, networkResponse.clone());
        }
        
        return networkResponse;
    } catch (error) {
        // Try cache first
        const cachedResponse = await caches.match(request);
        if (cachedResponse) {
            return cachedResponse;
        }
        
        // Fall back to offline page for navigation requests
        if (request.mode === 'navigate') {
            const offlinePage = await caches.match('./index.html');
            if (offlinePage) {
                return offlinePage;
            }
        }
        
        throw error;
    }
}

// Helper function to fetch and cache
async function fetchAndCache(request, cacheName) {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
        const cache = await caches.open(cacheName);
        cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
}

// Update cache in background
function updateCacheInBackground(request) {
    fetch(request)
        .then(response => {
            if (response.ok) {
                return caches.open(STATIC_CACHE)
                    .then(cache => cache.put(request, response));
            }
        })
        .catch(error => {
            console.log('Background cache update failed:', error);
        });
}

// Get offline fallback
async function getOfflineFallback(request) {
    if (request.mode === 'navigate') {
        // Return main page for navigation requests
        const mainPage = await caches.match('./index.html');
        if (mainPage) {
            return mainPage;
        }
    }
    
    // Return a basic offline response
    return new Response(
        JSON.stringify({
            error: 'Offline',
            message: 'You are currently offline. Please check your connection.'
        }),
        {
            status: 503,
            statusText: 'Service Unavailable',
            headers: {
                'Content-Type': 'application/json'
            }
        }
    );
}

// Request type checkers
function isStaticAsset(request) {
    const url = new URL(request.url);
    return STATIC_ASSETS.some(asset => {
        return url.pathname === asset || url.pathname.endsWith(asset);
    });
}

function isApiRequest(request) {
    return CACHE_PATTERNS.api.test(request.url);
}

function isImageOrFont(request) {
    return CACHE_PATTERNS.images.test(request.url) || 
           CACHE_PATTERNS.fonts.test(request.url);
}

// Background sync for offline actions
self.addEventListener('sync', (event) => {
    console.log('🔄 Service Worker: Background sync triggered:', event.tag);
    
    if (event.tag === 'cart-sync') {
        event.waitUntil(syncCartData());
    }
    
    if (event.tag === 'order-sync') {
        event.waitUntil(syncOrderData());
    }
});

// Sync cart data when back online
async function syncCartData() {
    try {
        // This would typically sync with your backend
        console.log('📱 Service Worker: Syncing cart data...');
        
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Notify the app about successful sync
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'CART_SYNCED',
                data: { success: true }
            });
        });
        
        console.log('✅ Service Worker: Cart data synced successfully');
    } catch (error) {
        console.error('❌ Service Worker: Cart sync failed:', error);
    }
}

// Sync order data when back online
async function syncOrderData() {
    try {
        console.log('📦 Service Worker: Syncing order data...');
        
        // This would typically sync pending orders with your backend
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        // Notify the app about successful sync
        const clients = await self.clients.matchAll();
        clients.forEach(client => {
            client.postMessage({
                type: 'ORDERS_SYNCED',
                data: { success: true }
            });
        });
        
        console.log('✅ Service Worker: Order data synced successfully');
    } catch (error) {
        console.error('❌ Service Worker: Order sync failed:', error);
    }
}

// Push event - handle push notifications
self.addEventListener('push', (event) => {
    console.log('🔔 Service Worker: Push notification received');
    
    let notificationData = {
        title: 'ShopPWA',
        body: 'You have a new notification!',
        icon: './images/icon-192x192.png',
        badge: './images/icon-192x192.png',
        data: {
            url: './'
        }
    };
    
    // Parse push data if available
    if (event.data) {
        try {
            notificationData = { ...notificationData, ...event.data.json() };
        } catch (error) {
            console.error('Error parsing push data:', error);
        }
    }
    
    event.waitUntil(
        self.registration.showNotification(notificationData.title, {
            body: notificationData.body,
            icon: notificationData.icon,
            badge: notificationData.badge,
            data: notificationData.data,
            actions: [
                {
                    action: 'open',
                    title: 'Open App'
                },
                {
                    action: 'close',
                    title: 'Close'
                }
            ]
        })
    );
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
    console.log('🔔 Service Worker: Notification clicked');
    
    event.notification.close();
    
    if (event.action === 'close') {
        return;
    }
    
    const url = event.notification.data?.url || './';
    
    event.waitUntil(
        self.clients.matchAll({ type: 'window', includeUncontrolled: true })
            .then((clients) => {
                // Check if app is already open
                for (let client of clients) {
                    if (client.url === url && 'focus' in client) {
                        return client.focus();
                    }
                }
                
                // Open new window if app is not open
                if (clients.openWindow) {
                    return clients.openWindow(url);
                }
            })
    );
});

// Message event - communication with main app
self.addEventListener('message', (event) => {
    console.log('💬 Service Worker: Message received:', event.data);
    
    if (event.data.type === 'SKIP_WAITING') {
        self.skipWaiting();
    }
    
    if (event.data.type === 'GET_VERSION') {
        event.ports[0].postMessage({ version: CACHE_NAME });
    }
    
    if (event.data.type === 'CLEAR_CACHE') {
        clearAllCaches().then(() => {
            event.ports[0].postMessage({ success: true });
        });
    }
});

// Clear all caches
async function clearAllCaches() {
    const cacheNames = await caches.keys();
    return Promise.all(
        cacheNames.map(cacheName => caches.delete(cacheName))
    );
}

// Periodic cache cleanup
setInterval(() => {
    cleanupOldCacheEntries();
}, 24 * 60 * 60 * 1000); // Once per day

async function cleanupOldCacheEntries() {
    try {
        const cache = await caches.open(DYNAMIC_CACHE);
        const requests = await cache.keys();
        const now = Date.now();
        const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days
        
        for (let request of requests) {
            const response = await cache.match(request);
            if (response) {
                const dateHeader = response.headers.get('date');
                if (dateHeader) {
                    const responseDate = new Date(dateHeader).getTime();
                    if (now - responseDate > maxAge) {
                        await cache.delete(request);
                        console.log('🧹 Service Worker: Cleaned up old cache entry:', request.url);
                    }
                }
            }
        }
    } catch (error) {
        console.error('❌ Service Worker: Cache cleanup failed:', error);
    }
}

console.log('🚀 Service Worker: Script loaded successfully');
