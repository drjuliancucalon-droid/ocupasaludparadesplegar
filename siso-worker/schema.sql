CREATE TABLE IF NOT EXISTS siso_store (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_key ON siso_store(key);

-- ═══════════════════════════════════════════════════════════════════════
-- FASE 0 (2026-08-20) — migración piloto de blob-JSON a tablas relacionales.
-- Esquema HÍBRIDO a propósito: columnas solo para lo que se necesita
-- consultar/indexar; el objeto completo se guarda intacto en `data` para
-- garantizar ida-y-vuelta sin pérdida de campos (ver auditoría de campos
-- de bills: type, tipoServicio, billDoctorId, vinculaCuentaV2Id, etc.).
-- `deleted` es una columna DERIVADA de `data._deleted` — nunca se edita
-- por separado, para no crear una segunda fuente de verdad del borrado.
-- Fase 0 = solo crea la tabla. Nada en la app todavía lee ni escribe
-- aquí — cero riesgo, cero cambio visible. Reversible con DROP TABLE.
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS bills (
  id         TEXT PRIMARY KEY,
  company_id TEXT,
  client_nit TEXT,
  date       TEXT,
  pagada     INTEGER DEFAULT 0,
  deleted    INTEGER DEFAULT 0,
  data       TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_bills_company ON bills(company_id);
CREATE INDEX IF NOT EXISTS idx_bills_date    ON bills(date);
CREATE INDEX IF NOT EXISTS idx_bills_deleted ON bills(deleted);

CREATE TABLE IF NOT EXISTS caja_movimientos (
  id         TEXT PRIMARY KEY,
  suf        TEXT,   -- sufijo dueño (empresa_<id> | usuario | shared) — equivale al sufijo de siso_caja_movs_<suf>
  fecha      TEXT,
  estado     TEXT,
  deleted    INTEGER DEFAULT 0,
  data       TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_caja_suf    ON caja_movimientos(suf);
CREATE INDEX IF NOT EXISTS idx_caja_estado ON caja_movimientos(estado);
