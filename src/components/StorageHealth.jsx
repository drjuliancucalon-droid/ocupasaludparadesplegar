// ═══════════════════════════════════════════════════════════════
// StorageHealth — FASE 4 + 5
// • Monitor de salud accesible mediante Alt+H (atajo)
// • Muestra: total D1, total LS, latencia worker, contadores criticos
// • Auto-limpieza LS cuando supera 80% de quota
// • Boton "Verificar integridad" para comparar D1 vs LS
// ═══════════════════════════════════════════════════════════════
import { useEffect, useState, useRef } from "react";

const LS_QUOTA_CHECK_INTERVAL = 5 * 60 * 1000;  // 5 min
const LS_QUOTA_THRESHOLD = 0.80; // 80% lleno → limpiar
const HEALTH_CHECK_INTERVAL = 2 * 60 * 1000;   // 2 min

// Calcula cuánto ocupa cada clave en LS (en bytes aprox)
function _lsAudit() {
  const stats = { totalBytes: 0, byPrefix: {}, biggest: [] };
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      const value = localStorage.getItem(key) || "";
      const size = key.length + value.length;
      stats.totalBytes += size;
      const prefix = key.startsWith("siso_") ? (key.split("_").slice(0, 3).join("_") || key.split("_")[0]) : "_otros";
      stats.byPrefix[prefix] = (stats.byPrefix[prefix] || 0) + size;
      if (size > 50000) stats.biggest.push({ key, size });
    }
    stats.biggest.sort((a, b) => b.size - a.size);
    stats.biggest = stats.biggest.slice(0, 15);
  } catch (e) {
    stats.error = e.message;
  }
  return stats;
}

// FASE 5: Auto-limpieza inteligente cuando LS está lleno
async function _autoCleanLS(currentUser) {
  const stats = _lsAudit();
  // Estimación de quota (varía por navegador, asumimos 5MB)
  let quota = 5 * 1024 * 1024;
  try {
    if (navigator.storage?.estimate) {
      const est = await navigator.storage.estimate();
      if (est.quota) quota = est.quota;
    }
  } catch {}
  const fillRatio = stats.totalBytes / quota;
  if (fillRatio < LS_QUOTA_THRESHOLD) return { cleaned: 0, fillRatio };

  // Estrategia: borrar entradas que YA están en D1 y no necesitamos en caché
  const candidatesToDelete = [];
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key) continue;
      // SEGURO de borrar (ya están en D1):
      if (
        key.startsWith("siso_portal_doc_") ||
        key.startsWith("siso_portal_CV-") ||
        key.startsWith("siso_hc_completa_codigo_") ||
        key.startsWith("siso_autosave_") ||
        key.startsWith("siso_snapshot_") ||
        key.startsWith("siso_audit_log_v_") ||
        // HCs completas de otros médicos (el actual mantiene las suyas)
        (key.startsWith("siso_hc_completa_") && currentUser?.user && !key.includes(currentUser.user))
      ) {
        candidatesToDelete.push(key);
      }
    }
  } catch {}

  let cleaned = 0;
  for (const k of candidatesToDelete) {
    try {
      const v = localStorage.getItem(k);
      cleaned += (k.length + (v?.length || 0));
      localStorage.removeItem(k);
    } catch {}
  }
  return { cleaned, deletedKeys: candidatesToDelete.length, fillRatio };
}

