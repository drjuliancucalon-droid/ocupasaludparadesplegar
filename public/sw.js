// ═══════════════════════════════════════════════════════════════
// SISO OcupaSalud — Service Worker v1.0
// Estrategia: Cache First para assets, Network First para datos
// Offline: la app carga y funciona sin internet
// Sync: cuando vuelve la conexión sincroniza automáticamente
// ═══════════════════════════════════════════════════════════════

const SW_VERSION = 'siso-sw-v1.0.0';
const CACHE_ASSETS = `${SW_VERSION}-assets`;
const CACHE_PAGES  = `${SW_VERSION}-pages`;

// Assets críticos para funcionar offline (se cachean al instalar)
const CRITICAL_ASSETS = [
  '/',
  '/index.html',
];

// Hosts que son peticiones de datos (no se cachean, van a la red)
const DATA_HOSTS = [
  'supabase.co',
  'cloudinary.com',
  'api.qrserver.com',
  'emailjs.com',
  'generativelanguage.googleapis.com',
  'api.groq.com',
  'api.together.xyz',
  'openrouter.ai',
  'aiplatform.googleapis.com',
];

// ── INSTALL: cachear assets críticos ─────────────────────────────
self.addEventListener('install', (event) => {
  console.log('[SISO SW] Instalando versión:', SW_VERSION);
  event.waitUntil(
    caches.open(CACHE_ASSETS)
      .then(cache => cache.addAll(CRITICAL_ASSETS))
      .then(() => self.skipWaiting()) // activar inmediatamente sin esperar reload
  );
});

// ── ACTIVATE: limpiar cachés viejas ──────────────────────────────
self.addEventListener('activate', (event) => {
  console.log('[SISO SW] Activando:', SW_VERSION);
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys
          .filter(k => k !== CACHE_ASSETS && k !== CACHE_PAGES)
          .map(k => {
            console.log('[SISO SW] Eliminando caché antigua:', k);
            return caches.delete(k);
          })
      )
    ).then(() => self.clients.claim()) // controlar todas las pestañas abiertas
  );
});

// ── FETCH: estrategia inteligente por tipo de petición ───────────
self.addEventListener('fetch', (event) => {
  const req = event.request;
  const url = new URL(req.url);

  // Solo interceptar GET (POST/PATCH/DELETE van siempre a la red)
  if (req.method !== 'GET') return;

  // Peticiones a APIs externas → siempre red, sin cachear
  const isDataRequest = DATA_HOSTS.some(host => url.hostname.includes(host));
  if (isDataRequest) {
    event.respondWith(networkOnlyWithOfflineFallback(req));
    return;
  }

  // Assets estáticos (.js, .css, .png, .svg, etc.) → Cache First
  const isStaticAsset = /\.(js|css|png|jpg|jpeg|svg|ico|woff2?|ttf)$/.test(url.pathname);
  if (isStaticAsset) {
    event.respondWith(cacheFirstStrategy(req));
    return;
  }

  // Páginas HTML → Network First con fallback a caché
  event.respondWith(networkFirstStrategy(req));
});

// ── ESTRATEGIA 1: Cache First (para assets estáticos) ────────────
// Busca en caché primero. Si no está, va a la red y guarda copia.
async function cacheFirstStrategy(req) {
  // FIX 2026-07-12 (V17): no cachear peticiones de extensiones del navegador
  if (req.url.startsWith('chrome-extension://') || req.url.startsWith('moz-extension://') || req.url.startsWith('chrome://')) {
    return fetch(req);
  }
  const cached = await caches.match(req);
  if (cached) return cached;

  try {
    const response = await fetch(req);
    if (response.ok) {
      const cache = await caches.open(CACHE_ASSETS);
      cache.put(req, response.clone());
    }
    return response;
  } catch {
    return new Response('Asset no disponible offline', { status: 503 });
  }
}

