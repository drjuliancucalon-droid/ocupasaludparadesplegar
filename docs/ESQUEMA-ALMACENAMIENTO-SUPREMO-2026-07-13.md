# ESQUEMA SUPREMO DE ALMACENAMIENTO — OCUPASALUD v4.8
## Auditoría Forense de Persistencia — 13 de Julio 2026

---

# PARTE I: ARQUITECTURA DE 3 CAPAS DE ALMACENAMIENTO

```
┌─────────────────────────────────────────────────────────────────────┐
│                     CAPA 0: MEMORIA EFÍMERA                          │
│  sessionStorage (se limpia al cerrar pestaña)                       │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │ siso_enc_key          → clave AES-GCM para cifrado           │   │
│  │ siso_ai_keys_*        → API keys de IA (respaldo temporal)   │   │
│  └──────────────────────────────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│                     CAPA 1: LOCAL (navegador)                        │
│  ┌──────────────────────┐  ┌────────────────────────────────────┐   │
│  │    localStorage       │  │   IndexedDB: siso_offline_db v1     │   │
│  │    (~5-10MB cuota)    │  │   (~50MB+ cuota)                    │   │
│  │                       │  │                                     │   │
│  │  67+ claves distintas │  │  Object Stores:                    │   │
│  │  Todas string/JSON    │  │  ├─ kv_store (key, value,          │   │
│  │                       │  │  │           updatedAt)            │   │
│  │                       │  │  ├─ sync_queue (cola offline)      │   │
│  │                       │  │  ├─ audit_queue (logs auditoría)   │   │
│  │                       │  │  └─ sync_meta (timestamps)         │   │
│  └──────────────────────┘  └────────────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│                     CAPA 2: NUBE (Cloudflare + Supabase)             │
│  ┌──────────────────────────────┐  ┌────────────────────────────┐   │
│  │   Cloudflare D1: siso-db     │  │   Supabase: siso_store      │   │
│  │   Worker: siso-api           │  │   (tabla key-value)         │   │
│  │                              │  │                             │   │
│  │   Tabla: siso_store          │  │   Misma estructura:         │   │
│  │   ├─ key TEXT PK             │  │   ├─ key TEXT PK            │   │
│  │   ├─ value TEXT NOT NULL     │  │   ├─ value JSONB            │   │
│  │   └─ updated_at TEXT         │  │   └─ updated_at TIMESTAMPTZ │   │
│  │                              │  │                             │   │
│  │   Endpoints REST:            │  │   Acceso vía:               │   │
│  │   GET    /store/:key         │  │   supabase.js (SDK)         │   │
│  │   POST   /store              │  │   + REST API directo        │   │
│  │   POST   /store/chunked      │  │                             │   │
│  │   POST   /store/append       │  │                             │   │
│  │   GET    /store/prefix/:px   │  │                             │   │
│  │   DELETE /store/:key         │  │                             │   │
│  │   GET    /health             │  │                             │   │
│  │   POST   /snapshot           │  │                             │   │
│  └──────────────────────────────┘  └────────────────────────────┘   │
├─────────────────────────────────────────────────────────────────────┤
│                     CAPA 3: CDN / EXTERNOS                           │
│  ┌──────────────────────────────────────────────────────────────┐   │
│  │  Cloudinary → imágenes (logos, firmas, adjuntos escaneados)   │   │
│  │  cache.siso.app → caché HTTP estática (vite build output)     │   │
│  │  Service Worker Cache (Cache API):                            │   │
│  │    ├─ siso-assets-v2  → JS/CSS/fuentes/imágenes               │   │
│  │    └─ siso-pages-v2   → HTML (SPA fallback)                   │   │
│  └──────────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────────┘
```

---

# PARTE II: CATÁLOGO COMPLETO DE CLAVES (67+ claves)

## II.A — SESIÓN Y AUTENTICACIÓN (7 claves)

| # | Clave | Storage | Tipo | Propósito | Escritura | Lectura | Riesgo |
|---|-------|---------|------|-----------|-----------|---------|--------|
| 1 | `siso_session` | localStorage | JSON | Sesión activa: user, role, empresaId, view, navStack, activeTab, dataType, lastSaveTs | App.jsx:21147,21209 | App.jsx:1342,17917, etc. | ⚠️ MEDIO — contiene activeTab/dataType que determinan qué datos se cargan |
| 2 | `siso_rl_login` | localStorage | JSON | Rate-limit: {attempts, blockedUntil} | security.js:57, App.jsx:124 | security.js:50, App.jsx:123 | ✅ BAJO |
| 3 | `siso_login_attempts` | localStorage | number | Contador intentos fallidos (legado) | App.jsx:22667 | App.jsx:17956 | ✅ BAJO |
| 4 | `siso_login_blocked_until` | localStorage | number | Timestamp desbloqueo (legado) | App.jsx:22668 | App.jsx:17960 | ✅ BAJO |
| 5 | `siso_privacidad_aceptada` | localStorage | boolean | Ley 1581/2012 aceptación | — | App.jsx:17966 | ✅ BAJO |
| 6 | `siso_enc_key` | **sessionStorage** | string | Clave AES-GCM cifrado datos sensibles | App.jsx:22528 | App.jsx:17864 | ⚠️ MEDIO — si se pierde, datos cifrados ilegibles |
| 7 | `siso_2fa_secret` | localStorage | string | Secreto TOTP 2FA (implícito) | — | — | ✅ BAJO |

## II.B — INFRAESTRUCTURA CLOUD / SINCRONIZACIÓN (6 claves)

