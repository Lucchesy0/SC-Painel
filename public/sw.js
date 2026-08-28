// Service Worker para PWA MCM Gestão - Suporte Offline Completo
const CACHE_NAME = 'mcm-gestao-v3';

const PRECACHE_ASSETS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/logo-mcm.png',
];

// Instalação do Service Worker e pré-cache dos assets fundamentais
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => {
        return cache.addAll(PRECACHE_ASSETS);
      })
      .then(() => self.skipWaiting())
  );
});

// Limpeza de versões anteriores do cache ao ativar
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cache) => {
            if (cache !== CACHE_NAME) {
              return caches.delete(cache);
            }
          })
        );
      })
      .then(() => self.clients.claim())
  );
});

// Estratégia de cache inteligente para navegação e assets estáticos (CSS, JS, imagens)
self.addEventListener('fetch', (event) => {
  const { request } = event;

  // Aceitar apenas requisições GET
  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  // Ignorar esquemas que não sejam HTTP/HTTPS (como extensões de navegador)
  if (!url.protocol.startsWith('http')) return;

  // Requisições de navegação (HTML): Cache-first com fallback para index.html precacheado
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200) {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => cache.put(request, responseClone));
          }
          return networkResponse;
        })
        .catch(async () => {
          const cachedResponse = await caches.match(request);
          if (cachedResponse) return cachedResponse;
          return caches.match('/index.html') || caches.match('/');
        })
    );
    return;
  }

  // Requisições de assets estáticos (JS, CSS, SVG, Imagens, Fontes): Cache First / Stale-While-Revalidate
  event.respondWith(
    caches.match(request).then((cachedResponse) => {
      const fetchPromise = fetch(request)
        .then((networkResponse) => {
          if (networkResponse && networkResponse.status === 200 && networkResponse.type === 'basic') {
            const responseClone = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(request, responseClone);
            });
          }
          return networkResponse;
        })
        .catch(() => {
          // Erro de rede em modo offline - responde o cache se existir
          return cachedResponse;
        });

      return cachedResponse || fetchPromise;
    })
  );
});

