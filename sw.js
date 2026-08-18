// ⚠️ 這個版號是源碼值，改它沒有意義：CI 的 scripts/stamp-version.mjs 部署前會把它
// 蓋成「本 App 的 git commit 數」。要查線上實際版號請看 gh-pages 分支，別查這裡。
const CACHE = "914_junior_english-icons-b35fd9d0c8";
const ASSETS = ["./index.html", "./rv2-core.js", "./manifest.webmanifest", "./ridgeline-ui.css", "./favicon.svg", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png", "./", "./icon-maskable-512.png"];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request)));});
self.addEventListener('message',e=>{if(e.data==='SKIP_WAITING'||e.data==='skipWaiting'||(e.data&&e.data.type==='SKIP_WAITING'))self.skipWaiting()});
