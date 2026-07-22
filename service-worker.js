// Together We Can — Service Worker
const CACHE_NAME = "twc-cache-v1";
const APP_SHELL = [
  "/index.html",
  "/manifest.json",
  "/style.css",
  "/config.js",
  "/supabase-client.js",
  "/auth.js",
  "/db.js",
  "/push.js",
  "/sections.js",
  "/account.js",
  "/admin.js",
  "/app.js",
  "/logo.png",
  "/icon-192.png",
  "/icon-512.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))
      )
    )
  );
  self.clients.claim();
});

// Notifications push — reçues même quand l'app est fermée
self.addEventListener("push", (event) => {
  let data = { title: "Together We Can ✅", body: "Nouveau contenu disponible." };
  try {
    data = event.data.json();
  } catch (_) {}

  event.waitUntil(
    self.registration.showNotification(data.title, {
      body: data.body,
      icon: "/icon-192.png",
      badge: "/icon-96.png",
      vibrate: [100, 50, 100],
    })
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((clientList) => {
      if (clientList.length > 0) return clientList[0].focus();
      return clients.openWindow("/index.html");
    })
  );
});
self.addEventListener("fetch", (event) => {
  const { request } = event;

  // Never cache Supabase API calls — always go to network
  if (request.url.includes("supabase.co")) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() => caches.match("/index.html"))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) return cached;
      return fetch(request)
        .then((response) => {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(request, clone));
          return response;
        })
        .catch(() => cached);
    })
  );
});
