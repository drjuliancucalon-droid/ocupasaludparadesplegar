import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { execSync } from 'child_process';
import { writeFileSync } from 'fs';

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
