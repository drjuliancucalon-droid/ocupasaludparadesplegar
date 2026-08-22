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

-- ═══════════════════════════════════════════════════════════════════════
-- FASE 0, segunda colección (2026-08-21) — informes sociodemográficos y
-- cartas de custodia. Comparten tabla (diferenciados por `tipo`) porque hoy
-- comparten el mismo arreglo `siso_informes` — mismo criterio, no separar
-- lo que la app no separa. `informe_stats` es tabla NUEVA aparte porque el
-- patrón de almacenamiento de los adjuntos de estadísticas/IA es distinto:
-- una clave individual por reporte (siso_informe_stats_<empresa>_<ts>),
-- no un arreglo. El visor del portal NO renderiza el informe sin poder
-- resolver `stats_key` (guard `!informe.statsKey` en el cliente) — por eso
-- ambas tablas se migran juntas, nunca una sin la otra.
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS informes (
  id         TEXT PRIMARY KEY,
  tipo       TEXT NOT NULL DEFAULT 'informe',  -- 'informe' | 'custodia'
  empresa_id TEXT,
  fecha      TEXT,
  stats_key  TEXT,
  deleted    INTEGER DEFAULT 0,
  data       TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_informes_empresa ON informes(empresa_id);
CREATE INDEX IF NOT EXISTS idx_informes_tipo    ON informes(tipo);
CREATE INDEX IF NOT EXISTS idx_informes_deleted ON informes(deleted);

CREATE TABLE IF NOT EXISTS informe_stats (
  key        TEXT PRIMARY KEY,  -- el statsKey completo (siso_informe_stats_<empresa>_<ts>)
  empresa_id TEXT,
  data       TEXT NOT NULL,     -- fullData: {stats, aiResult, pacientes}
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_stats_empresa ON informe_stats(empresa_id);

-- ═══════════════════════════════════════════════════════════════════════
-- Tercera y cuarta colección (2026-08-22) — empresas y encuestas.
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS empresas (
  id         TEXT PRIMARY KEY,
  nit        TEXT,
  nombre     TEXT,
  deleted    INTEGER DEFAULT 0,
  data       TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_empresas_nit ON empresas(nit);
CREATE INDEX IF NOT EXISTS idx_empresas_deleted ON empresas(deleted);

CREATE TABLE IF NOT EXISTS encuestas (
  id         TEXT PRIMARY KEY,
  empresa_id TEXT,
  token      TEXT,
  estado     TEXT,
  deleted    INTEGER DEFAULT 0,
  data       TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_encuestas_empresa ON encuestas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_encuestas_token   ON encuestas(token);
CREATE INDEX IF NOT EXISTS idx_encuestas_estado  ON encuestas(estado);