| # | Clave | Storage | Tipo | Propósito | Escritura | Lectura | Riesgo |
|---|-------|---------|------|-----------|-----------|---------|--------|
| 8 | `siso_worker_url_cache` | localStorage | string | URL del Worker D1 (fallback) | App.jsx:282 | App.jsx:280 | ✅ BAJO |
| 9 | `siso_worker_token_cache` | localStorage | string | Token JWT Worker D1 (fallback) | App.jsx:291 | App.jsx:289 | ✅ BAJO |
| 10 | `siso_pending_d1_writes` | localStorage | JSON obj | Cola escrituras D1 fallidas {key: {value, retries, ts}} | App.jsx:632,725,19461,19484 | App.jsx:655,19468 | 🔴 **CRÍTICO** — fugas si no se reintenta |
| 11 | `siso_hc_sin_respaldo` | localStorage | JSON obj | Marcador "HCs sin respaldo en nube" {hcs, cuentas, propuestas} | App.jsx:680 | App.jsx:676,686 | 🟡 ALTO — indicador de fuga activa |
| 12 | `siso_last_sync_ts` | localStorage | number | Timestamp última sincronización Supabase | App.jsx:1513 | App.jsx:1508 | ✅ BAJO |
| 13 | `siso_data_fix_v2` | localStorage | string | Flag de migración v2 ejecutada | App.jsx:20899 | App.jsx:20681 | ✅ BAJO |

## II.C — PACIENTES (7 claves dinámicas)

| # | Clave patrón | Storage | Tipo | Propósito | Riesgo |
|---|-------------|---------|------|-----------|--------|
| 14 | `siso_db_patients_{uid}` | localStorage + IndexedDB | Array\<Patient\> | Lista de pacientes del médico | 🔴 **CRÍTICO** — dataset más grande, blanco de corrupción |
| 15 | `siso_db_patients_empresa_{empresaId}` | localStorage | Array\<Patient\> | Pacientes scoped por empresa | 🟡 ALTO |
| 16 | `siso_db_patients_shared` | localStorage | Array\<Patient\> | Pacientes compartidos | 🟡 ALTO |
| 17 | `siso_patients_emp_{empId}` | localStorage | Array | Pacientes por empresa (formato antiguo) | 🟡 ALTO |
| 18 | `siso_pat_last_backup_{uid}` | localStorage | number | Timestamp último backup | ✅ BAJO |
| 19 | `siso_d1_patients_pushed_{uid}` | localStorage | string | Flag "push inicial a D1 hecho" | ✅ BAJO |
| 20 | `siso_hc_push_done_{uid}` | localStorage | number | Timestamp último push HC a D1 | ✅ BAJO |

## II.D — EMPRESAS (4 claves)

| # | Clave patrón | Storage | Tipo | Propósito | Riesgo |
|---|-------------|---------|------|-----------|--------|
| 21 | `siso_db_companies_{uid}` | localStorage + IndexedDB | Array\<Company\> | Lista de empresas del médico | 🟡 ALTO |
| 22 | `siso_db_companies_shared` | localStorage | Array\<Company\> | Empresas compartidas | 🟡 ALTO |
| 23 | `siso_companies` | localStorage + D1 + Supabase | Array\<Company\> | Empresas globales (todas) | 🔴 **CRÍTICO** — merge multi-sesión complejo |
| 24 | `siso_orgs_list` | localStorage | JSON | Lista de organizaciones | ✅ BAJO |

## II.E — HISTORIAS CLÍNICAS / ATENCIONES (5 claves)

| # | Clave | Storage | Tipo | Propósito | Riesgo |
|---|-------|---------|------|-----------|--------|
| 25 | `siso_atenciones_{uid}` | localStorage | Array\<Atencion\> | Atenciones/HCs del médico | 🔴 **CRÍTICO** |
| 26 | `siso_atenciones_cerradas` | localStorage + Supabase | Array\<Atencion\> | HCs cerradas (v1, legacy) | 🟡 ALTO — puede divergir de D1 |
| 27 | `siso_atenciones_v` | localStorage | string | Versión del esquema de atenciones | ✅ BAJO |
| 28 | `siso_active_form` | localStorage | JSON | Borrador del formulario activo (autosave) | ⚠️ MEDIO — puede restaurar datos viejos |
| 29 | `siso_autosave_{id}` | localStorage | JSON | Autosave específico por ID | ⚠️ MEDIO — acumulación progresiva |

## II.F — MÉDICO / FIRMA (2 claves)

| # | Clave | Storage | Tipo | Propósito | Riesgo |
|---|-------|---------|------|-----------|--------|
| 30 | `siso_doctor_signature` | localStorage (+ Supabase en sync excepcional) | string (base64 ~100KB-3.8MB) | Firma del médico para certificados | ⚠️ MEDIO — si se corrompe, certificados sin firma |
| 31 | `siso_medico_turno` | localStorage | string | Turno del médico | ✅ BAJO |

## II.G — FACTURACIÓN / CUENTAS DE COBRO (4 claves)

| # | Clave | Storage | Tipo | Propósito | Riesgo |
|---|-------|---------|------|-----------|--------|
| 32 | `siso_saved_bills` | localStorage + D1 + Supabase | Array\<Bill\> | Facturas globales | 🔴 **CRÍTICO** — merge por id implementado pero con condiciones de carrera |
| 33 | `siso_saved_bills_{uid}` | localStorage + D1 | Array\<Bill\> | Facturas por médico/empresa | 🔴 **CRÍTICO** — mismo riesgo que global |
| 34 | `siso_caja` | localStorage | Array\<Movimiento\> | Caja global | 🟡 ALTO |
| 35 | `siso_caja_{uid}` | localStorage | Array\<Movimiento\> | Caja por médico/empresa | 🟡 ALTO |
| 36 | `siso_caja_movs` | localStorage | Array | Movimientos de caja | ⚠️ MEDIO |

## II.H — INFORMES / PROPUESTAS ECONÓMICAS (5 claves)

