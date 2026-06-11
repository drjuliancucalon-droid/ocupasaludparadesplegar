// ═══════════════════════════════════════════════════════════════
// D1ChangesWatcher — FASE 2 multi-dispositivo
// • Cada 30 segundos consulta los `__meta.ts` de las claves críticas
// • Si el timestamp del servidor es MÁS reciente que el local → refresca
// • Banner discreto: "Cambios detectados en otra sesión"
// • No interrumpe al usuario — refresca silenciosamente
// ═══════════════════════════════════════════════════════════════
import { useEffect, useRef, useState } from "react";

const POLL_INTERVAL_MS = 30 * 1000;

const KEYS_TO_WATCH = [
  // Crítico — arrays compartidos entre dispositivos
  "siso_atenciones_cerradas",
  "siso_companies_drcucalon",
  "siso_companies_shared",
  "siso_encuestas",
  "siso_informes",
];

async function _readMetaTs(workerUrl, token, key) {
  // Para arrays grandes: leer __meta (pequeño, rápido)
  try {
    const r = await fetch(`${workerUrl}/store/${encodeURIComponent(key + "__meta")}`, {
      headers: { "X-Siso-Token": token },
      cache: "no-store",
    });
    if (!r.ok) return null;
    const arr = await r.json();
    const meta = arr[0]?.value;
    if (meta?.ts) return meta.ts;
    // Si no es chunked, leer la clave directa por su ts
    const r2 = await fetch(`${workerUrl}/store/${encodeURIComponent(key)}`, {
      headers: { "X-Siso-Token": token },
      cache: "no-store",
    });
    if (!r2.ok) return null;
    const arr2 = await r2.json();
    return arr2[0]?.ts || arr2[0]?.updatedAt || null;
  } catch {
    return null;
  }
}

export default function D1ChangesWatcher({ workerUrl, token, onChangesDetected, currentUser }) {
  const [bannerVisible, setBannerVisible] = useState(false);
  const [changedKeys, setChangedKeys] = useState([]);
  const lastSeenTsRef = useRef({});
  const timerRef = useRef(null);
  const dismissedUntilRef = useRef(0);

  useEffect(() => {
    if (!workerUrl || !token || !currentUser) return;

    let cancelled = false;
    let firstRun = true;

    const tick = async () => {
      // Si el usuario descartó el banner hace menos de 60s, NO molestar
      if (Date.now() < dismissedUntilRef.current) return;

      const changes = [];
      for (const key of KEYS_TO_WATCH) {
        const ts = await _readMetaTs(workerUrl, token, key);
        if (cancelled || ts == null) continue;
        const prev = lastSeenTsRef.current[key];
        if (prev == null) {
          lastSeenTsRef.current[key] = ts;
        } else if (ts > prev) {
          changes.push(key);
          lastSeenTsRef.current[key] = ts;
        }
      }

      if (firstRun) {
        firstRun = false;
        return; // primera ronda solo establece baseline, no notifica
      }

      if (changes.length > 0 && !cancelled) {
        setChangedKeys(changes);
        setBannerVisible(true);
        // Refrescar silenciosamente (callback del padre)
        try {
          if (typeof onChangesDetected === "function") {
            await onChangesDetected(changes);
          }
        } catch (e) {
          console.warn("[D1ChangesWatcher] onChangesDetected error:", e?.message);
        }
        // Auto-ocultar banner tras 5 segundos
        setTimeout(() => {
          if (!cancelled) setBannerVisible(false);
        }, 5000);
      }
    };

    // Primer tick: establecer baseline tras 5 segundos
    const initTimer = setTimeout(tick, 5000);
    timerRef.current = setInterval(tick, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      clearTimeout(initTimer);
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [workerUrl, token, currentUser, onChangesDetected]);

  if (!bannerVisible) return null;

  const labels = {
    siso_atenciones_cerradas: "Atenciones",
    siso_companies_drcucalon: "Empresas",
    siso_companies_shared: "Empresas",
    siso_encuestas: "Encuestas",
    siso_informes: "Informes",
  };
  const what = [...new Set(changedKeys.map(k => labels[k] || k))].join(", ");

  return (
    <div
      style={{
        position: "fixed",
        bottom: 20,
        left: 20,
        background: "rgba(13, 148, 136, 0.95)",
        color: "white",
        padding: "10px 16px",
        borderRadius: 10,
        zIndex: 999998,
        boxShadow: "0 6px 20px rgba(0,0,0,.25)",
        fontFamily: "system-ui, -apple-system, sans-serif",
        fontSize: 13,
        maxWidth: 340,
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <span style={{ fontSize: 18 }}>🔄</span>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 900, fontSize: 12 }}>Cambios desde otra sesión</div>
        <div style={{ fontSize: 11, opacity: 0.9 }}>
          {what} actualizad{what.includes(",") ? "as" : "a"} silenciosamente
        </div>
      </div>
      <button
        onClick={() => {
          dismissedUntilRef.current = Date.now() + 60000;
          setBannerVisible(false);
        }}
        style={{
          background: "rgba(255,255,255,.2)",
          color: "white",
          border: "none",
          padding: "4px 8px",
          borderRadius: 6,
          fontSize: 11,
          fontWeight: 700,
          cursor: "pointer",
        }}
      >
        OK
      </button>
    </div>
  );
}
