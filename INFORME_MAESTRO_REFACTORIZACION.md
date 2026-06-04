# 📑 INFORME MAESTRO DE ESTADO Y PLAN DE EJECUCIÓN FINAL
**Documento Base para Refactorización Quirúrgica al 100%**

**Fecha:** 05 de Junio, 2026  
**Estado del Proyecto:** Fase de Consolidación Crítica  
**Cobertura Actual Estimada:** ~88.5%  
**Objetivo Inmediato:** Alcanzar 100% de paridad funcional con el monolito base.

---

## 🛡️ PROTOCOLO DE SEGURIDAD OPERATIVA (MANDATORIO)

Para garantizar la integridad del código y evitar redundancias, se establece el siguiente protocolo estricto antes de cualquier intervención:

1.  **Auditoría Pre-Ejecución:** Antes de escribir/modificar cualquier archivo, se debe leer su contenido actual y compararlo mentalmente con el requerimiento del monolito.
2.  **Verificación de Dependencias:** Confirmar que las funciones utilitarias (`bulkDownload`, `pdfGeneration`, `sync`) existen antes de llamarlas en los componentes.
3.  **No Sobreescritura Destructiva:** Si un módulo ya fue migrado (ej. Vacunación), solo se realizan *patches* si hay errores, nunca reescrituras totales.
4.  **Validación de Build:** Cada cambio mayor debe compilar sin errores (`npm run build`).
5.  **Trazabilidad:** Cada función migrada debe referenciar su origen en el monolito (rango de líneas aproximado).
6.  **Evaluación Continua:** Siempre evaluar todo lo que se lleva para no repetir los mismos pasos y poder lograr el 100% de toda la refactorización quirúrgica y forense ya establecida.

---

## 🔍 DIAGNÓSTICO FORENSE ACTUALIZADO

### 1. ✅ MÓDULOS COMPLETADOS Y ESTABLES (NO TOCAR SALVO BUGS)
Estos módulos han superado la fase de implementación y construcción exitosa.

| Módulo | Archivo(s) Clave | Estado | Observaciones |
|--------|------------------|--------|---------------|
| **Core App** | `App.jsx` | ✅ 100% | Wrapper ligero funcional. |
| **Dashboard** | `DashboardPage.jsx` | ✅ 100% | Métricas y gráficos operativos. |
| **Agenda** | `AgendaPage.jsx` | ✅ 100% | Calendario y gestión de citas. |
| **Empresas** | `Companies.jsx` | ✅ 100% | CRUD completo de empresas. |
| **Usuarios** | `Users` modules | ✅ 100% | Gestión de roles y accesos. |
| **Caja/Billing** | `Caja.jsx`, `Bill.jsx` | ✅ 100% | Movimientos financieros OK. |
| **Carta Custodia** | `CartaCustodiaPage.jsx` | ✅ 100% | Generación de documentos legal. |
| **ARL** | `ARLPage.jsx` | ✅ 100% | Reportes de accidentes. |
| **SGSST** | `SGSSTPage.jsx` | ✅ 100% | Análisis documental empresas. |
| **Vacunación** | `VaccinationSchedule.jsx` | ✅ 100% | Integrado en HC. |
| **Revisión Sistemas** | `SystemsReview.jsx` | ✅ 100% | Integrado en HC. |
| **Maniobras Orto.** | `OrthopedicManeuvers.jsx` | ✅ 100% | Integrado en HC. |
| **Utilidades Base** | `security.js`, `storage.js` | ✅ 100% | Funcionales. |

### 2. ⚠️ MÓDULOS CRÍTICOS PENDIENTES (PRIORIDAD ROJA)
Estos son los bloqueantes principales para el despliegue final. Requieren intervención quirúrgica inmediata.

#### A. Portal del Trabajador (`WorkerPortal.jsx`)
*   **Estado Actual:** UI básica implementada (~40%).
*   **Brecha Crítica:** Faltan las funciones "pesadas" del monolito (líneas 35,964 - 51,950).
*   **Lo que falta implementar:**
    1.  Lógica de búsqueda avanzada por múltiple HC (mismo documento, diferentes empresas/fechas).
    2.  **Generación de PDF in-browser** para certificados individuales (usando `html2canvas` + `jsPDF`).
    3.  Visualización detallada de: Derivaciones, Fórmulas Médicas y Exámenes Paraclínicos adjuntos.
    4.  Historial completo cronológico.
    5.  Generación de QR dinámico para compartir enlace directo a la evaluación.

#### B. Portal de la Empresa (`CompanyPortal.jsx`)
*   **Estado Actual:** Esqueleto y búsqueda básica (~30%).
*   **Brecha Crítica:** Falta la lógica masiva del monolito (líneas 51,951 - 54,460).
*   **Lo que falta implementar:**
    1.  **Descarga ZIP Masiva:** Empaquetado de múltiples PDFs (certificados, exámenes) usando `JSZip`.
    2.  Autenticación robusta por NIT/Código Empresa.
    3.  Panel de administración de usuarios de la empresa (médicos/secretarias autorizadas).
    4.  Estados de cuenta consolidados por empresa.
    5.  Filtros avanzados por fecha, cargo, estado de aptitud.