| # | Clave | Storage | Tipo | Propósito | Riesgo |
|---|-------|---------|------|-----------|--------|
| 37 | `siso_saved_reports` | localStorage + D1 + Supabase | Array\<Report\> | Propuestas económicas guardadas | 🔴 **CRÍTICO** — V8: se perdieron propuestas por sobreescritura |
| 38 | `siso_informes` | localStorage + Supabase | Array\<Informe\> | Informes médicos | 🟡 ALTO |
| 39 | `siso_informes_{uid}` | localStorage | Array\<Informe\> | Informes por médico | 🟡 ALTO |
| 40 | `siso_informe_stats` | D1 | JSON | Estadísticas de informes | 🟡 ALTO |
| 41 | `siso_informe_stats_{uid}` | D1 + Supabase | JSON | Estadísticas por médico | 🟡 ALTO |

## II.I — PORTAL EMPRESARIAL (4 claves dinámicas)

| # | Clave patrón | Storage | Tipo | Propósito | Riesgo |
|---|-------------|---------|------|-----------|--------|
| 42 | `siso_portal_empresa_docs_{nit}` | localStorage + D1 | JSON | Documentos de empresa para portal | 🟡 ALTO |
| 43 | `siso_portal_empresa_atenciones_{nit}` | D1 + Supabase | JSON | Atenciones visibles en portal empresa | 🔴 **CRÍTICO** |
| 44 | `siso_portal_config` | localStorage + D1 | JSON | Configuración del portal | ✅ BAJO |
| 45 | `siso_portal_users` | D1 | JSON | Usuarios del portal | 🟡 ALTO |

## II.J — USUARIOS / PERMISOS (3 claves)

| # | Clave | Storage | Tipo | Propósito | Riesgo |
|---|-------|---------|------|-----------|--------|
| 46 | `siso_users` | localStorage + D1 + Supabase | Array\<User\> | Lista de usuarios del sistema | 🔴 **CRÍTICO** — si se corrompe, nadie puede loguear |
| 47 | `siso_permissions_{uid}` | localStorage + Supabase | JSON | Permisos por usuario | 🟡 ALTO |
| 48 | `siso_roles` | localStorage | JSON | Roles del sistema | ✅ BAJO |

## II.K — CONFIGURACIÓN IA / API KEYS (4 claves)

| # | Clave | Storage | Tipo | Propósito | Riesgo |
|---|-------|---------|------|-----------|--------|
| 49 | `siso_ai_config_provider` | localStorage | JSON | Config proveedor IA (modelo, endpoint) | ⚠️ MEDIO |
| 50 | `siso_ai_config_provider_{uid}` | localStorage | JSON | Config IA por usuario | ⚠️ MEDIO |
| 51 | `siso_ai_keys` | localStorage + sessionStorage | JSON (cifrado AES-GCM) | API keys de IA | 🔴 **CRÍTICO** — cifrado, pero en localStorage persiste |
| 52 | `siso_ai_keys_{uid}` | localStorage + sessionStorage | JSON (cifrado) | API keys por usuario | 🔴 **CRÍTICO** |
| 53 | `siso_ai_config_version` | localStorage | string | Versión del esquema de config IA | ✅ BAJO |
| 54 | `siso_ai_calls_count` | localStorage | JSON | Contador de llamadas IA | ✅ BAJO |

## II.L — DATOS CLÍNICOS / MEDICAMENTOS / ENCUESTAS (5 claves)

| # | Clave | Storage | Tipo | Propósito | Riesgo |
|---|-------|---------|------|-----------|--------|
| 55 | `siso_encuestas` | localStorage + D1 + Supabase | Array\<Encuesta\> | Encuestas médicas | 🟡 ALTO |
| 56 | `siso_teleconsultas` | localStorage | Array\<Teleconsulta\> | Teleconsultas | 🟡 ALTO |
| 57 | `siso_portafolio` | localStorage | Array\<Servicio\> | Portafolio de servicios | ✅ BAJO |
| 58 | `siso_cotizaciones` | localStorage | Array\<Cotizacion\> | Cotizaciones | ⚠️ MEDIO |
| 59 | `siso_medicamentos_co_custom` | localStorage | Array\<Medicamento\> | Medicamentos personalizados CO | ⚠️ MEDIO |

## II.M — OTROS (8 claves)

| # | Clave | Storage | Tipo | Propósito | Riesgo |
|---|-------|---------|------|-----------|--------|
| 60 | `siso_email_config` | localStorage | JSON | Config EmailJS | ⚠️ MEDIO |
| 61 | `siso_email_config_{uid}` | Supabase | JSON | Config email por médico | ✅ BAJO |
| 62 | `siso_cartas_custodia` | localStorage + D1 + Supabase | Array\<Carta\> | Cartas de custodia | 🟡 ALTO |
| 63 | `siso_audit_log` | localStorage (cap 1000) + IndexedDB audit_queue | Array\<LogEntry\> | Registro de auditoría RDA 1888/2025 | ⚠️ MEDIO — capped, puede perder entradas viejas |
| 64 | `siso_error_log` | localStorage | Array\<ErrorEntry\> | Registro de errores | ✅ BAJO |
| 65 | `siso_habeas_requests` | localStorage | Array\<HabeasRequest\> | Solicitudes habeas data | 🟡 ALTO |
| 66 | `siso_cloudinary_config` | localStorage | JSON | Config Cloudinary | ✅ BAJO |
| 67 | `siso_worker_snapshot_ts` | localStorage | number | Último snapshot del worker | ✅ BAJO |

---

# PARTE III: MAPA DE FLUJOS DE ESCRITURA (QUIÉN ESCRIBE QUÉ, CUÁNDO, DÓNDE)

## III.A — FLUJO PRINCIPAL: GUARDADO DE PACIENTES

