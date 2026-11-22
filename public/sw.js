/*
 * Service hors ligne de SIGRHAS-MEPPSA (mission de terrain, DG 21/11/2026).
 * - Les pages : le réseau d'abord ; sans réseau, la dernière copie gardée (sinon la page du terrain).
 * - Les fichiers de l'application (scripts, styles, polices, images) : gardés et réutilisés.
 * - L'API (/api) n'est jamais gardée ici : les données du terrain vivent dans l'appareil (page du terrain).
 */
const VERSION = "sigrhas-terrain-1";
const PAGE_TERRAIN = "/recensement/terrain";

self.addEventListener("install", (e) => {
  self.skipWaiting();
  e.waitUntil(
    caches
      .open(VERSION)
      .then((c) => c.add(new Request(PAGE_TERRAIN, { credentials: "same-origin" })))
      .catch(() => undefined),
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches
      .keys()
      .then((cles) => Promise.all(cles.filter((k) => k !== VERSION).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

// La page du terrain envoie la liste de ses fichiers : ils sont gardés pour s'ouvrir sans réseau
self.addEventListener("message", (e) => {
  const d = e.data || {};
  if (d.type !== "GARDER" || !Array.isArray(d.urls)) return;
  e.waitUntil(
    caches.open(VERSION).then((c) =>
      Promise.all(
        d.urls
          .filter((u) => typeof u === "string" && u.startsWith(self.location.origin) && !u.includes("/api/"))
          .map((u) => c.add(new Request(u, { credentials: "same-origin" })).catch(() => undefined)),
      ),
    ),
  );
});

self.addEventListener("fetch", (e) => {
  const r = e.request;
  if (r.method !== "GET") return;
  const url = new URL(r.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith("/api/")) return;

  // Pages : réseau d'abord, copie gardée sans réseau
  if (r.mode === "navigate") {
    e.respondWith(
      fetch(r)
        .then((rep) => {
          if (rep.ok) {
            const copie = rep.clone();
            caches.open(VERSION).then((c) => c.put(url.pathname, copie));
          }
          return rep;
        })
        .catch(() => caches.match(url.pathname).then((m) => m || caches.match(PAGE_TERRAIN))),
    );
    return;
  }

  // Fichiers de l'application : la copie gardée tout de suite, rafraîchie en arrière-plan
  if (/\/_next\/|\/polices\/|\.(?:js|css|woff2?|png|svg|ico|webmanifest)$/.test(url.pathname)) {
    e.respondWith(
      caches.match(r).then((m) => {
        const reseau = fetch(r)
          .then((rep) => {
            if (rep.ok) {
              const copie = rep.clone();
              caches.open(VERSION).then((c) => c.put(r, copie));
            }
            return rep;
          })
          .catch(() => m);
        return m || reseau;
      }),
    );
  }
});
