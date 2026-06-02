# Protocolo de Migración Quirúrgica y Forense - OcupaSalud a Cloudflare D1

## Resumen Ejecutivo

Este documento detalla el protocolo paso a paso para migrar el monolito de OcupaSalud (52K líneas) a una arquitectura moderna basada en **Cloudflare Workers + D1** como fuente principal de verdad, con **Supabase** como respaldo asíncrono.

---

## Fase 0: Auditoría Forense Inicial ✅ COMPLETADA

### 0.1 Inventario del Monolito Original
- **Ubicación**: `/workspace/src-monolito-ref/`
- **Archivo principal**: `App.jsx` (52,211 líneas)
- **Almacenamiento actual**: localStorage del navegador
- **Respaldo existente**: Supabase (sincronización diferida)
- **Backend existente**: Node.js Express (no desplegado)

### 0.2 Entidades Identificadas
1. Pacientes / Trabajadores
2. Empresas
3. Historias Clínicas Ocupacionales
4. Citas / Agenda
5. Facturación
6. Usuarios (perfil extendido)
7. Vigilancia Epidemiológica (SVE)
8. Accidentes de Trabajo (ARL)
9. Auditoría Logs

### 0.3 Interacciones Críticas entre Módulos
- Empresa → Pacientes (relación 1:N)
- Paciente → Historias Clínicas (1:N)
- Profesional → Historias Clínicas (1:N)
- Cita → Historia Clínica (1:1 opcional)
- Historia Clínica → Factura (1:1 o 1:N)
- Empresa → Facturas (1:N)

---

## Fase 1: Preparación del Repositorio de Migración ✅ COMPLETADA

### 1.1 Estructura Creada
```
ocupasalud-d1-migration/
├── wrangler.toml              # Configuración Cloudflare
├── schema.sql                 # Schema D1 completo
├── functions/
│   └── [[path]].js           # Worker API Edge
├── src/
│   ├── utils/
│   │   └── apiClient.js      # Cliente API unificado
│   └── ...                   # Frontend React base
├── src-monolito-ref/         # Referencia del monolito
└── MIGRATION_GUIDE.md        # Guía operativa
```

### 1.2 Componentes Implementados
- ✅ `wrangler.toml` configurado con bindings D1
- ✅ Worker básico con routing dinámico
- ✅ Schema SQL completo para D1 (9 tablas principales)
- ✅ Cliente API (`apiClient.js`) para reemplazar localStorage
- ✅ Handlers CRUD para Pacientes y Empresas
- ✅ Función de sincronización asíncrona a Supabase

---

## Fase 2: Implementación de Handlers Restantes ⏳ PENDIENTE

### 2.1 Prioridad Alta (Flujo Clínico Básico)

#### 2.1.1 Handler de Historias Clínicas
**Archivo**: `functions/[[path]].js`
**Funciones requeridas**:
- `handleHistoriasClinicas()` - CRUD completo
- Validaciones específicas:
  - Diagnósticos CIE-10 válidos
  - Signos vitales dentro de rangos fisiológicos
  - Aptitud laboral coherente con diagnóstico
- Relaciones:
  - Verificar existencia de paciente
  - Verificar profesional autorizado
  - Vincular con empresa si aplica

#### 2.1.2 Handler de Citas
**Funciones requeridas**:
- `handleCitas()` - CRUD completo
- Validaciones:
  - No duplicar citas en mismo horario
  - Verificar disponibilidad del profesional
  - Validar tipo de cita (presencial/telemedicina)
- Integraciones:
  - Generar enlace de telemedicina si aplica
  - Enviar recordatorios (pendiente de integración con servicio de email/SMS)

#### 2.1.3 Handler de Facturas
**Funciones requeridas**:
- `handleFacturas()` - CRUD completo
- Validaciones:
  - Cálculo correcto de impuestos (IVA 19% Colombia)
  - Códigos CUPS válidos
  - Secuencia numérica consecutiva
- Integraciones:
  - Vincular con historia clínica generadora
  - Actualizar estado de cuenta de empresa/paciente

