const cacheName = "move-hourly-v10";
const assets = [
  ".",
  "index.html",
  "styles.css",
  "app.js",
  "manifest.json",
  "icon.svg"
];

self.addEventListener("install", (event) => {
  self.skipWaiting();
  event.waitUntil(caches.open(cacheName).then((cache) => cache.addAll(assets)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== cacheName).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(cacheName).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request))
  );
});

self.addEventListener("push", (event) => {
  const fallback = {
    title: "动了么",
    body: "乖乖，起来接一杯水吧，让身体也换一口新鲜空气。"
  };
  let data = fallback;

  if (event.data) {
    try {
      data = event.data.json();
    } catch {
      data = { ...fallback, body: event.data.text() };
    }
  }

  event.waitUntil(
    self.registration.showNotification(data.title || fallback.title, {
      body: warmAddress(data.body || fallback.body),
      tag: "move-reminder",
      icon: "icon.svg",
      badge: "icon.svg"
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow("."));
});

function warmAddress(text) {
  return text.startsWith("乖乖") ? text : `乖乖，${text}`;
}