```
Usuario modifica paciente
  │
  ▼
setPatientsList(updatedList)         ← estado React
  │
  ▼
_syncPatients(list)                  ← App.jsx ~L23377
  │
  ├─[1] _ls.setItem(_patKey(suid), JSON.stringify(_stripFirmaLS(list)))
  │      └─ localStorage: escritura SINCRÓNICA inmediata
  │      └─ ⚠️ QuotaExceededError → va a _memStore (RAM volátil!)
  │
  ├─[2] _idbSet(key, list)           ← IndexedDB: espejo COMPLETO (con firmas)
  │      └─ async, fire-and-forget
  │
  ├─[3] _sbSet(cloudKey, slimList)   ← Supabase: mejor esfuerzo
  │      └─ si falla → encola en _sbQueue.pending
  │
  └─[4] (async) PROTECCIÓN ANTI-REGRESIÓN + D1
         │
         ├─ _workerGet(key) → remote list
         ├─ MERGE: local ∪ (remote \ local) por id/docNumero
         ├─ _idbSet(key, finalList)           ← IndexedDB merge
         ├─ _ls.setItem(key, _stripFirmaLS)   ← localStorage merge
         ├─ setPatientsList(finalList)          ← React state merge
         ├─ _workerSet(cloudKey, slimFinal)    ← D1 (clave scoped)
         ├─ _workerSet(key, slimFinal)         ← D1 (clave user)
         └─ si falla → _enqueuePendingD1()
                     → _markUnsyncedHC(true)
```

## III.B — FLUJO: FACTURAS (POST-FIX 2026-06-15)

```
Usuario guarda factura
  │
  ▼
setBills(updated)
  │
  ▼
_persistBillsSafe(updated)           ← App.jsx ~L23390
  │
  ├─[1] localStorage.setItem("siso_saved_bills_{uid}", JSON.stringify(upd))
  ├─[2] localStorage.setItem("siso_saved_bills", JSON.stringify(upd))
  │
  └─[3] (async) Promise.all([
           _writeArrayMergeD1("siso_saved_bills_{uid}", upd, "id"),
           _writeArrayMergeD1("siso_saved_bills", upd, "id"),
         ])
         │
         ├─ Cada _writeArrayMergeD1:
         │   ├─ _workerGet(key) → remote
         │   ├─ MERGE: localIds ∪ remoteIds (preserva extras)
         │   └─ _workerSet(key, finalList)
         │
         └─ .then(([a,b]) => _markUnsyncedHC(!(a && b), "cuentas"))
```

## III.C — FLUJO: PROPUESTAS ECONÓMICAS (POST-FIX 2026-07-09)

```
Usuario guarda propuesta
  │
  ▼
setReports(updated)
  │
  ▼
_persistReportsSafe(updated)        ← App.jsx ~L23460
  │
  ├─[1] _ls.setItem("siso_saved_reports", JSON.stringify(upd))
  │
  └─[2] _writeArrayMergeD1("siso_saved_reports", upd, "id")
         ├─ Merge por id en D1
         └─ _markUnsyncedHC(!ok, "propuestas") si falla
```

## III.D — FLUJO: ARRANQUE / CARGA INICIAL

```
App monta (useEffect inicial)
  │
  ├─[1] Leer siso_session → user, empresaId
  │
  ├─[2] Si localStorage tiene < 2h de antigüedad → datos locales primero
  │
  ├─[3] Cargar pacientes:
  │     ├─ localStorage: siso_db_patients_{uid}
  │     ├─ Si corrupto → limpiar y regenerar desde IndexedDB/D1
  │     ├─ IndexedDB kv_store: siso_db_patients_{uid}
  │     └─ D1 GET /store/siso_db_patients_{uid}
  │         └─ Si D1 tiene pacientes que local NO → MERGE
  │
  ├─[4] Cargar empresas: siso_companies (D1 + merge local)
  │
  ├─[5] Cargar siso_users (D1 + merge local)
  │
  ├─[6] Cargar doctor_signature (solo localStorage, NO Supabase)
  │
  ├─[7] Cargar AI config
  │
  ├─[8] Cargar informes, facturas, encuestas, custodias...
  │     └─ Cada uno: D1 → merge con localStorage → escribir merge en localStorage
  │
  └─[9] AUTO-PUSH: si D1 está vacío pero localStorage tiene datos → subir
```

---

# PARTE IV: 23 VECTORES DE FUGA DE INFORMACIÓN IDENTIFICADOS

## VECTORES CRÍTICOS (🔴 — pueden causar pérdida permanente de datos)

### V1 · Carrera de escritura chunked (piezas entrelazadas)
- **Archivo**: `siso-worker/index.js` L178-270
- **Mecanismo**: Dos guardados simultáneos de la misma clave entrelazan piezas `__cN` de generaciones distintas → hash mismatch → CORRUPCIÓN
- **Mitigación**: `POST /store/chunked` atómico (servidor-side chunking) implementado 2026-07-11
- **Estado**: ✅ Mitigado en D1. Pero ⚠️ el cliente todavía puede hacer escritura NO-chunked (POST /store normal).
- **Evidencia**: 3 ocurrencias documentadas en informe julio 2026

### V2 · Encogimiento de colecciones (estado viejo pisa estado nuevo)
- **Archivo**: `siso-worker/index.js` L204-238, `App.jsx` syncPatients
- **Mecanismo**: Pestaña A tiene 300 pacientes, Pestaña B tiene 280 (estado viejo). Pestaña B guarda → D1 pasa de 300 a 280 → se pierden 20 pacientes.
- **Mitigación**: CANDADO ANTI-ENCOGIMIENTO (comparar tamaños antes de escribir, threshold + merge por ID)
- **Estado**: ✅ Mitigado con merge conservador (siempre preservar pacientes remotos que local no conoce). PERO: ⚠️ no aplica a TODAS las claves, solo pacientes, facturas, propuestas.
- **Claves protegidas**: `siso_db_patients_*`, `siso_saved_bills*`, `siso_saved_reports`
- **Claves NO protegidas**: `siso_companies`, `siso_encuestas`, `siso_users`, `siso_atenciones_*`, `siso_informes`, `siso_cartas_custodia`

