# OcupaSalud D1 Migration

Repositorio de migración de OcupaSalud desde arquitectura monolítica (localStorage) hacia **Cloudflare Workers + D1** con respaldo en Supabase.

## 🎯 Objetivo

Migrar quirúrgicamente todas las funciones del monolito original (52K líneas) a una arquitectura moderna edge-first, manteniendo:
- Todas las funcionalidades clínicas y administrativas
- Interacciones entre módulos
- Cumplimiento normativo colombiano (RIPS, CIE-10, CUPS, Res. 0312/2019)
- Seguridad y auditoría de datos médicos

## 🏗️ Arquitectura

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

## 📁 Estructura del Proyecto

```
ocupasalud-d1-migration/
├── wrangler.toml              # Configuración de Cloudflare Workers
├── schema.sql                 # Schema completo de D1
├── functions/
│   └── [[path]].js           # Worker API (enrutamiento dinámico)
├── src/
│   ├── utils/
│   │   └── apiClient.js      # Cliente API para reemplazar localStorage
│   └── ...                   # Componentes React (base de siso-appultimo)
├── src-monolito-ref/         # Referencia del monolito original
├── MIGRATION_GUIDE.md        # Guía paso a paso operativa
├── PROTOCOLO_MIGRACION.md    # Protocolo forense detallado
└── README.md                 # Este archivo
```

## ✅ Estado Actual

### Fase 1: Preparación ✅ COMPLETADA
- [x] Repositorio de migración creado
- [x] wrangler.toml configurado
- [x] Schema SQL definido (9 tablas principales)
- [x] Worker básico implementado
- [x] Cliente API creado
- [x] Handlers de Pacientes y Empresas funcionales
- [x] Sincronización asíncrona a Supabase implementada

### Fase 2: Implementación de Handlers ⏳ PENDIENTE
- [ ] Historias Clínicas
- [ ] Citas
- [ ] Facturas
- [ ] SVE (Vigilancia Epidemiológica)
- [ ] ARL (Accidentes de Trabajo)
- [ ] Usuarios (perfil extendido)
- [ ] Auditoría

### Fase 3-7: Migración, Tests y Deploy ⏳ PENDIENTE

## 🚀 Inicio Rápido

### Prerrequisitos
- Node.js 18+
- Cuenta de Cloudflare
- Cuenta de Supabase
- Wrangler CLI (`npm install -g wrangler`)

### Pasos Iniciales

```bash
# 1. Clonar y entrar al repositorio
cd ocupasalud-d1-migration

# 2. Instalar dependencias
npm install

# 3. Autenticar con Cloudflare
wrangler login

# 4. Crear base de datos D1
wrangler d1 create ocupasalud-db

# 5. Actualizar wrangler.toml con el database_id

# 6. Ejecutar schema
wrangler d1 execute ocupasalud-db --file=schema.sql

# 7. Iniciar worker en desarrollo
wrangler dev --local

# 8. En otra terminal, iniciar frontend
npm run dev
```

## 📚 Documentación

- **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)**: Guía operativa paso a paso
- **[PROTOCOLO_MIGRACION.md](./PROTOCOLO_MIGRACION.md)**: Protocolo forense detallado

## 🔧 Comandos Útiles

```bash
# Desarrollo local
wrangler dev --local

# Deploy a producción
wrangler deploy

# Ver logs en tiempo real
wrangler tail

# Métricas de D1
wrangler d1 metrics ocupasalud-db

# Ejecutar SQL en D1
wrangler d1 execute ocupasalud-db --command="SELECT * FROM pacientes LIMIT 10"
```

## 🔐 Seguridad

- Autenticación vía Supabase Auth
- Row Level Security (RLS) en D1
- Logs de auditoría inmutables
- Encriptación en tránsito y reposo
- Cumplimiento Ley 1581 de 2012 (Colombia)

## 📊 Entidades Soportadas

1. **Pacientes**: Gestión completa de trabajadores/pacientes
2. **Empresas**: Administración de empresas clientes
3. **Historias Clínicas**: Occupacionales y generales
4. **Citas**: Agenda médica presencial y telemedicina
5. **Facturas**: Facturación con códigos CUPS
6. **SVE**: Vigilancia epidemiológica
7. **ARL**: Accidentes de trabajo
8. **Auditoría**: Logs de todos los cambios

## 🤝 Contribución

Este es un repositorio de migración. Los cambios deben:
1. Mantener compatibilidad con el monolito original
2. Incluir tests para nuevas funcionalidades
3. Seguir el protocolo forense documentado
4. Ser revisados por al menos 2 desarrolladores

## 📞 Soporte

Para issues durante la migración:
1. Revisar logs con `wrangler tail`
2. Consultar la documentación
3. Crear issue en GitHub con detalles del error

## 📄 Licencia

Mismo license que el repositorio original de OcupaSalud.

---

**Estado**: Fase 1 Completada ✅  
**Próximo Hito**: Handlers de Historias Clínicas y Citas  
**ETA**: 3-5 días para MVP funcional