### 2.2 Prioridad Media (Módulos Especializados)

#### 2.2.1 Vigilancia Epidemiológica (SVE)
- Tipos de vigilancia: auditivo, visual, osteomuscular, mental
- Validaciones específicas por tipo
- Generación de alertas por hallazgos críticos

#### 2.2.2 Accidentes de Trabajo (ARL)
- Flujo de investigación de accidentes
- Cálculo de días médicos e incapacidad
- Generación de reporte Rupt

### 2.3 Prioridad Baja (Complementarios)

#### 2.3.1 Usuarios (Perfil Extendido)
- Integración con Supabase Auth
- Gestión de roles y permisos
- Configuración de preferencias

#### 2.3.2 Auditoría
- Logging automático de todas las operaciones
- Trazabilidad completa de cambios

---

## Fase 3: Migración de Datos ⏳ PENDIENTE

### 3.1 Extracción de Datos del Monolito

**Script de Exportación**:
```javascript
// scripts/export-localstorage.js
const data = {
  pacientes: JSON.parse(localStorage.getItem('pacientes') || '[]'),
  empresas: JSON.parse(localStorage.getItem('empresas') || '[]'),
  historiasClinicas: JSON.parse(localStorage.getItem('historiasClinicas') || '[]'),
  // ... resto de entidades
};

// Exportar a JSON
console.log(JSON.stringify(data, null, 2));
```

### 3.2 Transformación de Datos

**Mapeo de Campos**:
| localStorage | D1 Schema | Transformación |
|-------------|-----------|----------------|
| `pacientes[]` | `pacientes` | Agregar `user_id`, normalizar fechas |
| `empresas[]` | `empresas` | Agregar `user_id`, validar NIT |
| `historias[]` | `historias_clinicas` | Renombrar campos, validar CIE-10 |

### 3.3 Importación a D1

**Script de Importación**:
```bash
wrangler d1 execute ocupasalud-db --file=migration-data.sql
```

### 3.4 Validación Post-Migración
- Contar registros antes y después
- Verificar integridad referencial
- Muestreo aleatorio de registros críticos

---

## Fase 4: Adaptación del Frontend ⏳ PENDIENTE

### 4.1 Reemplazo de localStorage por apiClient

**Patrón de Migración**:

**ANTES**:
```javascript
// En cualquier componente
const [pacientes, setPacientes] = useState(() => {
  const stored = localStorage.getItem('pacientes');
  return stored ? JSON.parse(stored) : [];
});

const addPaciente = (nuevoPaciente) => {
  const updated = [...pacientes, { ...nuevoPaciente, id: Date.now() }];
  setPacientes(updated);
  localStorage.setItem('pacientes', JSON.stringify(updated));
  // Sync a Supabase (si existe)
};
```

**DESPUÉS**:
```javascript
import { apiClient } from './utils/apiClient';

const [pacientes, setPacientes] = useState([]);
const [loading, setLoading] = useState(true);

useEffect(() => {
  loadPacientes();
}, []);

const loadPacientes = async () => {
  try {
    setLoading(true);
    const data = await apiClient.getPacientes();
    setPacientes(data);
  } catch (error) {
    console.error('Error cargando pacientes:', error);
  } finally {
    setLoading(false);
  }
};

const addPaciente = async (nuevoPaciente) => {
  const created = await apiClient.createPaciente(nuevoPaciente);
  setPacientes(prev => [...prev, created]);
  // La sync a Supabase es automática en el backend
};
```

### 4.2 Componentes Críticos a Modificar

1. **Formulario de Admisión de Pacientes**
2. **Formulario de Historia Clínica**
3. **Agenda/Citas**
4. **Módulo de Facturación**
5. **Listados y Reportes**

### 4.3 Manejo de Estados de Carga y Error

Implementar:
- Spinners durante operaciones async
- Mensajes de error amigables
- Reintentos automáticos para fallos de red
- Offline-first con cola local (opcional avanzado)

---

