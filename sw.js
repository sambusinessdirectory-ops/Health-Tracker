importScripts("./pwa-catalog.js");

const CACHE_NAME = "health-tracker-shell-v3";
const APP_SCOPE = self.registration.scope;
const scopeUrl = new URL(APP_SCOPE);
const SCOPE_PATH = scopeUrl.pathname.endsWith("/") ? scopeUrl.pathname : `${scopeUrl.pathname}/`;
const appUrl = (path = "") => new URL(path, APP_SCOPE).href;
const STANDALONE_APPS = Array.isArray(self.HealthPwaCatalog) ? self.HealthPwaCatalog : [];

const standaloneShell = STANDALONE_APPS.flatMap((entry) => [
  appUrl(`${entry.slug}/`),
  appUrl(`${entry.slug}/index.html`),
  appUrl(`${entry.slug}/manifest.webmanifest`),
  appUrl(`${entry.slug}/icons/${entry.slug}-192.png`),
  appUrl(`${entry.slug}/icons/${entry.slug}-512.png`),
  appUrl(`${entry.slug}/icons/${entry.slug}-maskable-512.png`),
  appUrl(`${entry.slug}/icons/${entry.slug}-apple-touch-180.png`),
]);

const APP_SHELL = [
  appUrl(""),
  appUrl("index.html"),
  appUrl("app.css"),
  appUrl("app.js"),
  appUrl("charts.js"),
  appUrl("i18n.js"),
  appUrl("pwa-catalog.js"),
  appUrl("supabase-config.js"),
  appUrl("vendor/supabase.min.js"),
  appUrl("pwa-register.js"),
  appUrl("manifest.webmanifest"),
  appUrl("icons/health-192.png"),
  appUrl("icons/health-512.png"),
  appUrl("icons/health-maskable-512.png"),
  appUrl("icons/health-apple-touch-180.png"),
  ...standaloneShell,
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
    const relativePath = url.pathname.startsWith(SCOPE_PATH)
      ? url.pathname.slice(SCOPE_PATH.length).replace(/^\/+/, "")
      : "";
    const routeSlug = relativePath.split("/", 1)[0];
    const standaloneApp = STANDALONE_APPS.find((entry) => entry.slug === routeSlug);
    const fallback = await cache.match(
      appUrl(standaloneApp ? `${standaloneApp.slug}/index.html` : "index.html"),
    );
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