// ── ESTRATEGIA 2: Network First (para HTML / navegación) ─────────
// Intenta la red primero. Si falla, sirve desde caché.
async function networkFirstStrategy(req) {
  // FIX 2026-07-12 (V17): no cachear peticiones de extensiones del navegador
  if (req.url.startsWith('chrome-extension://') || req.url.startsWith('moz-extension://') || req.url.startsWith('chrome://')) {
    return fetch(req);
  }
  // FIX 2026-07-13: AbortController en vez de solo Promise.race — si gana
  // el timeout, se cancela el fetch en curso en lugar de dejarlo huérfano
  // corriendo en segundo plano (evita "unhandled rejection" y peticiones
  // de red desperdiciadas cuando la red solo iba lenta, no caída).
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);
  try {
    const response = await fetch(req, { signal: controller.signal });
    clearTimeout(timeoutId);
    if (response.ok) {
      const cache = await caches.open(CACHE_PAGES);
      cache.put(req, response.clone()).catch(() => {});
    }
    return response;
  } catch {
    // Sin red → servir la caché
    const cached = await caches.match(req);
    if (cached) return cached;

    // Fallback final: servir index.html (SPA routing offline)
    const indexCached = await caches.match('/index.html');
    if (indexCached) return indexCached;

    return new Response(offlinePage(), {
      status: 200,
      headers: { 'Content-Type': 'text/html; charset=utf-8' }
    });
  }
}

// ── ESTRATEGIA 3: Network Only con manejo de error ───────────────
// Para APIs: intenta la red. Si falla, retorna error legible.
async function networkOnlyWithOfflineFallback(req) {
  try {
    return await fetch(req);
  } catch {
    return new Response(JSON.stringify({
      error: 'Sin conexión',
      offline: true,
      message: 'La aplicación está en modo offline. Los datos se sincronizarán cuando vuelva la conexión.'
    }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// ── BACKGROUND SYNC: sincronizar cola cuando vuelve internet ─────
self.addEventListener('sync', (event) => {
  if (event.tag === 'siso-sync-queue') {
    console.log('[SISO SW] Background Sync disparado — sincronizando cola...');
    event.waitUntil(flushSyncQueue());
  }
  if (event.tag === 'siso-audit-queue') {
    event.waitUntil(flushAuditQueue());
  }
});

// Notificar a la app que puede sincronizar
async function flushSyncQueue() {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach(client => {
    client.postMessage({ type: 'SISO_SYNC_NOW', queue: 'data' });
  });
}

async function flushAuditQueue() {
  const clients = await self.clients.matchAll({ includeUncontrolled: true });
  clients.forEach(client => {
    client.postMessage({ type: 'SISO_SYNC_NOW', queue: 'audit' });
  });
}

// ── PUSH: notificaciones (base para futuras alertas médicas) ─────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'SISO OcupaSalud', {
      body: data.body || '',
      icon: '/favicon.ico',
      badge: '/favicon.ico',
      tag: data.tag || 'siso-notif',
      data: data.url || '/',
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    self.clients.openWindow(event.notification.data || '/')
  );
});

// ── MENSAJE: comunicación bidireccional con la app ────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SISO_SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'SISO_GET_VERSION') {
    event.source?.postMessage({ type: 'SISO_VERSION', version: SW_VERSION });
  }
});

// ── Página offline de emergencia ──────────────────────────────────
function offlinePage() {
  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>SISO - Sin Conexión</title>
  <style>
    body { font-family: system-ui, sans-serif; background: #0f172a; color: #e2e8f0;
           display: flex; align-items: center; justify-content: center;
           min-height: 100vh; margin: 0; text-align: center; padding: 2rem; }
    .card { background: #1e293b; border-radius: 1rem; padding: 2.5rem; max-width: 400px; }
    .icon { font-size: 4rem; margin-bottom: 1rem; }
    h1 { color: #0891b2; margin: 0 0 0.5rem; }
    p { color: #94a3b8; margin: 0 0 1.5rem; line-height: 1.6; }
    button { background: #0891b2; color: white; border: none; padding: 0.75rem 2rem;
             border-radius: 0.5rem; cursor: pointer; font-size: 1rem; }
    button:hover { background: #0e7490; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">📡</div>
    <h1>Sin Conexión</h1>
    <p>SISO está en modo offline. Los datos guardados localmente siguen disponibles.
       Cuando vuelva la conexión, todo se sincronizará automáticamente.</p>
    <button onclick="window.location.reload()">Reintentar conexión</button>
  </div>
</body>
</html>`;
}