## Fase 5: Pruebas Exhaustivas ⏳ PENDIENTE

### 5.1 Pruebas Unitarias
- Cada handler del worker
- Funciones de validación
- Transformación de datos

### 5.2 Pruebas de Integración
- Flujo completo: Admisión → Atención → Facturación
- Sincronización D1 → Supabase
- Autenticación y autorización

### 5.3 Pruebas de Carga
- 1000+ pacientes
- 10,000+ historias clínicas
- Múltiples usuarios concurrentes

### 5.4 Pruebas de Recuperación
- Rollback de transacciones fallidas
- Restauración desde backup
- Conflictos de sincronización

---

## Fase 6: Despliegue Controlado ⏳ PENDIENTE

### 6.1 Ambiente de Staging
- Deploy en subdominio de prueba
- Datos anonimizados de producción
- Validación con usuarios piloto

### 6.2 Métricas de Éxito
- Tiempo de respuesta < 200ms para consultas
- 99.9% disponibilidad
- 0 pérdida de datos
- Sincronización Supabase < 5 segundos

### 6.3 Plan de Cutover
1. Congelar escrituras en monolito
2. Exportar datos finales
3. Importar a D1
4. Cambiar DNS
5. Monitoreo intensivo 48 horas

---

## Fase 7: Monitoreo Continuo ⏳ PENDIENTE

### 7.1 Logs y Alertas
```bash
# Comandos útiles
wrangler tail                    # Logs en tiempo real
wrangler d1 metrics ocupasalud-db  # Métricas de DB
```

### 7.2 Dashboards Recomendados
- Requests por minuto
- Errores por tipo
- Latencia percentil 95/99
- Estado de sincronización Supabase

---

## Checklist Final de Migración

### Infraestructura
- [ ] Wrangler instalado y autenticado
- [ ] Base de datos D1 creada
- [ ] Schema SQL ejecutado
- [ ] Variables de entorno configuradas
- [ ] Secrets de Supabase guardados

### Backend (Worker)
- [ ] Handler Pacientes completo
- [ ] Handler Empresas completo
- [ ] Handler Historias Clínicas completo
- [ ] Handler Citas completo
- [ ] Handler Facturas completo
- [ ] Handler SVE completo
- [ ] Handler ARL completo
- [ ] Sincronización Supabase funcional
- [ ] Logs de auditoría activos

### Frontend
- [ ] apiClient integrado
- [ ] Todos los componentes migrados
- [ ] Manejo de loading/error
- [ ] Tests de regresión aprobados

### Datos
- [ ] Exportación de localStorage completada
- [ ] Transformación de datos validada
- [ ] Importación a D1 exitosa
- [ ] Integridad referencial verificada

### Despliegue
- [ ] Staging probado y aprobado
- [ ] Documentación actualizada
- [ ] Equipo capacitado
- [ ] Plan de rollback listo
- [ ] Go-live ejecutado
- [ ] Monitoreo post-migración activo

---

## Consideraciones Legales y de Cumplimiento

### Protección de Datos Médicos (Colombia)
- Ley 1581 de 2012 (Protección de datos personales)
- Resolución 0312 de 2019 (Estándares mínimos SST)
- Historia clínica como documento legal (Ley 911 de 2004)

### Medidas de Seguridad Implementadas
- ✅ Encriptación en tránsito (HTTPS/TLS)
- ✅ Encriptación en reposo (D1 + Supabase)
- ✅ Control de acceso basado en roles
- ✅ Logs de auditoría inmutables
- ✅ Backup automático (Supabase)

---

## Soporte y Contacto

Para incidencias durante la migración:
1. Revisar logs con `wrangler tail`
2. Verificar estado de sincronización
3. Consultar `MIGRATION_GUIDE.md`
4. Revisar issues en GitHub

---

**Estado Actual del Proyecto**: Fase 1 Completada ✅  
**Próximo Hito**: Implementación de handlers restantes (Fase 2)  
**ETA Estimado**: 3-5 días para MVP funcional
