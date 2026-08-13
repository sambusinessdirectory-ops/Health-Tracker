const CACHE_NAME = "health-tracker-shell-v2";
const APP_SCOPE = self.registration.scope;
const scopeUrl = new URL(APP_SCOPE);
const SCOPE_PATH = scopeUrl.pathname.endsWith("/") ? scopeUrl.pathname : `${scopeUrl.pathname}/`;
const appUrl = (path = "") => new URL(path, APP_SCOPE).href;

const APP_SHELL = [
  appUrl(""),
  appUrl("index.html"),
  appUrl("app.css"),
  appUrl("app.js"),
  appUrl("charts.js"),
  appUrl("i18n.js"),
  appUrl("supabase-config.js"),
  appUrl("vendor/supabase.min.js"),
  appUrl("pwa-register.js"),
  appUrl("manifest.webmanifest"),
  appUrl("icons/health-192.png"),
  appUrl("icons/health-512.png"),
  appUrl("icons/health-maskable-512.png"),
  appUrl("icons/health-apple-touch-180.png"),
  appUrl("food-desire/"),
  appUrl("food-desire/index.html"),
  appUrl("food-desire/manifest.webmanifest"),
  appUrl("food-desire/icons/desire-192.png"),
  appUrl("food-desire/icons/desire-512.png"),
  appUrl("food-desire/icons/desire-maskable-512.png"),
  appUrl("food-desire/icons/desire-apple-touch-180.png"),
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((names) =>
        Promise.all(
          names
            .filter((name) => name.startsWith("health-tracker-shell-") && name !== CACHE_NAME)
            .map((name) => caches.delete(name)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || !url.pathname.startsWith(SCOPE_PATH)) return;

  if (request.mode === "navigate") {
    event.respondWith(networkFirstNavigation(request, url));
    return;
  }

  if (["style", "script", "image", "font", "manifest"].includes(request.destination)) {
    event.respondWith(staleWhileRevalidate(request));
  }
});

async function networkFirstNavigation(request, url) {
  const cache = await caches.open(CACHE_NAME);
  try {
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response.clone());
    return response;
  } catch (error) {
    const foodDesirePath = `${SCOPE_PATH}food-desire`;
    const isFoodDesire =
      url.pathname === foodDesirePath || url.pathname.startsWith(`${foodDesirePath}/`);
    const fallback = await cache.match(appUrl(isFoodDesire ? "food-desire/index.html" : "index.html"));
    if (fallback) return fallback;
    throw error;
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(request);
  const network = fetch(request)
    .then(async (response) => {
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })
    .catch((error) => {
      if (cached) return cached;
      throw error;
    });
  return cached || network;
}
