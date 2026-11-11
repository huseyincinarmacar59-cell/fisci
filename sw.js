// Fişçi service worker — uygulama dosyalarını önbelleğe alır (çevrimdışı açılış)
const CACHE = "fisci-v1";
const SHELL = ["./", "index.html", "style.css", "js/app.js", "js/parser.js", "js/store.js", "js/ocr.js",
  "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  // Kendi dosyalarımız: önce ağ, olmazsa önbellek (güncellemeler hemen gelsin)
  if (url.origin === location.origin) {
    e.respondWith(fetch(req).then(r => {
      const copy = r.clone(); caches.open(CACHE).then(c => c.put(req, copy)); return r;
    }).catch(() => caches.match(req).then(r => r || caches.match("index.html"))));
    return;
  }
  // CDN (Tesseract, fontlar): önce önbellek
  if (/jsdelivr|gstatic|googleapis/.test(url.host)) {
    e.respondWith(caches.match(req).then(r => r || fetch(req).then(res => {
      if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(req, copy)); }
      return res;
    })));
  }
});
