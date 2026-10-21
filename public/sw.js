// EchoMind Service Worker v1.0.0
const CACHE_NAME = 'echomind-shell-v1';
const OFFLINE_URL = '/offline.html';

// Recursos essenciais para shell offline básico
const STATIC_PRECACHE = [
  '/',
  '/offline.html',
  '/manifest.json',
  '/echomind-logo.png',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Instalação do Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_PRECACHE).catch((err) => {
        console.warn('[EchoMind SW] Precache parcial:', err);
      });
    })
  );
  self.skipWaiting();
});

// Ativação e limpeza de versões antigas
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== CACHE_NAME) {
            console.log('[EchoMind SW] Removendo cache obsoleto:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Interceptação de requisições
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 1. Ignorar esquemas não-HTTP(S) como chrome-extension, etc.
  if (!request.url.startsWith('http')) return;

  // 2. NUNCA fazer cache de requisições Supabase, autenticação ou endpoints de API sensíveis
  if (
    url.pathname.includes('/api/') ||
    url.hostname.includes('supabase.co') ||
    url.pathname.includes('/auth/') ||
    request.method !== 'GET'
  ) {
    // Pass-through direto da rede para manter segurança total dos dados
    return;
  }

  // 3. Para navegação de páginas (HTML) -> Network First com fallback para offline.html
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(async () => {
        const cache = await caches.open(CACHE_NAME);
        const cachedResponse = await cache.match(request);
        if (cachedResponse) return cachedResponse;
        return cache.match(OFFLINE_URL);
      })
    );
    return;
  }

  // 4. Para assets estáticos (_next/static, fonts, ícones, imagens) -> Stale-While-Revalidate ou Cache-First
  const isStaticAsset =
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/icons/') ||
    url.pathname.endsWith('.png') ||
    url.pathname.endsWith('.svg') ||
    url.pathname.endsWith('.woff2') ||
    url.pathname.endsWith('.css') ||
    url.pathname.endsWith('.js');

  if (isStaticAsset) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          // Atualiza o cache silenciosamente em background
          fetch(request).then((networkRes) => {
            if (networkRes && networkRes.status === 200) {
              caches.open(CACHE_NAME).then((cache) => cache.put(request, networkRes));
            }
          }).catch(() => {/* ignore background fetch fail */});
          return cached;
        }

        return fetch(request).then((networkResponse) => {
          if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
            return networkResponse;
          }
          const responseToCache = networkResponse.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, responseToCache);
          });
          return networkResponse;
        });
      })
    );
    return;
  }

  // Fallback padrão: rede primeiro com cache como contingência
  event.respondWith(
    fetch(request).catch(() => caches.match(request))
  );
});

// Mensagens vindas do cliente (ex: forçar atualização)
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
