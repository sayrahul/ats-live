// ATS Live – keeps the app itself on the phone so it opens instantly, and shows PASS / FAIL alerts.
// Live data is never cached here.
const CACHE = 'ats-live-v3-3';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-180.png', './icons/favicon-32.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // Google data goes straight to the network
  // app files: network first (gets updates), phone copy when offline
  e.respondWith(fetch(e.request).then((r) => { const c = r.clone(); caches.open(CACHE).then((x) => x.put(e.request, c)); return r; })
    .catch(() => caches.match(e.request).then((r) => r || caches.match('./index.html'))));
});

// ---- PASS / FAIL alert from the office PC ----
self.addEventListener('push', (e) => {
  let m = {};
  try { m = e.data ? e.data.json() : {}; } catch (x) { m = { title: e.data ? e.data.text() : 'ATS Live' }; }
  const title = m.title || 'ATS Live';
  e.waitUntil(self.registration.showNotification(title, {
    body: m.body || '',
    tag: m.tag || undefined,          // same vehicle again replaces the old alert
    renotify: !!m.tag,
    icon: 'icons/icon-192.png',
    badge: 'icons/favicon-32.png',
    vibrate: m.kind === 'FAIL' ? [200, 100, 200, 100, 200] : [150],
    data: { url: './' }
  }));
});
self.addEventListener('notificationclick', (e) => {
  e.notification.close();
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) { if ('focus' in c) { c.postMessage({ type: 'refresh' }); return c.focus(); } }
    return self.clients.openWindow('./');
  }));
});
