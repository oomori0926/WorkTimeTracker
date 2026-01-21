const CACHE_VERSION='v1.9.2';
const CACHE_NAME = `${self.registration.scope}!${CACHE_VERSION}`;

const urlsToCache = [
    "./index.html",
    "./setting.html",
    "./static/js/common.js",
    "./static/js/index.js",
    "./static/js/setting.js",
    "./static/images/favicon.ico"
];


// キャッシュの追加
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(urlsToCache);
        })
    );
    event.waitUntil(self.skipWaiting());
});


// 古いキャッシュの削除
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return cacheNames.filter((cacheName) => {
                return cacheName.startsWith(`${registration.scope}!`) &&
                cacheName !== CACHE_NAME;
            });
        }).then((cachesToDelete) => {
            return Promise.all(cachesToDelete.map((cacheName) => {
                return caches.delete(cacheName);
            }));
        })
    );
    event.waitUntil(self.clients.claim());
});


// リクエスト応答
self.addEventListener('fetch', (event) => {
    if (!event.request.url.startsWith('http')) return;

    event.respondWith(
        fetch(event.request).then((response) => {
            if (
                response &&
                response.status === 200 &&
                response.type === 'basic'
            ) {
                const resClone = response.clone();
                caches.open(CACHE_NAME).then((cache) => {
                    cache.put(event.request, resClone);
                });
            }
            return response;
        }).catch(() => {
            return caches.match(event.request);
        })
    );
});
