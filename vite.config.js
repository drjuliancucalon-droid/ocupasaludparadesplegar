import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';
import { writeFileSync, readFileSync } from 'fs';

// FASE 1: Anti-bundle-viejo
// Genera version.json con commit hash + timestamp en cada build.
// El cliente compara este archivo cada 60s para detectar versión nueva.
function buildVersion() {
  let commitHash = 'dev';
  try {
    commitHash = execSync('git rev-parse --short HEAD').toString().trim();
  } catch {}
  return {
    version: commitHash + '-' + Date.now(),
    commit: commitHash,
    buildTime: new Date().toISOString(),
    buildTimestamp: Date.now(),
  };
}

const VERSION = buildVersion();

function versionJsonPlugin() {
  return {
    name: 'version-json',
    closeBundle() {
      writeFileSync('dist/version.json', JSON.stringify(VERSION, null, 2));
      console.log('[version-json] dist/version.json:', VERSION.version);
      // FIX 2026-08-18: sella el Service Worker con el commit hash del build.
      // La plantilla vive en sw.template.js (NO en public/) a propósito: si
      // estuviera en public/, el copiador interno de Vite (que corre en fase
      // 'post', DESPUÉS de este closeBundle) sobreescribiría el archivo ya
      // sellado con la copia sin sellar — probado en vivo, el primer intento
      // con el template dentro de public/ perdía el sello silenciosamente.
      // Al vivir fuera de public/, dist/sw.js SOLO lo escribe este plugin —
      // sin competencia posible. Sin el sello, SW_VERSION quedaba fijo para
      // siempre entre despliegues y el navegador podía terminar sirviendo
      // una mezcla de assets .js/.css de builds distintos → pantalla en
      // blanco en visitas repetidas al dominio estable (ver sw.template.js).
      try {
        const sw = readFileSync('sw.template.js', 'utf8');
        // FIX 2026-08-18: replaceAll, no replace. sw.template.js menciona el
        // placeholder también en un comentario (explicando qué hace) ANTES
        // de la línea real `SW_VERSION = ...` -- con .replace() (solo primera
        // coincidencia) el comentario se llevaba el sello y la línea real
        // quedaba intacta. Causó que el Service Worker desplegado siguiera
        // sirviendo 'siso-sw-__BUILD_VERSION__' literal pese al log de éxito.
        const stamped = sw.replaceAll('__BUILD_VERSION__', VERSION.commit);
        writeFileSync('dist/sw.js', stamped);
        console.log('[sw-version] dist/sw.js sellado con commit', VERSION.commit);
      } catch (e) {
        console.warn('[sw-version] no se pudo sellar sw.js:', e?.message);
      }
    },
  };
}

export default defineConfig({
  plugins: [react(), versionJsonPlugin()],
  define: {
    __APP_VERSION__: JSON.stringify(VERSION.version),
    __APP_COMMIT__: JSON.stringify(VERSION.commit),
    __APP_BUILD_TIME__: JSON.stringify(VERSION.buildTime),
    __APP_BUILD_TS__: JSON.stringify(VERSION.buildTimestamp),
  },
  build: {
    outDir: 'dist',
    chunkSizeWarningLimit: 2000,
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom'],
          lucide: ['lucide-react'],
        },
      },
    },
  },
});
