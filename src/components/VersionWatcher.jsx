// ═══════════════════════════════════════════════════════════════
// VersionWatcher — FASE 1 anti-bundle-viejo
// • Lee /version.json cada 60s
// • Si la versión del servidor es distinta → muestra banner persistente
// • Botón "Actualizar ahora" → unregister SW + clear caches + reload
// • Auto-reload tras 5 minutos si el usuario ignora
// • Muestra versión actual en el footer
// ═══════════════════════════════════════════════════════════════
import { useEffect, useState, useRef } from "react";

/* eslint-disable no-undef */
const APP_VERSION = typeof __APP_VERSION__ !== "undefined" ? __APP_VERSION__ : "dev";
const APP_COMMIT = typeof __APP_COMMIT__ !== "undefined" ? __APP_COMMIT__ : "dev";
const APP_BUILD_TIME = typeof __APP_BUILD_TIME__ !== "undefined" ? __APP_BUILD_TIME__ : "";

const POLL_INTERVAL_MS = 60 * 1000;    // 60s
const AUTO_RELOAD_MS = 5 * 60 * 1000;  // 5 min

async function _hardReload() {
  // 1) Unregister TODOS los service workers
  if ("serviceWorker" in navigator) {
    try {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) {
        try { await r.unregister(); } catch {}
      }
    } catch {}
  }
  // 2) Limpiar todas las cachés del Service Worker
  if ("caches" in window) {
    try {
      const names = await caches.keys();
      await Promise.all(names.map(n => caches.delete(n)));
    } catch {}
  }
  // 3) Bypass de caché HTTP
  try {
    window.location.reload(true);
  } catch {
    window.location.reload();
  }
}

export default function VersionWatcher() {
  const [serverVersion, setServerVersion] = useState(null);
  const [hasUpdate, setHasUpdate] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(AUTO_RELOAD_MS / 1000);
  const timerRef = useRef(null);
  const countdownRef = useRef(null);

  // Imprimir versión en consola al iniciar (visible para soporte)
  useEffect(() => {
    try {
      console.log(
        `%c[SISO] versión cargada: ${APP_VERSION}\nCommit: ${APP_COMMIT}\nBuild: ${APP_BUILD_TIME}`,
        "background:#065f46;color:white;padding:4px 10px;border-radius:6px;font-weight:900;"
      );
      window.__SISO_VERSION__ = { version: APP_VERSION, commit: APP_COMMIT, buildTime: APP_BUILD_TIME };
    } catch {}
  }, []);

  // Poll del servidor cada 60s
  useEffect(() => {
    let cancelled = false;
    const check = async () => {
      try {
        const r = await fetch("/version.json?t=" + Date.now(), {
          cache: "no-store",
          headers: { "Cache-Control": "no-cache" },
        });
        if (!r.ok) return;
        const j = await r.json();
        if (cancelled) return;
        setServerVersion(j);
        if (j.version && j.version !== APP_VERSION) {
          setHasUpdate(true);
        }
      } catch {}
    };
    check();
    timerRef.current = setInterval(check, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Cuando hay actualización: countdown de 5 min
  useEffect(() => {
    if (!hasUpdate) return;
    setSecondsLeft(AUTO_RELOAD_MS / 1000);
    countdownRef.current = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          _hardReload();
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => {
      if (countdownRef.current) clearInterval(countdownRef.current);
    };
  }, [hasUpdate]);

  // Footer siempre visible con versión + indicador
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const countdownText = `${minutes}:${String(seconds).padStart(2, "0")}`;

  return (
    <>
      {/* Banner persistente cuando hay actualización */}
      {hasUpdate && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0, right: 0,
            background: "linear-gradient(90deg,#065f46,#0d9488)",
            color: "white",
            padding: "10px 16px",
            zIndex: 999999,
            display: "flex",
            alignItems: "center",
            gap: 12,
            boxShadow: "0 4px 12px rgba(0,0,0,.25)",
            fontFamily: "system-ui, -apple-system, sans-serif",
            fontSize: 14,
          }}
        >
          <span style={{ fontSize: 22 }}>🔄</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 900 }}>Nueva versión disponible</div>
            <div style={{ fontSize: 12, opacity: 0.9 }}>
              Auto-actualizando en {countdownText} · Recargue ahora para evitar interrupciones
            </div>
          </div>
          <button
            onClick={_hardReload}
            style={{
              background: "white",
              color: "#065f46",
              border: "none",
              padding: "8px 16px",
              borderRadius: 8,
              fontWeight: 900,
              cursor: "pointer",
              fontSize: 13,
            }}
          >
            Actualizar ahora
          </button>
        </div>
      )}

      {/* Versión visible en esquina inferior derecha */}
      <div
        style={{
          position: "fixed",
          bottom: 4,
          right: 6,
          fontSize: 9,
          color: hasUpdate ? "#dc2626" : "#9ca3af",
          fontFamily: "monospace",
          zIndex: 9998,
          pointerEvents: "none",
          textShadow: "0 1px 2px rgba(255,255,255,.8)",
        }}
        title={`SISO ${APP_VERSION}\nCommit: ${APP_COMMIT}\nBuild: ${APP_BUILD_TIME}`}
      >
        v.{APP_COMMIT} {hasUpdate ? "· UPDATE" : ""}
      </div>
    </>
  );
}
