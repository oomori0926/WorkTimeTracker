// Service Workerの有効化
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('sw.js').then(registration => {
            registration.addEventListener('updatefound', () => {
                const newWorker = registration.installing;
                newWorker.addEventListener('statechange', () => {
                    if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                        if (confirm('新しいバージョンがあります。更新しますか？')) {
                            window.location.reload();
                        }
                    }
                });
            });
        }).catch(err => console.error('SW登録失敗:', err));
    });
}
