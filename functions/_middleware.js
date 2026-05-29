// Cloudflare Pages Function — inyecta window.__SISO_CONFIG en el HTML
// Mantiene credenciales FUERA del bundle JS (no visible en F12 → Sources)
//
// Variables requeridas en Cloudflare Pages → Settings → Environment Variables:
//   SISO_TOKEN           (encrypt: sí)  — token de acceso al Worker D1
//   WORKER_URL           (opcional)     — URL del Worker, tiene fallback hardcoded
//   CLOUDINARY_CLOUD     (opcional)     — Cloud name de Cloudinary (ej: "mi-ips")
//   CLOUDINARY_PRESET    (opcional)     — Upload preset unsigned (ej: "siso_adjuntos")

export async function onRequest(context) {
  const response = await context.next();
  const contentType = response.headers.get("content-type") || "";

  // Solo procesar respuestas HTML
  if (!contentType.includes("text/html")) return response;

  const html = await response.text();
  const token           = context.env.SISO_TOKEN         || "";
  const workerUrl       = context.env.WORKER_URL         || "https://siso-api.dr-juliancucalon.workers.dev";
  const cloudinaryCloud  = context.env.CLOUDINARY_CLOUD  || "";
  const cloudinaryPreset = context.env.CLOUDINARY_PRESET || "";

  // Inyectar antes de </head> para que esté disponible cuando cargue el bundle
  const script = `<script>window.__SISO_CONFIG=window.__SISO_CONFIG||{};` +
    `window.__SISO_CONFIG.workerToken="${token}";` +
    `window.__SISO_CONFIG.workerUrl="${workerUrl}";` +
    `window.__SISO_CONFIG.cloudinaryCloud="${cloudinaryCloud}";` +
    `window.__SISO_CONFIG.cloudinaryPreset="${cloudinaryPreset}";</script>`;

  const patched = html.replace("</head>", script + "</head>");

  return new Response(patched, {
    status:  response.status,
    headers: response.headers,
  });
}
