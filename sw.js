/* Service worker — cache app shell for offline */

const CACHE_NAME = 'period-tracker-v8';
const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './css/tokens.css',
  './css/base.css',
  './css/themes/palettes.css',
  './css/themes/modes.css',
  './css/print.css',
  './js/app.js',
  './js/db.js',
  './js/metrics.js',
  './js/icons.js',
  './js/symptom-icons.js',
  './js/theme.js',
  './js/utils.js',
  './js/sync.js',
  './js/components/period-button.js',
  './js/components/symptom-grid.js',
  './js/components/cycle-dashboard.js',
  './js/components/history-list.js',
  './js/components/doctor-summary.js',
  './js/components/settings-view.js',
  './js/components/onboarding.js',
  './js/components/install-guide.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS).catch(() => {});
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)));
    })
  );
  self.clients.claim();
});

self.addEventListener('fetch', (e) => {
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match('./index.html') || caches.match('./'))
    );
  }
});
