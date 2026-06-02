# Guía de Migración a Cloudflare D1 + Workers

## Arquitectura Objetivo

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────┐
│   Frontend  │────▶│ Cloudflare Worker│────▶│   D1 (DB)   │
│   (React)   │     │   (API Edge)     │     │  (Primary)  │
└─────────────┘     └──────────────────┘     └─────────────┘
                           │
                           │ (async)
                           ▼
                    ┌─────────────┐
                    │  Supabase   │
                    │  (Backup)   │
                    └─────────────┘
```

## Prerrequisitos

1. **Cloudflare Account**: Necesitas una cuenta en Cloudflare (gratis o paid)
2. **Wrangler CLI**: Herramienta de línea de comandos de Cloudflare
3. **Node.js**: Versión 18+ recomendada
4. **Supabase Account**: Para configurar el respaldo

## Paso 1: Instalación de Dependencias

```bash
cd ocupasalud-d1-migration

# Instalar Wrangler globalmente
npm install -g wrangler

# O instalar localmente
npm install --save-dev wrangler

# Verificar instalación
wrangler --version
```

## Paso 2: Autenticación con Cloudflare

```bash
wrangler login
```

Esto abrirá el navegador para autenticarte con tu cuenta de Cloudflare.

## Paso 3: Crear Base de Datos D1

```bash
# Crear la base de datos
wrangler d1 create ocupasalud-db

# Nota el database_id que devuelve el comando
# Ejemplo: database_id = "abc123-def456-ghi789"
```

## Paso 4: Configurar wrangler.toml

Edita `wrangler.toml` y agrega el `database_id` obtenido:

```toml
[[d1_databases]]
binding = "DB"
database_name = "ocupasalud-db"
database_id = "abc123-def456-ghi789"  # <-- Pega tu ID aquí
```

También configura las variables de entorno de Supabase:

```toml
[vars]
SUPABASE_URL = "https://tu-proyecto.supabase.co"
SUPABASE_SERVICE_KEY = "tu-service-key-secreta"
```

**Importante**: En producción, usa `wrangler secret put` para las claves sensibles:

```bash
wrangler secret put SUPABASE_SERVICE_KEY
```

## Paso 5: Inicializar Esquema de Base de Datos

```bash
# Ejecutar el script SQL para crear tablas
wrangler d1 execute ocupasalud-db --file=schema.sql

# O en modo local
wrangler d1 execute ocupasalud-db --local --file=schema.sql
```

## Paso 6: Configurar Variables de Entorno del Frontend

Crea un archivo `.env` en la raíz:

```env
VITE_API_BASE_URL=http://localhost:8787
VITE_SUPABASE_URL=https://tu-proyecto.supabase.co
VITE_SUPABASE_ANON_KEY=tu-anon-key-publica
```

## Paso 7: Desarrollo Local

### Terminal 1: Iniciar Worker Local

```bash
wrangler dev --local
```

El worker estará disponible en `http://localhost:8787`

### Terminal 2: Iniciar Frontend React

```bash
npm install
npm run dev
```

La aplicación estará en `http://localhost:5173`

## Paso 8: Migración de Datos desde localStorage

### Script de Migración

Crea un script para extraer datos del monolito:

```javascript
// migrate-from-localstorage.js
const fs = require('fs');

// Leer datos de localStorage exportados
const localStorageData = JSON.parse(fs.readFileSync('localStorage-export.json', 'utf8'));

// Transformar al formato D1
const pacientes = localStorageData.pacientes?.map(p => ({
  id: p.id || crypto.randomUUID(),
  user_id: p.user_id,
  nombre: p.nombre,
  identificacion: p.identificacion,
  // ... mapear resto de campos
})) || [];

// Guardar para importar
fs.writeFileSync('pacientes-migration.json', JSON.stringify(pacientes, null, 2));
console.log(`Exportados ${pacientes.length} pacientes`);
```

### Importar Datos a D1

```bash
# Usar wrangler para insertar datos
node scripts/import-to-d1.js
```

## Paso 9: Despliegue a Producción

```bash
# Build del frontend
npm run build

# Deploy del worker y sitio estático
wrangler deploy

# El sitio estará disponible en https://ocupasalud-worker.tu-subdomain.workers.dev
```

## Paso 10: Actualizar Frontend para usar nueva API

Reemplaza todas las referencias a `localStorage` con `apiClient`:

### Antes (localStorage):
```javascript
const pacientes = JSON.parse(localStorage.getItem('pacientes') || '[]');
localStorage.setItem('pacientes', JSON.stringify(nuevosPacientes));
```

### Después (apiClient):
```javascript
import { apiClient } from './utils/apiClient';

// Inicializar después del login
apiClient.init(userId, authToken);

// Obtener pacientes
const pacientes = await apiClient.getPacientes();

// Crear paciente
const nuevoPaciente = await apiClient.createPaciente(data);
```

## Validación Post-Migración

1. ✅ Verificar que todas las entidades se pueden crear/leer/actualizar/eliminar
2. ✅ Confirmar sincronización asíncrona a Supabase
3. ✅ Probar flujos completos (admisión → atención → facturación)
4. ✅ Validar logs de auditoría
5. ✅ Verificar rendimiento y tiempos de respuesta

## Troubleshooting

### Error: Database not found
- Verifica que el `database_id` en `wrangler.toml` sea correcto
- Ejecuta `wrangler d1 list` para ver bases de datos disponibles

### Error: CORS en desarrollo
- Asegúrate que el worker incluya headers CORS (ya implementado)
- Usa `wrangler dev --local` para evitar problemas de dominio

### Error: Sincronización falla a Supabase
- Verifica credenciales de Supabase en secrets
- Revisa logs del worker: `wrangler tail`

## Consideraciones de Seguridad

1. **Nunca expongas la Service Key de Supabase en el frontend**
2. **Usa RLS (Row Level Security) en Supabase como capa adicional**
3. **Implementa rate limiting en el worker si es necesario**
4. **Habilita logs de auditoría para todos los cambios críticos**

## Monitoreo

```bash
# Ver logs en tiempo real
wrangler tail

# Ver métricas de la base de datos
wrangler d1 metrics ocupasalud-db
```

## Rollback Plan

Si algo sale mal:

1. Mantén el monolito original intacto
2. Exporta datos de D1: `wrangler d1 execute ocupasalud-db --output=backup.json`
3. Cambia DNS de vuelta al servidor anterior
4. Restaura datos en localStorage si es necesario

---

**Estado de Implementación**: 
- ✅ Worker básico configurado
- ✅ Schema D1 definido
- ✅ Cliente API creado
- ⏳ Handlers restantes por implementar
- ⏳ Migración de datos pendiente
- ⏳ Tests de integración pendientes
