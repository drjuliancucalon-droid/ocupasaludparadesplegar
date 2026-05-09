import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './styles.css';
import { initSyncManager } from './utils/syncManager.js';

// ── Service Worker (PWA offline) ──────────────────────────────────
// Registra el SW solo en producción y en navegadores compatibles.
// Si falla por cualquier razón, la app sigue funcionando normalmente.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { scope: '/' })
      .then(reg => {
        console.log('[SISO] Service Worker registrado ✓', reg.scope);
        // Verificar actualizaciones del SW al cargar
        reg.update().catch(() => {});
      })
      .catch(err => console.warn('[SISO] SW no disponible (modo dev normal):', err.message));
  });
}

// ── Sync Manager (online ↔ offline) ──────────────────────────────
// Inicializa la sincronización bidireccional con Supabase.
// No afecta el funcionamiento online actual.
initSyncManager();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
