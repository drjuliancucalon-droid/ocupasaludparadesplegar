# ANÁLISIS FORENSE DE REFACTORIZACIÓN - OCUPASALUD
## Comparación Monolito Base vs Siso Refactorizado

### 1. RESUMEN EJECUTIVO

**Monolito Base (ocupasaludparadesplegar):**
- App.jsx: 57,901 líneas (archivo monolítico)
- 61 archivos JS/JSX totales
- Arquitectura: Single-file application con renders embebidos

**Siso Refactorizado (siso-appultimo):**
- App.jsx: 209 líneas (wrapper ligero)
- 244 archivos JS/JSX totales
- Arquitectura: Modular por features/módulos

---

### 2. INVENTARIO DE FUNCIONES DEL MONOLITO

#### 2.1 Páginas/Vistas Principales (render functions en App.jsx)

| # | Función render | Línea inicio | Línea fin | Estado en refactorizado | Prioridad |
|---|---------------|--------------|-----------|------------------------|-----------|
| 1 | renderDashboard | 24,175 | ~25,548 | ✅ DashboardPage.jsx | CRÍTICA |
| 2 | renderHistoriaOcupacional | 25,549 | ~27,836 | ⚠️ HistoriaOcupacional.jsx (sections) | CRÍTICA |
| 3 | renderHistoriaGeneral | 27,837 | ~29,558 | ⚠️ HistoriaGeneralPage.jsx | CRÍTICA |
| 4 | renderReporte | 29,559 | ~32,235 | ⚠️ ReportsPage.jsx | CRÍTICA |
| 5 | renderCompanies | 32,236 | ~34,814 | ✅ CompaniesPage.jsx | CRÍTICA |
| 6 | renderBill | 34,815 | ~38,899 | ⚠️ BillingPage.jsx | CRÍTICA |
| 7 | renderUsers | 38,900 | ~41,771 | ✅ UsersPage.jsx | CRÍTICA |
| 8 | renderPlanes | 41,772 | ~44,826 | ✅ PlanesPage.jsx | CRÍTICA |
| 9 | renderAgenda | 44,827 | ~48,016 | ✅ AgendaPage.jsx | CRÍTICA |
| 10 | renderContabilidad | 48,017 | ~49,086 | ⚠️ ContabilidadPage.jsx | ALTA |
| 11 | renderCaja | 49,087 | ~54,460 | ✅ CajaPage.jsx | ALTA |
| 12 | renderCartaCustodia | 54,461 | ~54,563 | ✅ CartaCustodiaPage.jsx | ALTA |
| 13 | renderPortalTrabajador | 35,964 | ~51,950 | ⚠️ WorkerPortal.jsx (incompleto) | CRÍTICA |
| 14 | renderPortalEmpresa | 51,951 | ~54,460 | ⚠️ PortalEmpresaPage.jsx (incompleto) | CRÍTICA |
| 15 | AnalisisDocsEmpresas | Componente externo | - | ❌ NO MIGRADO | MEDIA |

#### 2.2 Componentes Especializados

| Componente | Archivo monolito | Descripción | Estado refactorizado |
|------------|-----------------|-------------|---------------------|
| CartaCustodia | src/pages/CartaCustodia.jsx (26KB) | Generación PDF custodia | ✅ Migrado parcialmente |
| AnalisisDocsEmpresas | src/pages/AnalisisDocsEmpresas.jsx (27KB) | Análisis documentos empresa | ❌ NO MIGRADO |
| ContabilidadV2 | src/pages/ContabilidadV2.jsx (79KB) | Módulo contabilidad avanzado | ⚠️ Parcialmente migrado |
| PortalCertificadosEmpresa | En App.jsx | Portal certificados | ✅ PortalCertificadosEmpresa.jsx |

---

### 3. FUNCIONALIDADES CRÍTICAS POR VERIFICAR

#### 3.1 Módulo Historia Clínica (Líneas 25,549 - 29,558)

**Funciones específicas:**
- Examen ocupacional completo (anamnesis, signos vitales, exámenes físicos)
- Antecedentes médicos, familiares, quirúrgicos
- Sistema respiratorio, cardiovascular, digestivo, neurológico
- Esquema de vacunación
- Diagnósticos CIE-10/CIE-11
- Derivaciones e interconsultas
- Fórmula médica
- Certificados de aptitud

**Verificar en refactorizado:**
```bash
# Check módulos clínicos
ls -la src/modules/clinical/
cat src/pages/HistoriaPage.jsx
cat src/pages/HistoriaGeneralPage.jsx
cat src/sections/HistoriaOcupacional.jsx
```

