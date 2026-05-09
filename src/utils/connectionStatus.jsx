// ═══════════════════════════════════════════════════════════════
// SISO OcupaSalud — connectionStatus.js v1.0
// Hook de React + utilidades para estado de conexión online/offline.
// Detecta: online, offline, sincronizando, pendientes, última sync.
// ═══════════════════════════════════════════════════════════════

import { useState, useEffect, useCallback } from 'react';
import { onSyncStatus, syncNow, syncState } from './syncManager.js';

// ── Estados posibles de conexión ─────────────────────────────────
export const CONNECTION_STATUS = {
  ONLINE:       'online',       // 🟢 Conectado y sincronizado
  SYNCING:      'syncing',      // 🔵 Sincronizando ahora
  OFFLINE:      'offline',      // 🔴 Sin internet
  PENDING:      'pending',      // 🟡 Hay cambios sin sincronizar
  RECONNECTED:  'reconnected',  // 🔄 Volvió internet, sincronizando...
  ERROR:        'error',        // ⚠️ Error de sincronización
};

// ── Hook principal para usar en componentes React ─────────────────
/**
 * useConnectionStatus
 * Retorna el estado de conexión en tiempo real.
 *
 * Uso en App.jsx:
 *   const { status, pendingCount, lastSyncAt, isOnline, retry } = useConnectionStatus();
 */
export const useConnectionStatus = () => {
  const [status, setStatus] = useState(
    navigator.onLine ? CONNECTION_STATUS.ONLINE : CONNECTION_STATUS.OFFLINE
  );
  const [pendingCount, setPendingCount]   = useState(syncState.pendingCount || 0);
  const [lastSyncAt,   setLastSyncAt]     = useState(syncState.lastSyncAt || null);
  const [swVersion,    setSwVersion]      = useState(null);

  useEffect(() => {
    // Suscribirse a cambios del sync manager
    const unsub = onSyncStatus((payload) => {
      const { status: s, pendingCount: pc, lastSyncAt: ls } = payload;

      if (s === 'syncing' || s === 'reconnected') setStatus(CONNECTION_STATUS.SYNCING);
      else if (s === 'synced' || s === 'updated') setStatus(CONNECTION_STATUS.ONLINE);
      else if (s === 'offline')                   setStatus(CONNECTION_STATUS.OFFLINE);
      else if (s === 'queued' || s === 'pending') setStatus(CONNECTION_STATUS.PENDING);
      else if (s === 'error' || s === 'partial')  setStatus(CONNECTION_STATUS.ERROR);

      if (typeof pc === 'number') setPendingCount(pc);
      if (ls) setLastSyncAt(ls);
    });

    // Escuchar eventos nativos del navegador también
    const goOnline  = () => setStatus(CONNECTION_STATUS.RECONNECTED);
    const goOffline = () => setStatus(CONNECTION_STATUS.OFFLINE);
    window.addEventListener('online',  goOnline);
    window.addEventListener('offline', goOffline);

    // Obtener versión del SW
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({ type: 'SISO_GET_VERSION' });
      navigator.serviceWorker.addEventListener('message', (e) => {
        if (e.data?.type === 'SISO_VERSION') setSwVersion(e.data.version);
      });
    }

    return () => {
      unsub();
      window.removeEventListener('online',  goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  // Forzar sincronización manual
  const retry = useCallback(() => {
    if (navigator.onLine) {
      setStatus(CONNECTION_STATUS.SYNCING);
      syncNow().catch(() => setStatus(CONNECTION_STATUS.ERROR));
    }
  }, []);

  return {
    status,
    isOnline:     status !== CONNECTION_STATUS.OFFLINE,
    isSyncing:    status === CONNECTION_STATUS.SYNCING || status === CONNECTION_STATUS.RECONNECTED,
    hasError:     status === CONNECTION_STATUS.ERROR,
    hasPending:   pendingCount > 0,
    pendingCount,
    lastSyncAt,
    swVersion,
    retry,
  };
};

// ── Componente visual del indicador de conexión ───────────────────
/**
 * ConnectionBadge — componente pequeño para mostrar en la barra superior.
 *
 * Uso en App.jsx:
 *   import { ConnectionBadge } from '../utils/connectionStatus.js';
 *   <ConnectionBadge />
 */
export const ConnectionBadge = () => {
  const { status, pendingCount, lastSyncAt, isOnline, isSyncing, retry } = useConnectionStatus();

  // Formatear tiempo desde última sync
  const timeSinceSync = lastSyncAt
    ? (() => {
        const mins = Math.floor((Date.now() - new Date(lastSyncAt).getTime()) / 60000);
        if (mins < 1)  return 'justo ahora';
        if (mins < 60) return `hace ${mins}m`;
        const hrs = Math.floor(mins / 60);
        return `hace ${hrs}h`;
      })()
    : null;

  const configs = {
    [CONNECTION_STATUS.ONLINE]: {
      bg: 'bg-emerald-500/20', border: 'border-emerald-500/40',
      dot: 'bg-emerald-400', text: 'text-emerald-300',
      label: timeSinceSync ? `Sincronizado ${timeSinceSync}` : 'En línea',
      icon: '🟢',
    },
    [CONNECTION_STATUS.SYNCING]: {
      bg: 'bg-blue-500/20', border: 'border-blue-500/40',
      dot: 'bg-blue-400 animate-pulse', text: 'text-blue-300',
      label: 'Sincronizando…', icon: '🔄',
    },
    [CONNECTION_STATUS.RECONNECTED]: {
      bg: 'bg-blue-500/20', border: 'border-blue-500/40',
      dot: 'bg-blue-400 animate-pulse', text: 'text-blue-300',
      label: 'Reconectando…', icon: '🔄',
    },
    [CONNECTION_STATUS.OFFLINE]: {
      bg: 'bg-red-500/20', border: 'border-red-500/40',
      dot: 'bg-red-400', text: 'text-red-300',
      label: 'Sin conexión', icon: '🔴',
    },
    [CONNECTION_STATUS.PENDING]: {
      bg: 'bg-amber-500/20', border: 'border-amber-500/40',
      dot: 'bg-amber-400 animate-pulse', text: 'text-amber-300',
      label: `${pendingCount} cambio${pendingCount !== 1 ? 's' : ''} pendiente${pendingCount !== 1 ? 's' : ''}`,
      icon: '🟡',
    },
    [CONNECTION_STATUS.ERROR]: {
      bg: 'bg-orange-500/20', border: 'border-orange-500/40',
      dot: 'bg-orange-400', text: 'text-orange-300',
      label: 'Error de sync', icon: '⚠️',
    },
  };

  const c = configs[status] || configs[CONNECTION_STATUS.ONLINE];

  return (
    <button
      onClick={retry}
      title={isOnline ? 'Haz clic para sincronizar ahora' : 'Sin conexión — los cambios se guardan localmente'}
      className={`flex items-center gap-1.5 px-2 py-1 rounded-full border text-xs font-medium transition-all ${c.bg} ${c.border} ${c.text} hover:opacity-80 cursor-pointer select-none`}
    >
      <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.dot}`} />
      <span className="hidden sm:inline">{c.label}</span>
      <span className="sm:hidden">{c.icon}</span>
    </button>
  );
};

// ── Utilidad simple (sin React) para verificar conexión ──────────
export const isOnline = () => navigator.onLine;

export const waitForOnline = () => new Promise(resolve => {
  if (navigator.onLine) return resolve();
  const handler = () => { window.removeEventListener('online', handler); resolve(); };
  window.addEventListener('online', handler);
});
