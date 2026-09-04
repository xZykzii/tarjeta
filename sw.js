const CACHE_NAME = "cuotas-v14";

const urlsToCache = [
  "./",
  "./index.html",
  "./logic.mjs",
  "./pdf-export.mjs",
  "./manifest.json",
  "./icons/icon-192.png",
  "./icons/icon-512.png"
];

self.addEventListener("install", (event) => {
  // Tomar el control apenas se instale, sin esperar a que cierren las pestañas
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys.map((key) => key !== CACHE_NAME && caches.delete(key))
      ))
      // Controlar las pestañas ya abiertas de inmediato
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);
  // Firebase, gstatic y demás: siempre a la red, sin tocar el caché
  if (url.origin !== self.location.origin) return;

  const esDocumento = req.mode === "navigate" || req.destination === "document";

  if (esDocumento) {
    // La app siempre desde la red: así las actualizaciones se ven al instante.
    // El caché queda solo como respaldo sin conexión.
    event.respondWith(
      fetch(req)
        .then((resp) => {
          const copia = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copia));
          return resp;
        })
        .catch(() => caches.match(req).then((r) => r || caches.match("./index.html")))
    );
    return;
  }

  // Íconos y manifest: del caché, refrescando en segundo plano
  event.respondWith(
    caches.match(req).then((cached) => {
      const red = fetch(req).then((resp) => {
        if (resp && resp.status === 200) {
          const copia = resp.clone();
          caches.open(CACHE_NAME).then((c) => c.put(req, copia));
        }
        return resp;
      }).catch(() => cached);
      return cached || red;
    })
  );
});