### V3 · Sobrescritura desde Supabase (sync periódico reverso)
- **Archivo**: `syncManager.js` L253-282
- **Mecanismo**: El sync periódico descarga TODO de Supabase y SOBRESCRIBE localStorage sin merge. Si Supabase tiene datos viejos (porque una escritura D1 no llegó a Supabase), se revierte el estado local.
- **Mitigación**: Ninguna completa. El sync periódico fue deshabilitado parcialmente pero el código sigue ahí.
- **Estado**: 🟡 PARCIALMENTE mitigado — el arranque ahora hace merge en vez de reemplazo.

### V4 · localStorage QuotaExceededError → pérdida silenciosa
- **Archivo**: `App.jsx` L160-175, `App.jsx` L1723-1749
- **Mecanismo**: `_ls.setItem()` lanza QuotaExceededError. El catch guarda en `_memStore` (RAM volátil). Si el usuario cierra la pestaña → datos perdidos para siempre.
- **Estado**: ❌ NO mitigado adecuadamente. `_memStore` no tiene respaldo y se pierde al cerrar.
- **Evidencia**: `console.warn("[_sync] localStorage QUOTA EXCEEDED para", key, "- continuando hacia D1")` — este mensaje existe en el código.
- **Severidad**: Si D1 también falla en ese momento, pérdida total.

### V5 · Cola de escrituras pendientes D1 sin garantía de entrega
- **Archivo**: `App.jsx` L611-725
- **Mecanismo**: `_enqueuePendingD1()` guarda en `siso_pending_d1_writes` en localStorage. El reintento ocurre en el próximo `_syncPatients()` o `_persistBillsSafe()`. Pero si el usuario no vuelve a guardar ese tipo de dato, la entrada queda huérfana.
- **Límite**: 60KB por entrada, 20 reintentos máx.
- **Estado**: 🟡 Las entradas se reintentan pero solo cuando se dispara una nueva escritura del mismo tipo.
- **Pérdida**: Si una entrada en la cola excede 20 reintentos → se descarta SILENCIOSAMENTE.

### V6 · Eliminación de firma del médico en localStorage (stripFirmaLS)
- **Archivo**: `App.jsx` L23377-23400 `_stripFirmaLS()`
- **Mecanismo**: Para ahorrar ~3.8MB en localStorage, `_stripFirmaLS()` quita la firma (base64) de CADA paciente antes de guardar en LS. La firma se guarda aparte en `siso_doctor_signature`.
- **Riesgo**: Si `siso_doctor_signature` se corrompe o se pierde, todos los certificados quedan sin firma. La versión COMPLETA (con firmas) solo está en IndexedDB (`_idbSet`), que puede ser limpiada por el navegador.
- **Estado**: ⚠️ Riesgo aceptado. La firma completa está en IndexedDB + D1. Pero si ambos fallan...

### V7 · Borrado de factura NO atómico (deleteBillSafe)
- **Archivo**: `App.jsx` L23435+
- **Mecanismo**: `_deleteBillSafe` lee D1, quita el ID, escribe. Pero entre lectura y escritura hay ventana de race condition con otra pestaña que agregue facturas.
- **Estado**: ⚠️ Ventana pequeña pero real.

### V8 · Pérdida de propuestas económicas (YA OCURRIDO)
- **Archivo**: `App.jsx` _persistReportsSafe (ANTES del fix 2026-07-09)
- **Mecanismo**: Antes del fix, se usaba `_sync()` → `_workerSet()` directo que REEMPLAZABA el array completo en D1. Una sesión con array vacío `[]` pisaba D1 y se perdían todas las propuestas.
- **Estado**: ✅ Mitigado con `_writeArrayMergeD1`. **PERO** ⚠️ la misma vulnerabilidad existe en otras claves que todavía usan `_sync()` o `_sbSet()` sin merge.

### V9 · Sincronización de empresas vulnerable a sobreescritura
- **Archivo**: `App.jsx` syncCompanies, `syncManager.js`
- **Mecanismo**: `siso_companies` se sincroniza con `_sync()` que puede reemplazar el array completo.
- **Estado**: ❌ Parcial. Hay merge por ID en algunos paths pero no en todos. El sync periódico de Supabase puede revertir.
- **Evidencia**: "si D1 tiene 33 empresas y el cliente local tiene 31, al escribir se hace MERGE" — esto solo aplica a `_writeArrayMergeD1`, no a todas las escrituras de `siso_companies`.

### V10 · IndexedDB puede ser limpiada por el navegador sin aviso
- **Archivo**: `offlineDB.js`
- **Mecanismo**: Navegadores (especialmente Safari/iOS) limpian IndexedDB después de 7 días de inactividad o bajo presión de almacenamiento. `siso_offline_db` contiene el espejo COMPLETO de datos con firmas.
- **Estado**: ❌ No hay mecanismo de detección ni recuperación automática si IndexedDB se pierde. Se depende de D1/Supabase para reconstruir, pero la firma del médico NO está en Supabase (es muy grande).
- **Impacto**: Si IndexedDB se limpia y D1 está caído → pérdida total de la sesión offline.

## VECTORES ALTOS (🟡 — pueden causar inconsistencia o pérdida parcial)

### V11 · Merge _mergeCloudLocalById no maneja eliminaciones
- El merge siempre PRESERVA items remotos que no están en local. Esto es correcto para prevenir pérdida, pero significa que items borrados legítimamente pueden "resucitar" desde D1.
- **Workaround**: `_deleteBillSafe()` y `_deleteReportSafe()` borran directamente en D1, pero si falla la escritura de borrado, el item revive en el próximo merge.