#### C. Utilidades de Infraestructura (Archivos Fantasma)
Estos archivos fueron identificados en el análisis forense como **NO EXISTENTES** en el refactorizado, pero son vitales para la operación offline y seguridad.
*   ❌ `offlineDB.js`: Gestión de IndexedDB para trabajo sin conexión.
*   ❌ `syncManager.js`: Lógica de sincronización bidireccional (Local <-> Supabase).
*   ❌ `totp.js`: Generación y validación de códigos 2FA.
*   ❌ `connectionStatus.jsx`: Componente UI para indicar estado de red.
*   ❌ `bulkDownload.js`: Helpers específicos para descargas masivas (si no se integra directo en el componente).

### 3. 🟡 MÓDULOS CON BRECHAS PARCIALES (PRIORIDAD AMARILLA)

#### Historia Clínica Ocupacional (`OccupationalHC.jsx`)
*   **Cobertura:** ~92%.
*   **Faltante:**
    *   Módulo completo de **Audiometría** (gráficos interactivos de tonos).
    *   Módulo de **Espirometría** (curvas flujo-volumen).
    *   Detalle fino de Paraclínicos (visualización de resultados numéricos vs referenciales).
    *   Integración total del certificado de aptitud con firmas digitales.

#### Historia Clínica General (`GeneralHC.jsx`)
*   **Cobertura:** ~85%.
*   **Faltante:** Antecedentes heredo-familiares completos y algunos sistemas del examen físico menos comunes.

---

## 🗺️ PLAN DE ACCIÓN PARA EL 100% (RUTA CRÍTICA)

Para llegar al 100% sin dañar lo existente, seguiremos este orden estricto:

### PASO 1: CIMIENTOS (Utilidades Faltantes)
*Sin esto, los portales y la sincronización fallarán.*
1.  Crear `src/utils/offlineDB.js` (Schema IndexedDB).
2.  Crear `src/utils/syncManager.js` (Lógica de colas y sync).
3.  Crear `src/utils/totp.js` (Seguridad 2FA).
4.  Crear `src/components/ui/ConnectionStatus.jsx`.

### PASO 2: PORTAL TRABAJADOR (Funcionalidad Completa)
*Expansión quirúrgica de `WorkerPortal.jsx`.*
1.  Inyectar lógica de búsqueda multi-HC.
2.  Implementar renderizado de tarjetas para Derivaciones/Fórmulas/Exámenes.
3.  Codificar función `generateCertificatePDF(id)` usando librerías instaladas.
4.  Implementar vista de historial.

### PASO 3: PORTAL EMPRESA (Funcionalidad Masiva)
*Expansión quirúrgica de `CompanyPortal.jsx`.*
1.  Implementar autenticación de empresa.
2.  Codificar función `downloadBulkZIP(companyId, filters)` usando `JSZip`.
3.  Crear vista de "Mis Trabajadores" con tabla avanzada.
4.  Implementar módulo de Estados de Cuenta.

### PASO 4: COMPLEMENTOS CLÍNICOS
1.  Integrar componente `AudiometryModule.jsx` en `OccupationalHC`.
2.  Integrar componente `SpirometryModule.jsx` en `OccupationalHC`.
3.  Revisión final de flujos de firma y cierre de HC.

### PASO 5: VALIDACIÓN FINAL Y DESPLIEGUE
1.  Ejecutar `npm run build` y verificar 0 errores.
2.  Prueba de humo: Login -> Agenda -> HC -> Portal Trabajador -> Portal Empresa.
3.  Despliegue del artefacto final.

---

## 📋 CHECKLIST DE VERIFICACIÓN PRE-CÓDIGO

Antes de generar el próximo bloque de código, confirmaré:
- [ ] ¿El archivo destino existe?
- [ ] ¿Qué funciones específicas del monolito faltan en ese archivo?
- [ ] ¿Las dependencias (librerías/utilidades) están instaladas/creadas?
- [ ] ¿Esta acción sobrescribe algo funcional? (Si es sí, detener y refinar).
- [ ] ¿He evaluado todo lo que se ha realizado hasta ahora para evitar repeticiones?

---

## 📝 HISTORIAL DE CAMBIOS RECIENTES

- **2026-06-05:** Creación de este Informe Maestro.
- **2026-06-05:** Completada Fase de Vacunación, Revisión por Sistemas y Maniobras Ortopédicas.
- **2026-06-05:** Verificado estado de Portales (Trabajador/Empresa) como parcialmente implementados.
- **Próximo Paso Inmediato:** Ejecución del PASO 1 (Creación de Utilidades Críticas).

---

**Nota:** Este documento debe ser consultado antes de cada sesión de codificación para asegurar la continuidad y coherencia del proyecto.
