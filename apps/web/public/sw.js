self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open('app-shell').then((cache) => cache.addAll(['/offline.html', '/manifest.webmanifest']).catch(()=>{}))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Simple SWR cache for OSM tiles and app shell
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);
  // Navigation requests: network first, fallback to offline.html
  if (req.mode === 'navigate') {
    event.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          return res;
        } catch {
          const cache = await caches.open('app-shell');
          const off = await cache.match('/offline.html');
          return off || new Response('Offline', { status: 503, headers: { 'content-type': 'text/plain' } });
        }
      })()
    );
    return;
  }
  // Same-origin assets only: simple SWR
  // Note: We purposely do NOT intercept external map tiles to avoid noisy
  // console errors when offline or when third-party hosts throttle.
  if (url.origin === location.origin) {
    event.respondWith(
      caches.open('app-cache').then(async (cache) => {
        const cached = await cache.match(req);
        const fetchPromise = fetch(req)
          .then((networkResponse) => {
            cache.put(req, networkResponse.clone()).catch(() => {});
            return networkResponse;
          })
          .catch(() => cached);
        return cached || fetchPromise;
      })
    );
  }
});

// Background Sync: read ops from IndexedDB and POST to /v1/sync
self.addEventListener('sync', (event) => {
  if (event.tag !== 'sync-ops') return;
  event.waitUntil(performSync());
});

// Accept page-triggered sync via postMessage
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data && data.type === 'sync-now') {
    event.waitUntil(performSync());
  }
  if (data && data.type === 'schedule-sync') {
    self.registration.sync?.register('sync-ops').catch(() => {});
  }
});

async function performSync() {
  try {
    const db = await openIDB('incident-mapper', 1);
    const cursor = await readKV(db, 'cursor');
    const base = (await readKV(db, 'apiBase')) || '';
    const ops = await readAll(db, 'ops');
    if (!ops.length) return;
    const res = await fetch(base + '/v1/sync', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ops, cursor })
    });
    if (!res.ok) return;
    const data = await res.json().catch(() => ({}));
    const applied = (data && data.applied) ? data.applied : ops;
    const ids = applied.map(o => o.id);
    await deleteMany(db, 'ops', ids);
    if (data && data.nextCursor) await writeKV(db, 'cursor', data.nextCursor);
    // Ping clients to refresh
    const all = await self.clients.matchAll();
    all.forEach(c => c.postMessage({ type: 'incidents-updated' }));
  } catch (e) {
    // swallow to let sync retry later
  }
}

async function openIDB(name, version) {
  return await new Promise((resolve, reject) => {
    const req = indexedDB.open(name, version);
    req.onupgradeneeded = () => {
      const db = req.result;
      // Ensure stores exist (no-op if already created by app)
      if (!db.objectStoreNames.contains('incidents')) db.createObjectStore('incidents', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('media')) db.createObjectStore('media', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('ops')) db.createObjectStore('ops', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv', { keyPath: 'key' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function readAll(db, store) {
  return await new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const st = tx.objectStore(store);
    const req = st.getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
}

async function deleteMany(db, store, keys) {
  await new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    const st = tx.objectStore(store);
    keys.forEach((k) => st.delete(k));
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

async function readKV(db, key) {
  return await new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readonly');
    const st = tx.objectStore('kv');
    const req = st.get(key);
    req.onsuccess = () => resolve(req.result ? req.result.value : null);
    req.onerror = () => reject(req.error);
  });
}

async function writeKV(db, key, value) {
  await new Promise((resolve, reject) => {
    const tx = db.transaction('kv', 'readwrite');
    const st = tx.objectStore('kv');
    st.put({ key, value });
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}