### V12 · Autosave puede restaurar estado inconsistente
- `siso_active_form` y `siso_autosave_{id}` guardan el estado del formulario actual. Si el usuario cierra y reabre, el autosave restaura. Pero si mientras tanto otro dispositivo modificó el paciente, el autosave pisa con datos viejos.

### V13 · Service Worker cachea respuestas de API (potencial)
- `sw.js` NO cachea APIs (Network Only para DATA_HOSTS). Pero si alguien modifica el SW para cachear, se servirá data stale.
- **Estado**: ✅ Correcto actualmente. Pero ⚠️ las URLs de API deben mantenerse en la lista de exclusión.

### V14 · Purgado de D1 pendientes "viejos" (>24h)
- `_purgeStaleD1Writes()` limpia entradas de `siso_pending_d1_writes` más viejas de 24h.
- Si el worker estuvo caído 25h, todos los datos pendientes se pierden al purgar.

### V15 · Doble escritura D1 (user-key + cloud-key) puede divergir
- `_syncPatients` escribe a DOS claves D1: `siso_db_patients_{uid}` y `siso_db_patients_empresa_{empresaId}`. Si una escritura falla y la otra no, quedan divergentes.

### V16 · Cifrado AES-GCM: pérdida de clave = pérdida de datos
- Las API keys de IA se cifran con AES-GCM usando `siso_enc_key` en sessionStorage. Si la clave se regenera (nueva sesión, cambio de dispositivo), los datos cifrados viejos son irrecuperables.

### V17 · Supabase backup no verifica integridad
- `_sbSet()` es fire-and-forget. No hay verificación de que el dato llegó íntegro a Supabase. Si Supabase trunca un JSON grande, no se detecta.

### V18 · siso_audit_log capped a 1000 entradas
- Las entradas más viejas se eliminan silenciosamente. Si se necesita trazabilidad completa (Res 1888/2025), se pierde historia.

## VECTORES MEDIOS (⚠️ — riesgo moderado)

### V19 · _memStore no tiene límite de tamaño
- Si localStorage está lleno y se sigue guardando en `_memStore`, consume RAM ilimitada hasta que la pestaña crashea.

### V20 · No hay checksum/hash de integridad en localStorage
- Un bit flip en disco (corrupción de archivo SQLite de localStorage) puede pasar desapercibido hasta que `JSON.parse` falle. No hay verificación de integridad proactiva.

### V21 · Competencia entre pestañas por el "ownership" de los datos
- Múltiples pestañas abiertas de la app compiten por escribir a D1. El CANDADO ANTI-ENCOGIMIENTO ayuda pero no cubre todas las claves.

### V22 · Migraciones D1 ↔ Supabase sin bloqueo
- Los scripts en `/scripts/` migran datos sin locking. Si la app está corriendo mientras se ejecuta `compare-d1-supabase.mjs`, puede haber escrituras intercaladas que causen inconsistencia.

### V23 · No hay backup automático programado
- El snapshot del worker es manual (`POST /snapshot`). No hay backup automático diario de D1. Si D1 se corrompe, solo se puede recuperar de Supabase (que puede estar desactualizado).

---

# PARTE V: PROTOCOLO DE DIAGNÓSTICO DE FUGAS ACTIVAS

## Paso 1: Verificar el marcador "HCs sin respaldo"

Ejecutar en consola del navegador (estando logueado en la app):
```javascript
// Verificar estado actual
const unsynced = JSON.parse(localStorage.getItem('siso_hc_sin_respaldo') || '{}');
console.table(unsynced);
// Si algún valor es true, hay datos sin respaldar en la nube.
```

## Paso 2: Auditar la cola de escrituras D1 pendientes

```javascript
const pending = JSON.parse(localStorage.getItem('siso_pending_d1_writes') || '{}');
const keys = Object.keys(pending);
console.log(`Entradas pendientes: ${keys.length}`);
keys.forEach(k => {
  const entry = pending[k];
  console.log(`${k}: ${entry.retries || 0} reintentos, ${JSON.stringify(entry.value).length} bytes, ts=${new Date(entry.ts).toISOString()}`);
});
// Si hay entradas con retries > 18, están a punto de ser descartadas.
```

## Paso 3: Comparar localStorage vs IndexedDB vs D1

```javascript
// Para pacientes del usuario actual:
const uid = JSON.parse(localStorage.getItem('siso_session') || '{}').user || 'drcucalon';
const key = `siso_db_patients_${uid}`;

// 1. localStorage
const lsData = JSON.parse(localStorage.getItem(key) || '[]');
console.log(`localStorage: ${lsData.length} pacientes`);

// 2. IndexedDB
const idbReq = indexedDB.open('siso_offline_db', 1);
idbReq.onsuccess = (e) => {
  const tx = e.target.result.transaction('kv_store', 'readonly');
  const req = tx.objectStore('kv_store').get(key);
  req.onsuccess = () => {
    const idbData = req.result?.value || [];
    console.log(`IndexedDB: ${Array.isArray(idbData) ? idbData.length : 'no-array'} pacientes`);
    // Comparar IDs
    const lsIds = new Set(lsData.map(p => p.id).filter(Boolean));
    const idbIds = new Set((Array.isArray(idbData) ? idbData : []).map(p => p.id).filter(Boolean));
    const soloLS = [...lsIds].filter(id => !idbIds.has(id));
    const soloIDB = [...idbIds].filter(id => !lsIds.has(id));
    if (soloLS.length) console.warn(`⚠️ ${soloLS.length} pacientes SOLO en localStorage (no en IDB)`);
    if (soloIDB.length) console.warn(`⚠️ ${soloIDB.length} pacientes SOLO en IndexedDB (no en LS)`);
  };
};

// 3. D1 (requiere token)
const workerUrl = localStorage.getItem('siso_worker_url_cache');
const token = localStorage.getItem('siso_worker_token_cache');
if (workerUrl && token) {
  fetch(`${workerUrl}/store/${encodeURIComponent(key)}`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  .then(r => r.json())
  .then(d1Data => {
    const d1List = d1Data?.value || [];
    console.log(`D1: ${Array.isArray(d1List) ? d1List.length : typeof d1List} pacientes`);
    const d1Ids = new Set((Array.isArray(d1List) ? d1List : []).map(p => p.id).filter(Boolean));
    const soloD1 = [...d1Ids].filter(id => !lsIds.has(id));
    if (soloD1.length) console.warn(`🟡 ${soloD1.length} pacientes SOLO en D1 (no en localStorage) — posible fuga revertida`);
  });
}
```

