// ATS Live – keeps the app itself on the phone so it opens instantly, and shows PASS / FAIL alerts.
// Live data is never cached here.
const CACHE = 'ats-live-v3-6';
const SHELL = ['./', './index.html', './manifest.webmanifest', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png', './icons/apple-180.png', './icons/favicon-32.png'];
self.addEventListener('install', (e) => { e.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((ks) => Promise.all(ks.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', (e) => {
  const u = new URL(e.request.url);
  if (e.request.method !== 'GET' || u.origin !== location.origin) return; // Google data goes straight to the network
  // app files: open at once from the phone's copy, fetch the newer copy in the background for next time
  e.respondWith(caches.open(CACHE).then((c) => c.match(e.request, { ignoreSearch: true }).then((hit) => {
    const net = fetch(e.request).then((r) => { if (r && r.ok) c.put(e.request, r.clone()); return r; }).catch(() => hit || c.match('./index.html'));
    if (hit) { e.waitUntil(net.catch(() => {})); return hit; }
    return net;
  })));
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
