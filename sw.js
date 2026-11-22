/* YKS Tracker - Service Worker (offline destek) */
const CACHE = "yks-tracker-v14";

const PRECACHE = [
  "./",
  "./index.html",
  "./app.html",
  "./manifest.json",
  "./css/styles.css",
  "./js/app.js",
  "./js/store.js",
  "./js/ui.js",
  "./js/charts.js",
  "./js/quests.js",
  "./js/curriculumData.js",
  "./js/curriculum.js",
  "./js/resources.js",
  "./js/league.js",
  "./js/settings.js",
  "./js/schedule.js",
  "./js/pomodoro.js",
  "./js/questions.js",
  "./js/exams.js",
  "./js/notes.js",
  "./js/dashboard.js",
  "./assets/icon.svg",
  "./assets/bg-playful.svg",
  "./assets/ydlogo.png",
  "./assets/fonts/SuperMelonHunter.otf",
  "./assets/icon-192.png",
  "./assets/icon-512.png",
  "./assets/icon-maskable-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(PRECACHE).catch(() => undefined))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  // API isteklerini önbelleğe alma
  if (url.pathname.startsWith("/api/")) return;

  // Navigasyon istekleri: önce ağ, olmazsa önbellek
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
          return res;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("./app.html").then((x) => x || caches.match("./index.html"))))
    );
    return;
  }

  // Diğer istekler: önce ağ (güncel kod), olmazsa önbellek (offline)
  event.respondWith(
    fetch(req)
      .then((res) => {
        if (res && res.status === 200 && res.type === "basic") {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      })
      .catch(() => caches.match(req))
  );
});
