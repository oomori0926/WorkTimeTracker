const CACHE_VERSION='v1.1.2';
const CACHE_NAME = `${self.registration.scope}!${CACHE_VERSION}`;

const urlsToCache = [
    "./index.html",
    "./setting.html",
    "./static/js/index.js",
    "./static/js/setting.js",
    "./static/images/favicon.ico"
];


// キャッシュの追加
self.addEventListener('install', (event) => {
    event.waitUntil(
        // キャッシュを開く
        caches.open(CACHE_NAME).then((cache) => {
            // 指定されたリソースをキャッシュに追加
            return cache.addAll(urlsToCache);
        })
    );
    //インストール時にすぐに待機からアクティブに変更
    event.waitUntil(self.skipWaiting());
});


// 古いキャッシュの削除
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return cacheNames.filter((cacheName) => {
                // このスコープに所属且つCACHE_NAMEではないキャッシュを探す
                return cacheName.startsWith(`${registration.scope}!`) &&
                cacheName !== CACHE_NAME;
            });
        }).then((cachesToDelete) => {
            return Promise.all(cachesToDelete.map((cacheName) => {
                // 古いキャッシュを削除する
                return caches.delete(cacheName);
            }));
        })
    );
    //既に読み込まれているサイトも制御対象にする
    event.waitUntil(self.clients.claim());
});


// リクエスト応答
self.addEventListener('fetch', (event) => {
    // 無効なスキームのリクエストは無視
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
