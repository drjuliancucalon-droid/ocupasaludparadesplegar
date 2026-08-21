# Coordinación de esquema D1 compartido — para el asistente de `siso-appultimo`

Este documento es para el/la asistente de IA que trabaja en **`siso-appultimo`** (el refactor). Contexto: `siso-appultimo` y el monolito `ocupasaludparadesplegar` **comparten el mismo Worker (`siso-api`) y la misma base de datos D1 (`siso-db`)**. Cualquier cambio de esquema que hagas ahí afecta a ambas aplicaciones. Este documento describe qué se está haciendo del lado del monolito ahora mismo, para que puedas ajustar tu trabajo sin generar colisiones.

---

## 1. Lo que ya existía en D1 antes de hoy (probablemente obra tuya/de una sesión anterior de tu proyecto)

Al inspeccionar el esquema (`SELECT name FROM sqlite_master`) encontramos infraestructura de migraciones **ya creada el 2026-08-16**, sin ninguna referencia en el código del monolito:

```sql
CREATE TABLE siso_schema_migrations (
  version     INTEGER PRIMARY KEY,
  description TEXT NOT NULL,
  applied_at  TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE siso_audit_log (
  id        INTEGER PRIMARY KEY AUTOINCREMENT,
  ts        TEXT NOT NULL DEFAULT (datetime('now')),
  tenant    TEXT NOT NULL DEFAULT '',
  operation TEXT NOT NULL,
  key       TEXT NOT NULL,
  app_id    TEXT NOT NULL DEFAULT 'unknown',
  user_id   TEXT NOT NULL DEFAULT '',
  detail    TEXT
);
```

Registro actual en `siso_schema_migrations`:

| version | description | applied_at |
|---|---|---|
| 1 | schema v1 inicial | 2026-08-16 23:54:47 |
| 2 | indices v2 + tenant + audit 2026-08-16 | 2026-08-16 23:54:47 |
| **3** | bills + caja_movimientos: piloto migración blob-JSON a esquema híbrido (columnas indexables + data JSON completo) — **agregada hoy, ver sección 3** | 2026-08-21 |

`siso_audit_log` tiene **0 filas** — existe pero ningún código (ni monolito ni lo que encontramos de tu lado) escribe ahí todavía. Si ya tienes planeado usarla, dilo — el monolito está considerando conectarla también (ver sección 4) y hay que ponerse de acuerdo en el formato de `operation`/`detail` antes de que ambos lados empiecen a escribir con convenciones distintas.

## 2. Tabla original (no tocar su estructura, solo sus filas)

```sql
CREATE TABLE siso_store (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TEXT DEFAULT (datetime('now'))
);
```

Este es el almacén clave-valor genérico que usa hoy TODO el monolito (pacientes, empresas, cuentas de cobro, informes, etc. — arreglos JSON completos por clave, con troceo manual en piezas de 500KB para los grandes). Es el sistema que estamos migrando gradualmente hacia tablas relacionales reales — ver sección 3.

## 3. Lo que el monolito agregó hoy (Fase 0 de una migración en curso)

```sql
CREATE TABLE bills (
  id         TEXT PRIMARY KEY,
  company_id TEXT,
  client_nit TEXT,
  date       TEXT,
  pagada     INTEGER DEFAULT 0,
  deleted    INTEGER DEFAULT 0,
  data       TEXT NOT NULL,   -- objeto completo original en JSON, sin recortar campos
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE TABLE caja_movimientos (
  id         TEXT PRIMARY KEY,
  suf        TEXT,   -- sufijo dueño (empresa_<id> | usuario | shared)
  fecha      TEXT,
  estado     TEXT,
  deleted    INTEGER DEFAULT 0,
  data       TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);
```

**Estado actual: solo creadas, vacías.** Ningún código del monolito lee ni escribe ahí todavía — es la Fase 0 de un plan de 6 fases (crear tabla → escritura doble → migración histórica → verificación campo por campo → cambio de lectura → retiro del blob viejo, este último bloqueado hasta extender el snapshot diario y el respaldo a Supabase para cubrir las tablas nuevas). El objetivo es reemplazar, colección por colección, el patrón de arreglo-JSON-gigante por filas reales, sin perder ni un campo ni romper la impresión/visualización actual — cada fase se valida contra la app real antes de avanzar a la siguiente.

Orden planeado para las siguientes colecciones (si quieres coordinar para no duplicar esfuerzo): cuentas de cobro y caja de movimientos (ya en curso) → informes/custodias → encuestas/empresas → portal-empresa (estructura por período) → atenciones/HC → pacientes (al final, por ser la más grande y compleja: 654 registros, esquema híbrido con historia clínica variable).

## 4. Lo que te pedimos, para evitar colisión

1. **No crees una tabla `bills` ni `caja_movimientos` con un esquema distinto.** Si `siso-appultimo` necesita algo similar, usemos la misma tabla — dinos qué campos adicionales necesitarías y los evaluamos juntos antes de que tú definas tu propio esquema en paralelo.
2. **Cualquier `CREATE TABLE`/`ALTER TABLE` que hagas, regístralo en `siso_schema_migrations`** con el siguiente número de versión disponible (el próximo es el 4), para que ambos lados sepan qué se ha aplicado y cuándo, sin tener que inspeccionar el esquema a ciegas cada vez (como tuvimos que hacer hoy).
3. Si planeas usar `siso_audit_log`, avísanos el formato exacto que le darás a `operation`/`app_id`/`detail` — el monolito lo está considerando para las tablas nuevas y sería mejor que ambos lados escriban con la misma convención desde el inicio, en vez de reconciliar dos formatos después.
4. `siso_store` sigue siendo la fuente de verdad para todo lo que el monolito aún no migró — no lo reemplaces ni cambies su estructura mientras la migración esté en curso; ambas apps siguen leyendo de ahí para la mayoría de las colecciones.

## 5. Contacto

El doctor (dueño de ambos proyectos) es quien coordina entre las dos sesiones/agentes — cualquier duda o propuesta de esquema, que la canalice él antes de aplicarse en producción, dado que ambas apps comparten datos reales de pacientes.
