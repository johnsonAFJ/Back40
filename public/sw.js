// Offline support, for the installed app and for the site.
//
// Two strategies, split by what's being fetched:
//
//   The page itself is network-first. A new version then shows up on the
//   next open, and the cached copy keeps the game working offline.
//
//   Everything else (scripts, styles, icons, art) is cache-first. Vite gives
//   every built script and stylesheet a name that changes with its contents,
//   so a cached copy is never out of date: a new version simply asks for new
//   names.
//
// The cache name comes from the ?v= this file was registered with, which is
// the build's commit. Each deploy installs a fresh cache and the old one is
// deleted, so old scripts don't pile up on phones.

const VERSION = new URL(self.location.href).searchParams.get('v') ?? 'dev';
const CACHE = `back40-${VERSION}`;

// Cached on install so the app opens offline even before it's been used
// online. Each is added on its own: one missing file mustn't stop the rest.
const SHELL = ['./', './manifest.webmanifest', './icons/icon-180.png', './icons/icon-192.png', './icons/icon-512.png'];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      // `reload` skips the browser's own HTTP cache, which GitHub Pages lets
      // keep files for ten minutes, so the new version gets new files.
      .then((cache) => Promise.all(SHELL.map((url) => cache.add(new Request(url, { cache: 'reload' })).catch(() => null)))),
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith('back40-') && k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone();
          caches.open(CACHE).then((cache) => cache.put('./', copy));
          return response;
        })
        .catch(() => caches.match('./')),
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(
      (cached) =>
        cached ??
        fetch(request).then((response) => {
          if (response.ok) {
            const copy = response.clone();
            caches.open(CACHE).then((cache) => cache.put(request, copy));
          }
          return response;
        }),
    ),
  );
});