export default function StorageHealth({ workerUrl, token, currentUser }) {
  const [visible, setVisible] = useState(false);
  const [health, setHealth] = useState(null);
  const [lsStats, setLsStats] = useState(null);
  const [autoCleanResult, setAutoCleanResult] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [healthLatency, setHealthLatency] = useState(null);
  const [healthError, setHealthError] = useState(null);
  const cleanTimerRef = useRef(null);
  const healthTimerRef = useRef(null);

  // Atajo Alt+H para abrir/cerrar
  useEffect(() => {
    const handler = (e) => {
      if (e.altKey && (e.key === "h" || e.key === "H")) {
        e.preventDefault();
        setVisible((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // FASE 5: Auto-limpieza periódica
  useEffect(() => {
    if (!currentUser) return;
    const run = async () => {
      try {
        const result = await _autoCleanLS(currentUser);
        if (result.cleaned > 0) {
          setAutoCleanResult(result);
          console.log(`[StorageHealth] auto-limpieza: ${result.deletedKeys} claves, ${(result.cleaned / 1024).toFixed(1)} KB liberados`);
        }
      } catch {}
    };
    cleanTimerRef.current = setInterval(run, LS_QUOTA_CHECK_INTERVAL);
    run(); // primera vez
    return () => clearInterval(cleanTimerRef.current);
  }, [currentUser]);

  // FASE 4: Healthcheck periódico
  useEffect(() => {
    if (!workerUrl || !token) return;
    const check = async () => {
      const t0 = Date.now();
      try {
        const r = await fetch(`${workerUrl}/health`, {
          headers: { "X-Siso-Token": token },
          cache: "no-store",
        });
        const ms = Date.now() - t0;
        setHealthLatency(ms);
        if (!r.ok) {
          setHealthError(`HTTP ${r.status}`);
          return;
        }
        const j = await r.json();
        setHealth(j);
        setHealthError(null);
      } catch (e) {
        setHealthError(e.message);
        setHealthLatency(Date.now() - t0);
      }
    };
    check();
    healthTimerRef.current = setInterval(check, HEALTH_CHECK_INTERVAL);
    return () => clearInterval(healthTimerRef.current);
  }, [workerUrl, token]);

  // Refrescar stats LS al abrir el panel
  useEffect(() => {
    if (visible) setLsStats(_lsAudit());
  }, [visible]);

  const verifyIntegrity = async () => {
    setVerifying(true);
    try {
      // Compara count de pacientes LS vs D1
      const localPats = JSON.parse(localStorage.getItem("siso_db_patients_" + (currentUser?.user || "drcucalon")) || "[]");
      const r = await fetch(`${workerUrl}/store/${encodeURIComponent("siso_db_patients_" + (currentUser?.user || "drcucalon") + "__meta")}`, {
        headers: { "X-Siso-Token": token },
      });
      let remoteCount = "?";
      if (r.ok) {
        const arr = await r.json();
        const meta = arr[0]?.value;
        if (meta?.chunked) {
          // Necesita reconstrucción para count exacto, mostrar size del meta
          remoteCount = `chunked en ${meta.count} partes (${(meta.totalBytes / 1024 / 1024).toFixed(2)} MB)`;
        }
      }
      alert(`Pacientes en LS local: ${localPats.length}\nD1 remoto: ${remoteCount}`);
    } catch (e) {
      alert("Error: " + e.message);
    } finally {
      setVerifying(false);
    }
  };

  if (!visible) {
    // Solo botón flotante discreto si LS está >80%
    if (autoCleanResult && autoCleanResult.fillRatio >= 0.80) {
      return (
        <button
          onClick={() => setVisible(true)}
          style={{
            position: "fixed", bottom: 30, left: 16,
            background: "#dc2626", color: "white",
            padding: "6px 10px", borderRadius: 8,
            border: "none", fontSize: 11, fontWeight: 900,
            zIndex: 9997, cursor: "pointer",
            boxShadow: "0 4px 12px rgba(0,0,0,.2)",
          }}
        >
          ⚠️ LS {(autoCleanResult.fillRatio * 100).toFixed(0)}%
        </button>
      );
    }
    return null;
  }

  const formatBytes = (b) => b < 1024 ? b + " B" : b < 1024 * 1024 ? (b / 1024).toFixed(1) + " KB" : (b / 1024 / 1024).toFixed(2) + " MB";

  return (
    <div style={{
      position: "fixed", top: 60, right: 20,
      background: "white", border: "2px solid #065f46",
      borderRadius: 12, padding: 16, zIndex: 999997,
      width: 400, maxHeight: "80vh", overflowY: "auto",
      boxShadow: "0 12px 32px rgba(0,0,0,.3)",
      fontFamily: "system-ui, -apple-system, sans-serif", fontSize: 12,
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 style={{ margin: 0, fontSize: 14, color: "#065f46", fontWeight: 900 }}>🩺 Salud del Almacenamiento</h3>
        <button onClick={() => setVisible(false)} style={{ background: "transparent", border: "none", fontSize: 18, cursor: "pointer", color: "#6b7280" }}>✕</button>
      </div>

      <div style={{ background: "#f0fdf4", padding: 10, borderRadius: 8, marginBottom: 10 }}>
        <div style={{ fontWeight: 700, color: "#065f46", marginBottom: 4 }}>D1 Worker</div>
        {healthError ? (
          <div style={{ color: "#dc2626" }}>❌ {healthError}</div>
        ) : health ? (
          <>
            <div>Estado: <span style={{ color: "#065f46", fontWeight: 700 }}>{health.ok ? "OK ✅" : "ERROR ❌"}</span></div>
            <div>Latencia: {healthLatency} ms</div>
            <div>Total claves: <b>{health.counts?.total}</b></div>
            <div style={{ fontSize: 11, color: "#374151" }}>
              • Pacientes: {health.counts?.patients_keys}<br/>
              • HC completas: {health.counts?.hc_completas}<br/>
              • Portal docs: {health.counts?.portal_docs}<br/>
              • Portal empresa: {health.counts?.portal_empresa_keys}
            </div>
          </>
        ) : (
          <div>⏳ Cargando...</div>
        )}
      </div>

      {lsStats && (
        <div style={{ background: "#fef3c7", padding: 10, borderRadius: 8, marginBottom: 10 }}>
          <div style={{ fontWeight: 700, color: "#92400e", marginBottom: 4 }}>localStorage</div>
          <div>Total: <b>{formatBytes(lsStats.totalBytes)}</b></div>
          {lsStats.biggest.length > 0 && (
            <div style={{ fontSize: 10, color: "#374151", marginTop: 4 }}>
              <div style={{ fontWeight: 700, marginBottom: 2 }}>Top 5 más pesados:</div>
              {lsStats.biggest.slice(0, 5).map(b => (
                <div key={b.key} style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 250 }}>{b.key}</span>
                  <span>{formatBytes(b.size)}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {autoCleanResult && autoCleanResult.cleaned > 0 && (
        <div style={{ background: "#dbeafe", padding: 8, borderRadius: 6, marginBottom: 10, fontSize: 11 }}>
          🧹 Auto-limpieza: {autoCleanResult.deletedKeys} claves, {formatBytes(autoCleanResult.cleaned)} liberados
        </div>
      )}

      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
        <button
          onClick={verifyIntegrity}
          disabled={verifying}
          style={{
            flex: 1, background: "#065f46", color: "white",
            border: "none", padding: "8px 12px", borderRadius: 6,
            fontWeight: 900, fontSize: 11, cursor: "pointer",
          }}
        >
          {verifying ? "Verificando..." : "🔍 Verificar integridad"}
        </button>
        <button
          onClick={async () => {
            const r = await _autoCleanLS(currentUser);
            setAutoCleanResult(r);
            setLsStats(_lsAudit());
          }}
          style={{
            flex: 1, background: "#2563eb", color: "white",
            border: "none", padding: "8px 12px", borderRadius: 6,
            fontWeight: 900, fontSize: 11, cursor: "pointer",
          }}
        >
          🧹 Limpiar LS
        </button>
      </div>

      <div style={{ marginTop: 10, fontSize: 10, color: "#6b7280", textAlign: "center" }}>
        Atajo: <kbd style={{ background: "#e5e7eb", padding: "1px 4px", borderRadius: 3 }}>Alt+H</kbd>
      </div>
    </div>
  );
}
