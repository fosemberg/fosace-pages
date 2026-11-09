// FosAce — the game kept on this device for playing offline.
// Written by the build (src/pwa/serviceWorker.ts); do not edit by hand.
const VERSION = "2d80da657641";
const CACHE = "fosace-" + VERSION;
const PRECACHE = ["apple-touch-icon.png","assets/index-CFJJz3W_.css","assets/index-D0U6AOVg.js","assets/jsQR-DyzREHsA.js","assets/react-BsmNMfR_.js","icon.svg","index.html","manifest.webmanifest"];
const NAV_TIMEOUT_MS = 3500;
const scope = () => new URL(self.registration.scope);
const shellUrl = () => new URL('index.html', scope()).href;

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(
      // Past the HTTP cache: a stale index.html kept here would point at
      // files this build never wrote.
      PRECACHE.map((path) => new Request(new URL(path, scope()).href, { cache: 'reload' })),
    )),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter((name) => name.startsWith("fosace-") && name !== CACHE)
      .map((name) => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;
  const url = new URL(request.url);
  const base = scope();
  if (url.origin !== base.origin || !url.pathname.startsWith(base.pathname)) return;
  if (url.pathname.includes('/api/')) return;
  event.respondWith(request.mode === 'navigate' ? page(request) : file(request));
});

async function page(request) {
  try {
    const response = await withTimeout(fetch(request), NAV_TIMEOUT_MS);
    if (response.ok) return response;
    return (await kept(shellUrl())) || response;
  } catch (error) {
    const shell = await kept(shellUrl());
    if (shell) return shell;
    throw error;
  }
}

async function file(request) {
  const hit = await kept(request);
  if (hit) return hit;
  const response = await fetch(request);
  if (response.ok && response.type === 'basic') {
    const copy = response.clone();
    caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {});
  }
  return response;
}

async function kept(request) {
  const cache = await caches.open(CACHE);
  // ignoreVary: a module script is asked for with an Origin header the copy
  // kept at install never had, and a server that answers «Vary: Origin»
  // would make every kept file a miss — exactly when there is no network.
  return (await cache.match(request, { ignoreSearch: true, ignoreVary: true })) || null;
}

function withTimeout(promise, ms) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('timeout')), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}