## Paso 4: Verificar divergencia D1 vs Supabase

Usar el script existente (requiere Node.js con acceso a ambas APIs):
```bash
node scripts/compare-d1-supabase.mjs
```
Este script compara TODAS las claves entre D1 y Supabase y reporta divergencias.

## Paso 5: Auditar cuota de localStorage

```javascript
let totalBytes = 0;
const sizes = {};
for (let i = 0; i < localStorage.length; i++) {
  const k = localStorage.key(i);
  const v = localStorage.getItem(k) || '';
  sizes[k] = v.length;
  totalBytes += v.length;
}
const limitMB = 5; // ~5MB típico
const usedMB = (totalBytes / (1024 * 1024)).toFixed(2);
console.log(`Total usado: ${usedMB}MB / ~${limitMB}MB (${((totalBytes / (1024 * 1024 * limitMB)) * 100).toFixed(1)}%)`);

// Top 10 claves más pesadas:
const sorted = Object.entries(sizes).sort((a, b) => b[1] - a[1]).slice(0, 10);
console.table(sorted.map(([k, v]) => ({ clave: k, size_kb: (v / 1024).toFixed(1) })));
```

## Paso 6: Detectar "pacientes huérfanos" (en D1 pero no en localStorage de NADIE)

```javascript
// Recolectar TODOS los IDs de pacientes en localStorage
const allLocalIds = new Set();
for (let i = 0; i < localStorage.length; i++) {
  const k = localStorage.key(i);
  if (k.startsWith('siso_db_patients_')) {
    try {
      const arr = JSON.parse(localStorage.getItem(k) || '[]');
      arr.forEach(p => { if (p?.id) allLocalIds.add(p.id); });
    } catch {}
  }
}

// Luego comparar con D1 (requiere acceso al worker):
fetch(`${workerUrl}/store/prefix/siso_db_patients_`, {
  headers: { 'Authorization': `Bearer ${token}` }
})
.then(r => r.json())
.then(data => {
  const d1Keys = data.keys || [];
  const d1AllIds = new Set();
  let promises = d1Keys.map(k =>
    fetch(`${workerUrl}/store/${encodeURIComponent(k)}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    }).then(r => r.json())
    .then(d => {
      const arr = d?.value || [];
      arr.forEach(p => { if (p?.id) d1AllIds.add(p.id); });
    })
  );
  Promise.all(promises).then(() => {
    const huerfanos = [...d1AllIds].filter(id => !allLocalIds.has(id));
    if (huerfanos.length) {
      console.warn(`🔴 ${huerfanos.length} PACIENTES HUÉRFANOS en D1 (no están en ningún localStorage):`, huerfanos);
    } else {
      console.log('✅ No hay pacientes huérfanos');
    }
  });
});
```

## Paso 7: Protocolo de recuperación si se detecta fuga

1. **STOP**: No hacer más guardados desde ninguna pestaña.
2. **SNAPSHOT**: Ejecutar `POST /snapshot` en el worker para backup inmediato de D1.
3. **COMPARAR**: Ejecutar `compare-d1-supabase.mjs` para ver divergencia.
4. **RECUPERAR**: Si D1 tiene datos que localStorage perdió → forzar merge:
   ```javascript
   // Para cada clave con fuga:
   const d1Data = await _workerGet(key);
   const localData = JSON.parse(localStorage.getItem(key) || '[]');
   const merged = [...localData, ...d1Data.filter(d => !localData.find(l => l.id === d.id))];
   localStorage.setItem(key, JSON.stringify(merged));
   await _workerSet(key, merged); // Sincronizar D1 también
   ```
5. **VERIFICAR**: Volver a ejecutar Paso 3 para confirmar consistencia.
6. **LIBERAR**: Limpiar `siso_hc_sin_respaldo` y continuar operación normal.

---

# PARTE VI: AGENTES NECESARIOS PARA LA AUDITORÍA CONTINUA

## Agente 1: `storage-integrity-checker`
**Propósito**: Verificar integridad de datos entre las 3 capas (localStorage ↔ IndexedDB ↔ D1 ↔ Supabase)
**Ejecución**: Al arranque de la app + cada 30 minutos
**Acciones**:
1. Para cada clave crítica (pacientes, empresas, facturas, propuestas):
   - Leer localStorage
   - Leer IndexedDB
   - Leer D1 (si hay token)
   - Comparar counts y checksums
2. Si divergencia > umbral → alertar al usuario con badge "⚠️ Datos inconsistentes"
3. Registrar en `siso_error_log`

## Agente 2: `quota-monitor`
**Propósito**: Prevenir QuotaExceededError ANTES de que ocurra
**Ejecución**: Cada 5 minutos + antes de cada escritura grande
**Acciones**:
1. Calcular uso actual de localStorage (bytes totales)
2. Si > 80% de cuota estimada (4MB de 5MB):
   - Podar `siso_autosave_*` viejos (> 7 días)
   - Comprimir pacientes (ya se hace con `_stripFirmaLS`)
   - Alertar: "Almacenamiento local casi lleno. Cierre otras pestañas."
3. Si > 95%: bloquear nuevas escrituras y forzar sync a D1

## Agente 3: `d1-pending-flusher`
**Propósito**: Garantizar que la cola `siso_pending_d1_writes` se vacíe
**Ejecución**: Cada 60 segundos mientras la app está abierta
**Acciones**:
1. Leer `siso_pending_d1_writes`
2. Para cada entrada con retries < 20:
   - Intentar `_workerSet(key, value)`
   - Si éxito → eliminar de la cola
   - Si fallo → incrementar retries
3. Si entrada tiene retries >= 20 y < 24h de antigüedad:
   - Intentar con chunked upload (`/store/chunked`)
   - Si aún falla → notificar al usuario con el contenido para copia manual
4. Si entrada > 24h → mover a `siso_failed_d1_writes_permanent` (no purgar sin avisar)

## Agente 4: `merge-guardian`
**Propósito**: Extender el CANDADO ANTI-ENCOGIMIENTO a TODAS las claves de array
**Ejecución**: Hook en cada escritura D1 de arrays
**Claves a proteger**: `siso_companies`, `siso_users`, `siso_encuestas`, `siso_atenciones_*`, `siso_informes`, `siso_cartas_custodia`, `siso_portafolio`, `siso_cotizaciones`, `siso_habeas_requests`, `siso_teleconsultas`

## Agente 5: `signature-guardian`
**Propósito**: Proteger la integridad de la firma del médico
**Ejecución**: Al guardar `siso_doctor_signature` + verificación semanal
**Acciones**:
1. Al escribir `siso_doctor_signature` en localStorage, también guardar copia en IndexedDB y D1
2. Verificar hash SHA-256 de la firma cada 7 días
3. Si hash no coincide → restaurar desde respaldo

---

# PARTE VII: CHECKLIST DE REMEDIACIÓN INMEDIATA

- [ ] **ACCION-1**: Extender `_writeArrayMergeD1` a `siso_companies`, `siso_users`, `siso_encuestas` (protección anti-encogimiento)
- [ ] **ACCION-2**: Implementar Agente 3 (`d1-pending-flusher`) con timer de 60s
- [ ] **ACCION-3**: Implementar Agente 2 (`quota-monitor`) antes de cada escritura grande
- [ ] **ACCION-4**: Agregar hash SHA-256 a objetos guardados en localStorage para detectar corrupción silenciosa
- [ ] **ACCION-5**: Agregar `_memStore` a IndexedDB como respaldo (no solo RAM)
- [ ] **ACCION-6**: SNAPSHOT diario automático desde el worker (cron trigger)
- [ ] **ACCION-7**: Verificar que `compare-d1-supabase.mjs` se ejecute semanalmente
- [ ] **ACCION-8**: Agregar test end-to-end: simular QuotaExceededError y verificar que no hay pérdida
- [ ] **ACCION-9**: Agregar test end-to-end: simular múltiples pestañas guardando pacientes simultáneamente
- [ ] **ACCION-10**: Documentar en MEMORY.md el estado actual de cada vector

---

# PARTE VIII: DIAGRAMA DE SANGRADO (DATA BLEED MAP)

```
Usuario guarda ─────────────────────────────────────────────────────────┐
                                                                         │
  ┌──────────────────────────────────────────────────────────────────┐   │
  │                    PUNTOS DE FUGA CONOCIDOS                       │   │
  │                                                                   │   │
  │  [1] QuotaExceeded ──► _memStore (RAM) ──► ❌ PIERDE al cerrar   │   │
  │                                                                   │   │
  │  [2] _syncPatients ─► D1 escribe OK pero _sbSet falla            │   │
  │      └─ Supabase desactualizado ─► sync reverso pisa datos       │   │
  │                                                                   │   │
  │  [3] Cola pending_d1_writes ─► reintentos agotados ─► ❌ DESCARTE│   │
  │                                                                   │   │
  │  [4] IndexedDB limpia (Safari 7d) ─► pierde copia COMPLETA       │   │
  │      └─ D1 caído al mismo tiempo ─► ❌ SIN RECUPERACIÓN          │   │
  │                                                                   │   │
  │  [5] Pestaña B (estado viejo) guarda ─► pisa D1 ─► ❌ PIERDE     │   │
  │      └─ Mitigado en pacientes/facturas/propuestas                │   │
  │      └─ NO mitigado en empresas/usuarios/encuestas/etc           │   │
  │                                                                   │   │
  │  [6] Borrado de item en D1 falla ─► revive en próximo merge     │   │
  │                                                                   │   │
  │  [7] siso_doctor_signature corrupta ─► certificados sin firma    │   │
  │                                                                   │   │
  │  [8] Doble escritura D1 diverge (user-key ≠ cloud-key)           │   │
  │                                                                   │   │
  │  [9] siso_audit_log capped ─► pierde entradas viejas             │   │
  │                                                                   │   │
  └──────────────────────────────────────────────────────────────────┘   │
                                                                         │
  ┌──────────────────────────────────────────────────────────────────┐   │
  │               FLUJO NORMAL (sin fuga)                             │   │
  │                                                                   │   │
  │  setState ─► localStorage ─► IndexedDB ─► D1 ─► Supabase         │   │
  │     │             │               │          │         │           │   │
  │     │             └─ inmediato    └─ async   └─ async  └─ async   │   │
  │     │                                                             │   │
  │     └─ Si D1 falla ─► cola pending ─► reintento en próximo save  │   │
  │                                                                   │   │
  └──────────────────────────────────────────────────────────────────┘   │
```

---

*Documento generado el 13 de Julio 2026, 08:49 AM (UTC-4:00)*
*Hash del commit actual: 868d235 (post-merge)*
*Próximo paso: ejecutar protocolo de diagnóstico Paso 1-7 en producción*