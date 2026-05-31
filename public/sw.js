const CACHE_NAME = 'devaura-os-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/favicon.svg',
  '/manifest.json'
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS);
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Helper to query IndexedDB for virtual file entry by path
function getEntryByPath(path) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('devaura-fs', 1);
    request.onerror = () => resolve(null);
    request.onsuccess = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('entries')) {
        resolve(null);
        return;
      }
      const transaction = db.transaction('entries', 'readonly');
      const store = transaction.objectStore('entries');
      const getAllRequest = store.getAll();
      
      getAllRequest.onsuccess = () => {
        const entries = getAllRequest.result;
        const entryMap = new Map();
        entries.forEach(entry => entryMap.set(entry.id, entry));
        
        const findPath = (entry) => {
          if (!entry) return '';
          if (entry.id === 'root') return '/';
          const parts = [];
          let current = entry;
          while (current && current.id !== 'root') {
            parts.unshift(current.name);
            current = entryMap.get(current.parentId);
          }
          return '/' + parts.join('/');
        };

        const target = entries.find(entry => {
          if (entry.type !== 'file') return false;
          const entryPath = findPath(entry);
          // Check exact path, path with leading slash, or relative /home scope
          return entryPath === path || 
                 entryPath === '/' + path || 
                 entryPath.replace('/home', '') === path ||
                 entryPath.replace('/home', '') === '/' + path;
        });

        resolve(target || null);
      };
      getAllRequest.onerror = () => resolve(null);
    };
  });
}

function getMimeType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const map = {
    html: 'text/html',
    css: 'text/css',
    js: 'application/javascript',
    ts: 'application/javascript',
    json: 'application/json',
    png: 'image/png',
    jpg: 'image/jpeg',
    jpeg: 'image/jpeg',
    svg: 'image/svg+xml',
    txt: 'text/plain',
    md: 'text/markdown'
  };
  return map[ext] || 'text/plain';
}

self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  
  // Intercept local preview route
  if (url.pathname.startsWith('/preview/')) {
    const virtualPath = url.pathname.replace('/preview/', '');
    
    e.respondWith(
      getEntryByPath(virtualPath).then((entry) => {
        if (entry) {
          return new Response(entry.content, {
            headers: { 
              'Content-Type': getMimeType(entry.name),
              'X-Source': 'DevAura-VFS'
            }
          });
        } else {
          // Serve a clean 404 response
          return new Response(
            `<html><body style="background:#09090b;color:#ff4b4b;font-family:monospace;padding:40px;">
              <h2>⬡ DEV AURA SERVER — 404 NOT FOUND</h2>
              <p>Virtual File not found at path: <strong>/${virtualPath}</strong></p>
              <p>Make sure you have created the file in your Code Editor and saved it.</p>
             </body></html>`, 
            { status: 404, headers: { 'Content-Type': 'text/html' } }
          );
        }
      })
    );
    return;
  }

  // Standard caching fallback
  e.respondWith(
    caches.match(e.request).then((cachedResponse) => {
      return cachedResponse || fetch(e.request).catch(() => {
        // Offline fallback
      });
    })
  );
});
