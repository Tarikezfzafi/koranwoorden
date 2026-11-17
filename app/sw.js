/* Service worker: alles offline. Verhoog VERSION na elke data- of code-update. */
const VERSION = 'kw-2026-11-17-5';
const CORE = ['./', 'index.html', 'app.js', 'style.css', 'manifest.webmanifest', 'data/meta.js', 'data/occ.js', 'data/lexidx.js',
  'icons/icon-180.png', 'icons/icon-192.png', 'icons/icon-512.png'];
for (let i = 1; i <= 114; i++) CORE.push('data/s' + i + '.js');
const RUNTIME = 'kw-runtime';
// tafsir/i'rab/woordenboeken: aparte cache die bij app-updates blijft staan (alleen ophogen als die data herbouwd is)
const SOURCES = 'kw-sources-2';

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(CORE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && k !== RUNTIME && k !== SOURCES).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin === location.origin && !url.pathname.includes('/data/') && !url.pathname.includes('/icons/')) {
    // code: eerst netwerk (zo krijg je updates), offline uit cache
    e.respondWith(Promise.race([
      fetch(req).then(res => { if (res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); } return res; }),
      new Promise((_, rej) => setTimeout(rej, 3500)),
    ]).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || caches.match('index.html'))));
    return;
  }
  if (url.origin === location.origin) {
    // data en iconen: eerst cache, anders netwerk (en bewaren)
    const store = /\/data\/(v|lx)\d+\.js$/.test(url.pathname) ? SOURCES : VERSION;
    e.respondWith(caches.match(req, { ignoreSearch: true }).then(hit => hit || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(store).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => Response.error())));
    return;
  }
  if (/fonts\.(googleapis|gstatic)\.com$|audio\.qurancdn\.com$/.test(url.hostname)) {
    // lettertype en gehoorde audio bewaren voor offline gebruik
    e.respondWith(caches.open(RUNTIME).then(c => c.match(req).then(hit => {
      const net = fetch(req).then(res => { if (res.ok || res.type === 'opaque') c.put(req, res.clone()); return res; }).catch(() => hit);
      return hit || net;
    })));
  }
});