#### 3.2 Módulo Reportes Epidemiológicos (Líneas 29,559 - 32,235)

**Funcionalidades:**
- Estadísticas por edad, sexo, cargo, empresa
- Gráficos epidemiológicos
- Exportación Excel/PDF
- Filtrado por fecha, empresa, tipo examen
- Indicadores de salud poblacional

#### 3.3 Módulo Facturación/Billing (Líneas 34,815 - 38,899)

**Funcionalidades:**
- Generación de cuentas por trabajador
- Cuentas por empresa
- Múltiples formas de pago
- Descuentos y ajustes
- Historial de pagos
- Exportación reportes financieros

#### 3.4 Módulo Contabilidad V2 (Líneas 48,017 - 49,086)

**Funcionalidades:**
- Libro fiscal
- Ingresos y gastos
- Centro de costos
- Cuentas contables
- Reportes contables
- Conciliaciones

#### 3.5 Módulo Caja Diaria (Líneas 49,087 - 54,460)

**Funcionalidades:**
- Apertura/cierre de caja
- Movimientos de ingreso/egreso
- Arqueo de caja
- Reportes diarios
- Múltiples cajas

#### 3.6 Portales Públicos

**Portal Trabajador (Líneas 35,964 - 51,950):**
- Búsqueda por código verificación
- Búsqueda por cédula
- Visualización certificado aptitud
- Descarga de documentos
- Multiples HC por cédula

**Portal Empresa (Líneas 51,951 - 54,460):**
- Acceso por NIT/código empresa
- Listado trabajadores evaluados
- Descarga masiva certificados
- Descarga ZIP documentos
- Estados de cuenta

---

### 4. UTILIDADES Y HELPERS

#### 4.1 En monolito (src/utils/)

| Archivo | Función | Estado refactorizado |
|---------|---------|---------------------|
| aiProviders.js | Proveedores IA | ? |
| bulkDownload.js | Descarga masiva | ? |
| doctorHelpers.js | Helpers médico | ? |
| formatters.js | Formateadores | ? |
| hashHelpers.js | Hash/verificación | ? |
| normativa.js | Normativa legal | ? |
| offlineDB.js | DB offline | ? |
| security.js | Seguridad | ? |
| storage.js | Storage wrapper | ? |
| supabase.js | Cliente Supabase | ? |
| syncManager.js | Sync manager | ? |
| totp.js | TOTP 2FA | ? |

#### 4.2 Hooks personalizados

| Hook | Función | Estado refactorizado |
|------|---------|---------------------|
| useAppState.js | Estado global | ? |
| useCompanyDocuments.js | Documentos empresa | ? |

---

### 5. DATA FILES

| Archivo | Contenido | Tamaño aproximado |
|---------|-----------|-------------------|
| catalogos.js | Catálogos médicos | ~50KB |
| cie10.jsx | Códigos CIE-10 | ~2MB |
| cie11.js | Códigos CIE-11 | ~2MB |
| cups.jsx | Códigos CUPS | ~500KB |
| medicamentos.js | Medicamentos | ~300KB |
| planConfig.js | Configuración planes | ~5KB |

---

### 6. ESTRATEGIA DE MIGRACIÓN

#### Fase 1: Auditoría Completa (Días 1-2)
1. Extraer cada render function del monolito
2. Comparar línea por línea con refactorizado
3. Identificar brechas funcionales
4. Documentar dependencias cruzadas

#### Fase 2: Migración Módulos Críticos (Días 3-7)
1. Historia Clínica completa
2. Reportes epidemiológicos
3. Facturación/Billing
4. Portales públicos

#### Fase 3: Migración Módulos Secundarios (Días 8-10)
1. Contabilidad V2
2. Caja avanzada
3. Utilidades
4. Pruebas integrales

#### Fase 4: Validación y Testing (Días 11-14)
1. Pruebas unitarias
2. Pruebas de integración
3. Pruebas E2E
4. Validación con datos reales

---

### 7. CHECKLIST DE VERIFICACIÓN

- [ ] Todas las páginas renderizan correctamente
- [ ] Historia clínica tiene todos los campos
- [ ] Reportes generan estadísticas correctas
- [ ] Facturación calcula valores exactos
- [ ] Portales públicos funcionan sin autenticación
- [ ] Descargas PDF/ZIP operativas
- [ ] Búsquedas y filtros responden
- [ ] Persistencia de datos funciona
- [ ] Seguridad implementada (RLS, sanitización)
- [ ] Timeout de sesión activo
- [ ] Rate limiting de login funcional

---

**Documento generado para análisis forense de refactorización**
**Fecha:** $(date)
**Analista:** AI Software Specialist (15+ años experiencia)
