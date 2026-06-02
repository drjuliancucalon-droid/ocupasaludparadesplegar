-- Schema inicial para Cloudflare D1 - OcupaSalud
-- Basado en la estructura del monolito y siso-appultimo

-- Tabla de Usuarios (perfil extendido, auth va por Supabase)
CREATE TABLE IF NOT EXISTS usuarios (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  nombre_completo TEXT NOT NULL,
  rol TEXT DEFAULT 'medico', -- medico, administrador, auxiliar
  especialidad TEXT,
  licencia_medica TEXT,
  telefono TEXT,
  avatar_url TEXT,
  configuracion TEXT, -- JSON con preferencias del usuario
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Tabla de Empresas
CREATE TABLE IF NOT EXISTS empresas (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL, -- Dueño/creador de la empresa
  nombre TEXT NOT NULL,
  nit TEXT NOT NULL,
  digito_verificacion TEXT,
  direccion TEXT,
  telefono TEXT,
  email TEXT,
  contacto TEXT,
  sector TEXT,
  tamano TEXT, -- micro, pequena, mediana, grande
  configuracion_ssto TEXT, -- JSON configuración SST
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_empresas_user_id ON empresas(user_id);
CREATE INDEX IF NOT EXISTS idx_empresas_nit ON empresas(nit);

-- Tabla de Pacientes / Trabajadores
CREATE TABLE IF NOT EXISTS pacientes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL, -- Profesional de salud que lo registra
  nombre TEXT NOT NULL,
  identificacion TEXT NOT NULL,
  tipo_identificacion TEXT DEFAULT 'CC', -- CC, TI, CE, PASAPORTE
  fecha_nacimiento TEXT,
  genero TEXT, -- M, F, Otro
  telefono TEXT,
  email TEXT,
  direccion TEXT,
  eps TEXT,
  ocupacion TEXT,
  empresa_id TEXT,
  arl TEXT,
  tipo_sangre TEXT,
  antecedentes_alergias TEXT, -- JSON
  antecedentes_enfermedades TEXT, -- JSON
  antecedentes_quirurgicos TEXT, -- JSON
  antecedentes_familiares TEXT, -- JSON
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES usuarios(id),
  FOREIGN KEY (empresa_id) REFERENCES empresas(id)
);

CREATE INDEX IF NOT EXISTS idx_pacientes_user_id ON pacientes(user_id);
CREATE INDEX IF NOT EXISTS idx_pacientes_identificacion ON pacientes(identificacion);
CREATE INDEX IF NOT EXISTS idx_pacientes_empresa_id ON pacientes(empresa_id);

-- Tabla de Historias Clínicas Ocupacionales
CREATE TABLE IF NOT EXISTS historias_clinicas (
  id TEXT PRIMARY KEY,
  paciente_id TEXT NOT NULL,
  profesional_id TEXT NOT NULL,
  empresa_id TEXT,
  tipo_historia TEXT DEFAULT 'ocupacional', -- ocupacional, general
  fecha_consulta TEXT NOT NULL,
  motivo_consulta TEXT,
  enfermedad_actual TEXT,
  revision_sistemas TEXT, -- JSON
  signos_vitales TEXT, -- JSON: TA, FC, FR, Temp, SatO2, Peso, Talla, IMC
  examen_fisico TEXT, -- JSON por sistemas
  diagnostico_principal TEXT, -- CIE-10
  diagnosticos_secundarios TEXT, -- JSON CIE-10
  plan_manejo TEXT,
  recomendaciones TEXT,
  aptitud_laboral TEXT, -- apto, no apto, apto_con_restricciones
  restricciones TEXT,
  proxima_cita TEXT,
  adjuntos TEXT, -- JSON con URLs de archivos
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
  FOREIGN KEY (profesional_id) REFERENCES usuarios(id),
  FOREIGN KEY (empresa_id) REFERENCES empresas(id)
);

CREATE INDEX IF NOT EXISTS idx_hc_paciente_id ON historias_clinicas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_hc_profesional_id ON historias_clinicas(profesional_id);
CREATE INDEX IF NOT EXISTS idx_hc_fecha ON historias_clinicas(fecha_consulta);

-- Tabla de Citas / Agenda
CREATE TABLE IF NOT EXISTS citas (
  id TEXT PRIMARY KEY,
  paciente_id TEXT NOT NULL,
  profesional_id TEXT NOT NULL,
  empresa_id TEXT,
  fecha_hora TEXT NOT NULL,
  duracion_minutos INTEGER DEFAULT 30,
  tipo_cita TEXT DEFAULT 'presencial', -- presencial, telemedicina, domiciliaria
  estado TEXT DEFAULT 'programada', -- programada, confirmada, en_curso, finalizada, cancelada, no_asistio
  motivo TEXT,
  notas TEXT,
  enlace_telemedicina TEXT,
  recordatorio_enviado INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
  FOREIGN KEY (profesional_id) REFERENCES usuarios(id),
  FOREIGN KEY (empresa_id) REFERENCES empresas(id)
);

CREATE INDEX IF NOT EXISTS idx_citas_paciente_id ON citas(paciente_id);
CREATE INDEX IF NOT EXISTS idx_citas_profesional_id ON citas(profesional_id);
CREATE INDEX IF NOT EXISTS idx_citas_fecha ON citas(fecha_hora);
CREATE INDEX IF NOT EXISTS idx_citas_estado ON citas(estado);

-- Tabla de Facturación
CREATE TABLE IF NOT EXISTS facturas (
  id TEXT PRIMARY KEY,
  numero_factura TEXT UNIQUE NOT NULL,
  paciente_id TEXT,
  empresa_id TEXT,
  profesional_id TEXT NOT NULL,
  fecha_emision TEXT NOT NULL,
  fecha_vencimiento TEXT,
  subtotal REAL DEFAULT 0,
  descuento REAL DEFAULT 0,
  iva REAL DEFAULT 0,
  total REAL DEFAULT 0,
  estado TEXT DEFAULT 'pendiente', -- pendiente, pagada, anulada, vencida
  forma_pago TEXT, -- efectivo, transferencia, tarjeta, credito
  items TEXT, -- JSON con detalle de servicios
  cups_codes TEXT, -- JSON códigos CUPS
  observaciones TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
  FOREIGN KEY (empresa_id) REFERENCES empresas(id),
  FOREIGN KEY (profesional_id) REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_facturas_numero ON facturas(numero_factura);
CREATE INDEX IF NOT EXISTS idx_facturas_empresa_id ON facturas(empresa_id);
CREATE INDEX IF NOT EXISTS idx_facturas_estado ON facturas(estado);

-- Tabla de Vigilancia Epidemiológica (SVE)
CREATE TABLE IF NOT EXISTS sve_registros (
  id TEXT PRIMARY KEY,
  paciente_id TEXT NOT NULL,
  empresa_id TEXT NOT NULL,
  tipo_vigilancia TEXT NOT NULL, -- auditivo, visual, osteomuscular, mental, etc.
  fecha_registro TEXT NOT NULL,
  datos_registro TEXT, -- JSON específico según tipo
  hallazgos TEXT,
  recomendaciones TEXT,
  profesional_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
  FOREIGN KEY (empresa_id) REFERENCES empresas(id),
  FOREIGN KEY (profesional_id) REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_sve_empresa_id ON sve_registros(empresa_id);
CREATE INDEX IF NOT EXISTS idx_sve_tipo ON sve_registros(tipo_vigilancia);

-- Tabla de Accidentes de Trabajo (ARL)
CREATE TABLE IF NOT EXISTS accidentes_trabajo (
  id TEXT PRIMARY KEY,
  paciente_id TEXT NOT NULL,
  empresa_id TEXT NOT NULL,
  fecha_accidente TEXT NOT NULL,
  hora_accidente TEXT,
  lugar_accidente TEXT,
  descripcion_accidente TEXT,
  mecanismo_lesion TEXT,
  parte_cuerpo_afectada TEXT,
  naturaleza_lesion TEXT,
  dias_medicales INTEGER DEFAULT 0,
  dias_incapedad_temporal INTEGER DEFAULT 0,
  secuelas TEXT,
  estado TEXT DEFAULT 'reportado', -- reportado, en_investigacion, cerrado
  numero_rupt TEXT, -- Número de reporte ARL
  arl_responsable TEXT,
  investigador_id TEXT,
  informe_investigacion TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
  FOREIGN KEY (empresa_id) REFERENCES empresas(id),
  FOREIGN KEY (investigador_id) REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_accidentes_empresa_id ON accidentes_trabajo(empresa_id);
CREATE INDEX IF NOT EXISTS idx_accidentes_fecha ON accidentes_trabajo(fecha_accidente);
CREATE INDEX IF NOT EXISTS idx_accidentes_estado ON accidentes_trabajo(estado);

-- Tabla de Auditoría (Logs)
CREATE TABLE IF NOT EXISTS auditoria_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  accion TEXT NOT NULL, -- CREATE, UPDATE, DELETE, LOGIN, LOGOUT
  entidad TEXT NOT NULL,
  registro_id TEXT,
  datos_anteriores TEXT, -- JSON
  datos_nuevos TEXT, -- JSON
  ip_address TEXT,
  user_agent TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_auditoria_user_id ON auditoria_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_entidad ON auditoria_logs(entidad);
CREATE INDEX IF NOT EXISTS idx_auditoria_fecha ON auditoria_logs(created_at);

-- Tabla de Sincronización (Control de cola)
CREATE TABLE IF NOT EXISTS sync_queue (
  id TEXT PRIMARY KEY,
  table_name TEXT NOT NULL,
  operation TEXT NOT NULL, -- INSERT, UPDATE, DELETE
  data TEXT NOT NULL, -- JSON
  status TEXT DEFAULT 'pending', -- pending, processing, completed, failed
  retry_count INTEGER DEFAULT 0,
  error_message TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  processed_at TEXT
);

CREATE INDEX IF NOT EXISTS idx_sync_queue_status ON sync_queue(status);
CREATE INDEX IF NOT EXISTS idx_sync_queue_created ON sync_queue(created_at);

-- ============================================
-- TABLAS ADICIONALES PARA MIGRACIÓN COMPLETA
-- Basadas en las 67 keys del localStorage del monolito
-- ============================================

-- Teleconsultas
CREATE TABLE IF NOT EXISTS teleconsultas (
  id TEXT PRIMARY KEY,
  paciente_id TEXT NOT NULL,
  profesional_id TEXT NOT NULL,
  cita_id TEXT,
  sala_id TEXT UNIQUE, -- ID único de la sala virtual
  estado TEXT DEFAULT 'creada', -- creada, en_espera, en_curso, finalizada, cancelada
  fecha_inicio TEXT,
  fecha_fin TEXT,
  plataforma TEXT, -- WebRTC, Jitsi, Zoom, Meet
  enlace_acceso TEXT,
  grabacion_url TEXT,
  notas_consulta TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
  FOREIGN KEY (profesional_id) REFERENCES usuarios(id),
  FOREIGN KEY (cita_id) REFERENCES citas(id)
);

CREATE INDEX IF NOT EXISTS idx_teleconsultas_profesional ON teleconsultas(profesional_id);
CREATE INDEX IF NOT EXISTS idx_teleconsultas_estado ON teleconsultas(estado);

-- Caja Principal y Movimientos
CREATE TABLE IF NOT EXISTS caja_movimientos (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tipo_movimiento TEXT NOT NULL, -- ingreso, egreso, ajuste, apertura, cierre
  concepto TEXT NOT NULL,
  monto REAL NOT NULL,
  saldo_anterior REAL DEFAULT 0,
  saldo_nuevo REAL DEFAULT 0,
  metodo_pago TEXT, -- efectivo, transferencia, tarjeta
  comprobante_numero TEXT,
  factura_id TEXT,
  observaciones TEXT,
  creado_por TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES usuarios(id),
  FOREIGN KEY (factura_id) REFERENCES facturas(id)
);

CREATE INDEX IF NOT EXISTS idx_caja_user_id ON caja_movimientos(user_id);
CREATE INDEX IF NOT EXISTS idx_caja_fecha ON caja_movimientos(created_at);
CREATE INDEX IF NOT EXISTS idx_caja_tipo ON caja_movimientos(tipo_movimiento);

-- Configuración de IA
CREATE TABLE IF NOT EXISTS config_ai (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  proveedor TEXT NOT NULL, -- gemini, groq, openai, anthropic, cohere
  api_key_encrypted TEXT, -- CIFRADA
  modelo_default TEXT,
  configuracion TEXT, -- JSON con settings específicos
  activo INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_config_ai_user ON config_ai(user_id);

-- Configuración de Email (EmailJS u otros)
CREATE TABLE IF NOT EXISTS config_email (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  servicio TEXT NOT NULL, -- emailjs, sendgrid, smtp
  public_key_encrypted TEXT,
  service_id TEXT,
  template_id TEXT,
  email_remitente TEXT,
  nombre_remitente TEXT,
  configurado INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES usuarios(id)
);

-- Firmas Digitales de Médicos
CREATE TABLE IF NOT EXISTS firmas_digitales (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  imagen_firma TEXT, -- Base64 o URL
  certificado_digital TEXT, -- PEM del certificado
  fecha_expiracion TEXT,
  hash_verificacion TEXT,
  activo INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES usuarios(id)
);

-- Encuestas Epidemiológicas
CREATE TABLE IF NOT EXISTS encuestas (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  tipo TEXT, -- psicossocial, factores_riesgo, satisfaccion, etc.
  preguntas TEXT, -- JSON con estructura de preguntas
  activa INTEGER DEFAULT 1,
  user_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_encuestas_activa ON encuestas(activa);

-- Respuestas a Encuestas
CREATE TABLE IF NOT EXISTS encuesta_respuestas (
  id TEXT PRIMARY KEY,
  encuesta_id TEXT NOT NULL,
  paciente_id TEXT,
  empresa_id TEXT,
  respuestas TEXT, -- JSON con respuestas
  puntuacion_total REAL,
  fecha_respuesta TEXT NOT NULL,
  ip_address TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (encuesta_id) REFERENCES encuestas(id),
  FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
  FOREIGN KEY (empresa_id) REFERENCES empresas(id)
);

CREATE INDEX IF NOT EXISTS idx_encuesta_resp_encuesta ON encuesta_respuestas(encuesta_id);

-- Cartas de Custodia
CREATE TABLE IF NOT EXISTS cartas_custodia (
  id TEXT PRIMARY KEY,
  paciente_id TEXT NOT NULL,
  empresa_id TEXT NOT NULL,
  tipo_documento TEXT, -- historia_clinica, resultados, certificados
  descripcion TEXT,
  fecha_entrega TEXT,
  recibido_por TEXT, -- Nombre quien recibe
  identificacion_recibe TEXT,
  cargo_recibe TEXT,
  archivo_url TEXT,
  observaciones TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
  FOREIGN KEY (empresa_id) REFERENCES empresas(id),
  FOREIGN KEY (created_by) REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_cartas_empresa ON cartas_custodia(empresa_id);

-- Cotizaciones
CREATE TABLE IF NOT EXISTS cotizaciones (
  id TEXT PRIMARY KEY,
  numero_cotizacion TEXT UNIQUE NOT NULL,
  empresa_id TEXT,
  paciente_id TEXT,
  servicios TEXT, -- JSON con detalle de servicios cotizados
  subtotal REAL DEFAULT 0,
  descuento REAL DEFAULT 0,
  total REAL DEFAULT 0,
  validez_hasta TEXT,
  estado TEXT DEFAULT 'pendiente', -- pendiente, aprobada, rechazada, convertida
  observaciones TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (empresa_id) REFERENCES empresas(id),
  FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
  FOREIGN KEY (created_by) REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_cotizaciones_estado ON cotizaciones(estado);

-- Portafolio de Servicios
CREATE TABLE IF NOT EXISTS portafolio_servicios (
  id TEXT PRIMARY KEY,
  codigo TEXT UNIQUE NOT NULL,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  categoria TEXT, -- consulta, examen, procedimiento, paquete
  precio_base REAL DEFAULT 0,
  duracion_minutos INTEGER DEFAULT 30,
  requiere_orden INTEGER DEFAULT 0,
  cups_codes TEXT, -- JSON códigos CUPS asociados
  activo INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_portafolio_categoria ON portafolio_servicios(categoria);

-- Peticiones Habeas Data
CREATE TABLE IF NOT EXISTS habeas_requests (
  id TEXT PRIMARY KEY,
  paciente_id TEXT NOT NULL,
  tipo_solicitud TEXT NOT NULL, -- acceso, rectificacion, eliminacion, oposicion
  descripcion TEXT,
  estado TEXT DEFAULT 'pendiente', -- pendiente, en_proceso, respondida, cerrada
  fecha_solicitud TEXT NOT NULL,
  fecha_respuesta TEXT,
  respuesta TEXT,
  documento_adjunto TEXT,
  created_by TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
  FOREIGN KEY (created_by) REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_habeas_estado ON habeas_requests(estado);

-- Medicamentos Personalizados (Catálogo custom)
CREATE TABLE IF NOT EXISTS medicamentos_custom (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  nombre_comercial TEXT NOT NULL,
  principio_activo TEXT,
  concentracion TEXT,
  forma_farmaceutica TEXT,
  laboratorio TEXT,
  registro_invima TEXT,
  precio_referencia REAL,
  activo INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_medicamentos_user ON medicamentos_custom(user_id);

-- Mensajes Internos
CREATE TABLE IF NOT EXISTS mensajes (
  id TEXT PRIMARY KEY,
  remitente_id TEXT NOT NULL,
  destinatario_id TEXT NOT NULL,
  asunto TEXT NOT NULL,
  cuerpo TEXT NOT NULL,
  leido INTEGER DEFAULT 0,
  fecha_envio TEXT NOT NULL,
  fecha_lectura TEXT,
  adjuntos TEXT, -- JSON URLs
  FOREIGN KEY (remitente_id) REFERENCES usuarios(id),
  FOREIGN KEY (destinatario_id) REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_mensajes_destinatario ON mensajes(destinatario_id);
CREATE INDEX IF NOT EXISTS idx_mensajes_leido ON mensajes(leido);

-- Informes/Reportes Generados
CREATE TABLE IF NOT EXISTS informes (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  tipo_informe TEXT NOT NULL, -- estadistico, epidemiologico, financiero, auditoria
  titulo TEXT NOT NULL,
  descripcion TEXT,
  parametros TEXT, -- JSON con filtros usados
  datos_resultado TEXT, -- JSON o referencia a archivo
  archivo_url TEXT,
  fecha_generacion TEXT NOT NULL,
  expires_at TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES usuarios(id)
);

CREATE INDEX IF NOT EXISTS idx_informes_user ON informes(user_id);
CREATE INDEX IF NOT EXISTS idx_informes_tipo ON informes(tipo_informe);

-- Organizaciones / Multi-tenant
CREATE TABLE IF NOT EXISTS organizaciones (
  id TEXT PRIMARY KEY,
  nombre TEXT NOT NULL,
  nit TEXT,
  plan_suscripcion TEXT DEFAULT 'libre', -- libre, starter, pro, clinica
  fecha_inicio_plan TEXT,
  fecha_fin_plan TEXT,
  limite_usuarios INTEGER DEFAULT 1,
  limite_pacientes INTEGER DEFAULT 100,
  limite_empresas INTEGER DEFAULT 5,
  features_enabled TEXT, -- JSON con características activas
  activo INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Relación Usuarios-Organizaciones
CREATE TABLE IF NOT EXISTS user_organizations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  rol_org TEXT DEFAULT 'miembro', -- admin, miembro, viewer
  joined_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (user_id) REFERENCES usuarios(id),
  FOREIGN KEY (organization_id) REFERENCES organizaciones(id),
  UNIQUE(user_id, organization_id)
);

-- Rate Limiting (para migrar lógica del monolito)
CREATE TABLE IF NOT EXISTS rate_limits (
  id TEXT PRIMARY KEY,
  identifier TEXT NOT NULL, -- IP, user_id, email
  action_type TEXT NOT NULL, -- login, api_call, form_submit
  attempt_count INTEGER DEFAULT 0,
  blocked_until TEXT,
  last_attempt TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_rate_limits_identifier ON rate_limits(identifier);
CREATE INDEX IF NOT EXISTS idx_rate_limits_blocked ON rate_limits(blocked_until);

-- Atenciones Cerradas (histórico)
CREATE TABLE IF NOT EXISTS atenciones_cerradas (
  id TEXT PRIMARY KEY,
  historia_id TEXT NOT NULL,
  paciente_id TEXT NOT NULL,
  profesional_id TEXT NOT NULL,
  fecha_cierre TEXT NOT NULL,
  motivo_cierre TEXT,
  resumen_final TEXT,
  created_at TEXT DEFAULT (datetime('now')),
  FOREIGN KEY (historia_id) REFERENCES historias_clinicas(id),
  FOREIGN KEY (paciente_id) REFERENCES pacientes(id),
  FOREIGN KEY (profesional_id) REFERENCES usuarios(id)
);

-- Datos iniciales de prueba (opcional)
-- INSERT INTO usuarios (id, email, nombre_completo, rol) 
-- VALUES ('usr_001', 'admin@ocupasalud.com', 'Administrador Principal', 'administrador');
