// Cloudflare Worker - API Edge para OcupaSalud
// Fuente principal: D1 | Respaldo: Supabase (async)

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    const path = url.pathname;

    // Configurar CORS
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID',
    };

    // Manejar preflight requests
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Extraer usuario autenticado desde los headers (validado por Supabase Auth en el frontend)
      const userId = request.headers.get('X-User-ID');
      const authToken = request.headers.get('Authorization');

      if (!userId && !path.startsWith('/public/')) {
        return new Response(JSON.stringify({ error: 'No autorizado' }), {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Enrutamiento de la API
      // Formato: /api/{entidad}/{id?}
      const segments = path.split('/').filter(Boolean);
      
      if (segments[0] !== 'api') {
        return new Response(JSON.stringify({ error: 'Ruta no encontrada' }), {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const entity = segments[1];
      const id = segments[2];
      const action = request.method;

      // Despachar a la función correspondiente
      let response;
      switch (entity) {
        case 'pacientes':
          response = await handlePacientes(request, env, action, id, userId);
          break;
        case 'empresas':
          response = await handleEmpresas(request, env, action, id, userId);
          break;
        case 'historias-clinicas':
          response = await handleHistoriasClinicas(request, env, action, id, userId);
          break;
        case 'citas':
          response = await handleCitas(request, env, action, id, userId);
          break;
        case 'facturas':
          response = await handleFacturas(request, env, action, id, userId);
          break;
        case 'usuarios':
          response = await handleUsuarios(request, env, action, id, userId);
          break;
        case 'sync':
          // Endpoint especial para sincronización manual si es necesario
          response = await handleSync(request, env, action, userId);
          break;
        default:
          return new Response(JSON.stringify({ error: `Entidad '${entity}' no soportada` }), {
            status: 400,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          });
      }

      // Agregar headers CORS a la respuesta
      return new Response(response.body, {
        status: response.status,
        headers: { ...corsHeaders, ...response.headers }
      });

    } catch (error) {
      console.error('Error en Worker:', error);
      return new Response(JSON.stringify({ error: 'Error interno del servidor', details: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }
  }
};

// ============================================================================
// HANDLERS POR ENTIDAD
// ============================================================================

async function handlePacientes(request, env, action, id, userId) {
  const db = env.DB;

  if (action === 'GET') {
    if (id) {
      // Obtener paciente específico
      const stmt = db.prepare('SELECT * FROM pacientes WHERE id = ? AND user_id = ?');
      const result = await stmt.bind(id, userId).first();
      if (!result) {
        return new Response(JSON.stringify({ error: 'Paciente no encontrado' }), { status: 404 });
      }
      return new Response(JSON.stringify(result));
    } else {
      // Listar todos los pacientes del usuario
      const stmt = db.prepare('SELECT * FROM pacientes WHERE user_id = ? ORDER BY created_at DESC');
      const results = await stmt.bind(userId).all();
      return new Response(JSON.stringify(results.results || []));
    }
  }

  if (action === 'POST') {
    const data = await request.json();
    const now = new Date().toISOString();
    
    // Validar datos requeridos
    if (!data.nombre || !data.identificacion) {
      return new Response(JSON.stringify({ error: 'Nombre e identificación son requeridos' }), { status: 400 });
    }

    const stmt = db.prepare(`
      INSERT INTO pacientes (id, user_id, nombre, identificacion, tipo_identificacion, 
                             fecha_nacimiento, genero, telefono, email, direccion, 
                             eps, ocupacion, empresa_id, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    const newId = crypto.randomUUID();
    await stmt.bind(
      newId, userId, data.nombre, data.identificacion, data.tipo_identificacion || 'CC',
      data.fecha_nacimiento, data.genero, data.telefono, data.email, data.direccion,
      data.eps, data.ocupacion, data.empresa_id, now, now
    ).run();

    // Sincronizar con Supabase de forma asíncrona
    ctx.waitUntil(syncToSupabase(env, 'pacientes', { ...data, id: newId, user_id: userId }, 'INSERT'));

    return new Response(JSON.stringify({ id: newId, ...data }), { status: 201 });
  }

  if (action === 'PUT') {
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID requerido para actualizar' }), { status: 400 });
    }
    
    const data = await request.json();
    const now = new Date().toISOString();
    
    // Construir dinámica SET clause
    const fields = Object.keys(data).filter(k => k !== 'id' && k !== 'user_id' && k !== 'created_at');
    if (fields.length === 0) {
      return new Response(JSON.stringify({ error: 'No hay campos para actualizar' }), { status: 400 });
    }
    
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = [...fields.map(f => data[f]), id, userId, now];
    
    const stmt = db.prepare(`
      UPDATE pacientes SET ${setClause}, updated_at = ? 
      WHERE id = ? AND user_id = ?
    `);
    
    await stmt.bind(...values).run();

    // Sincronizar con Supabase
    ctx.waitUntil(syncToSupabase(env, 'pacientes', { ...data, id, user_id: userId }, 'UPDATE'));

    return new Response(JSON.stringify({ id, ...data }));
  }

  if (action === 'DELETE') {
    if (!id) {
      return new Response(JSON.stringify({ error: 'ID requerido para eliminar' }), { status: 400 });
    }
    
    const stmt = db.prepare('DELETE FROM pacientes WHERE id = ? AND user_id = ?');
    await stmt.bind(id, userId).run();

    // Sincronizar con Supabase
    ctx.waitUntil(syncToSupabase(env, 'pacientes', { id, user_id: userId }, 'DELETE'));

    return new Response(JSON.stringify({ success: true }));
  }

  return new Response(JSON.stringify({ error: 'Método no permitido' }), { status: 405 });
}

async function handleEmpresas(request, env, action, id, userId) {
  const db = env.DB;

  if (action === 'GET') {
    if (id) {
      const stmt = db.prepare('SELECT * FROM empresas WHERE id = ? AND user_id = ?');
      const result = await stmt.bind(id, userId).first();
      if (!result) {
        return new Response(JSON.stringify({ error: 'Empresa no encontrada' }), { status: 404 });
      }
      return new Response(JSON.stringify(result));
    } else {
      const stmt = db.prepare('SELECT * FROM empresas WHERE user_id = ? ORDER BY nombre ASC');
      const results = await stmt.bind(userId).all();
      return new Response(JSON.stringify(results.results || []));
    }
  }

  if (action === 'POST') {
    const data = await request.json();
    const now = new Date().toISOString();
    
    if (!data.nombre || !data.nit) {
      return new Response(JSON.stringify({ error: 'Nombre y NIT son requeridos' }), { status: 400 });
    }

    const newId = crypto.randomUUID();
    const stmt = db.prepare(`
      INSERT INTO empresas (id, user_id, nombre, nit, digito_verificacion, direccion, 
                            telefono, email, contacto, sector, tamano, 
                            created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    await stmt.bind(
      newId, userId, data.nombre, data.nit, data.digito_verificacion,
      data.direccion, data.telefono, data.email, data.contacto, data.sector,
      data.tamano, now, now
    ).run();

    ctx.waitUntil(syncToSupabase(env, 'empresas', { ...data, id: newId, user_id: userId }, 'INSERT'));

    return new Response(JSON.stringify({ id: newId, ...data }), { status: 201 });
  }

  if (action === 'PUT') {
    if (!id) return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });
    
    const data = await request.json();
    const now = new Date().toISOString();
    const fields = Object.keys(data).filter(k => k !== 'id' && k !== 'user_id' && k !== 'created_at');
    
    if (fields.length === 0) return new Response(JSON.stringify({ error: 'No hay campos para actualizar' }), { status: 400 });
    
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = [...fields.map(f => data[f]), id, userId, now];
    
    const stmt = db.prepare(`UPDATE empresas SET ${setClause}, updated_at = ? WHERE id = ? AND user_id = ?`);
    await stmt.bind(...values).run();

    ctx.waitUntil(syncToSupabase(env, 'empresas', { ...data, id, user_id: userId }, 'UPDATE'));

    return new Response(JSON.stringify({ id, ...data }));
  }

  if (action === 'DELETE') {
    if (!id) return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });
    
    const stmt = db.prepare('DELETE FROM empresas WHERE id = ? AND user_id = ?');
    await stmt.bind(id, userId).run();

    ctx.waitUntil(syncToSupabase(env, 'empresas', { id, user_id: userId }, 'DELETE'));

    return new Response(JSON.stringify({ success: true }));
  }

  return new Response(JSON.stringify({ error: 'Método no permitido' }), { status: 405 });
}

// Handlers simplificados para otras entidades (se expandirán según necesidad)
async function handleHistoriasClinicas(request, env, action, id, userId) {
  const db = env.DB;

  if (action === 'GET') {
    if (id) {
      const stmt = db.prepare(`
        SELECT hc.*, p.nombre as paciente_nombre, u.nombre_completo as profesional_nombre
        FROM historias_clinicas hc
        JOIN pacientes p ON hc.paciente_id = p.id
        JOIN usuarios u ON hc.profesional_id = u.id
        WHERE hc.id = ? AND hc.profesional_id = ?
      `);
      const result = await stmt.bind(id, userId).first();
      if (!result) {
        return new Response(JSON.stringify({ error: 'Historia clínica no encontrada' }), { status: 404 });
      }
      return new Response(JSON.stringify(result));
    } else {
      // Listar con filtros opcionales
      const url = new URL(request.url);
      const pacienteId = url.searchParams.get('paciente_id');
      const empresaId = url.searchParams.get('empresa_id');
      
      let query = `
        SELECT hc.*, p.nombre as paciente_nombre 
        FROM historias_clinicas hc
        JOIN pacientes p ON hc.paciente_id = p.id
        WHERE hc.profesional_id = ?
      `;
      let params = [userId];
      
      if (pacienteId) {
        query += ' AND hc.paciente_id = ?';
        params.push(pacienteId);
      }
      if (empresaId) {
        query += ' AND hc.empresa_id = ?';
        params.push(empresaId);
      }
      query += ' ORDER BY hc.fecha_consulta DESC';
      
      const stmt = db.prepare(query);
      const results = await stmt.bind(...params).all();
      return new Response(JSON.stringify(results.results || []));
    }
  }

  if (action === 'POST') {
    const data = await request.json();
    const now = new Date().toISOString();
    
    if (!data.paciente_id || !data.tipo_historia) {
      return new Response(JSON.stringify({ error: 'Paciente y tipo de historia son requeridos' }), { status: 400 });
    }

    const newId = crypto.randomUUID();
    const stmt = db.prepare(`
      INSERT INTO historias_clinicas (id, paciente_id, profesional_id, empresa_id, tipo_historia,
                                     fecha_consulta, motivo_consulta, enfermedad_actual, revision_sistemas,
                                     signos_vitales, examen_fisico, diagnostico_principal,
                                     diagnosticos_secundarios, plan_manejo, recomendaciones,
                                     aptitud_laboral, restricciones, proxima_cita, adjuntos,
                                     created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    await stmt.bind(
      newId, data.paciente_id, userId, data.empresa_id, data.tipo_historia || 'ocupacional',
      data.fecha_consulta || now, data.motivo_consulta, data.enfermedad_actual,
      JSON.stringify(data.revision_sistemas || {}), JSON.stringify(data.signos_vitales || {}),
      JSON.stringify(data.examen_fisico || {}), data.diagnostico_principal,
      JSON.stringify(data.diagnosticos_secundarios || []), data.plan_manejo,
      data.recomendaciones, data.aptitud_laboral, data.restricciones,
      data.proxima_cita, JSON.stringify(data.adjuntos || []), now, now
    ).run();

    ctx.waitUntil(syncToSupabase(env, 'historias_clinicas', { ...data, id: newId, profesional_id: userId }, 'INSERT'));
    // Log de auditoría
    ctx.waitUntil(logAudit(env, userId, 'CREATE', 'historias_clinicas', newId, null, data));

    return new Response(JSON.stringify({ id: newId, ...data }), { status: 201 });
  }

  if (action === 'PUT') {
    if (!id) return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });
    
    const data = await request.json();
    const now = new Date().toISOString();
    const fields = Object.keys(data).filter(k => k !== 'id' && k !== 'profesional_id' && k !== 'created_at');
    
    if (fields.length === 0) return new Response(JSON.stringify({ error: 'No hay campos para actualizar' }), { status: 400 });
    
    // Obtener datos anteriores para auditoría
    const oldData = await db.prepare('SELECT * FROM historias_clinicas WHERE id = ?').bind(id).first();
    
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = [...fields.map(f => {
      // Serializar campos JSON
      if (['revision_sistemas', 'signos_vitales', 'examen_fisico', 'diagnosticos_secundarios', 'adjuntos'].includes(f)) {
        return typeof data[f] === 'object' ? JSON.stringify(data[f]) : data[f];
      }
      return data[f];
    }), id, userId, now];
    
    const stmt = db.prepare(`UPDATE historias_clinicas SET ${setClause}, updated_at = ? WHERE id = ? AND profesional_id = ?`);
    await stmt.bind(...values).run();

    ctx.waitUntil(syncToSupabase(env, 'historias_clinicas', { ...data, id, profesional_id: userId }, 'UPDATE'));
    ctx.waitUntil(logAudit(env, userId, 'UPDATE', 'historias_clinicas', id, oldData, data));

    return new Response(JSON.stringify({ id, ...data }));
  }

  if (action === 'DELETE') {
    if (!id) return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });
    
    const stmt = db.prepare('DELETE FROM historias_clinicas WHERE id = ? AND profesional_id = ?');
    await stmt.bind(id, userId).run();

    ctx.waitUntil(syncToSupabase(env, 'historias_clinicas', { id, profesional_id: userId }, 'DELETE'));
    ctx.waitUntil(logAudit(env, userId, 'DELETE', 'historias_clinicas', id));

    return new Response(JSON.stringify({ success: true }));
  }

  return new Response(JSON.stringify({ error: 'Método no permitido' }), { status: 405 });
}

async function handleCitas(request, env, action, id, userId) {
  const db = env.DB;

  if (action === 'GET') {
    if (id) {
      const stmt = db.prepare(`
        SELECT c.*, p.nombre as paciente_nombre, u.nombre_completo as profesional_nombre
        FROM citas c
        JOIN pacientes p ON c.paciente_id = p.id
        JOIN usuarios u ON c.profesional_id = u.id
        WHERE c.id = ? AND (c.profesional_id = ? OR c.paciente_id = ?)
      `);
      const result = await stmt.bind(id, userId, userId).first();
      if (!result) {
        return new Response(JSON.stringify({ error: 'Cita no encontrada' }), { status: 404 });
      }
      return new Response(JSON.stringify(result));
    } else {
      const url = new URL(request.url);
      const fecha = url.searchParams.get('fecha');
      const estado = url.searchParams.get('estado');
      
      let query = `
        SELECT c.*, p.nombre as paciente_nombre
        FROM citas c
        JOIN pacientes p ON c.paciente_id = p.id
        WHERE c.profesional_id = ?
      `;
      let params = [userId];
      
      if (fecha) {
        query += " AND DATE(c.fecha_hora) = DATE(?)";
        params.push(fecha);
      }
      if (estado) {
        query += ' AND c.estado = ?';
        params.push(estado);
      }
      query += ' ORDER BY c.fecha_hora ASC';
      
      const stmt = db.prepare(query);
      const results = await stmt.bind(...params).all();
      return new Response(JSON.stringify(results.results || []));
    }
  }

  if (action === 'POST') {
    const data = await request.json();
    const now = new Date().toISOString();
    
    if (!data.paciente_id || !data.fecha_hora) {
      return new Response(JSON.stringify({ error: 'Paciente y fecha son requeridos' }), { status: 400 });
    }

    const newId = crypto.randomUUID();
    const stmt = db.prepare(`
      INSERT INTO citas (id, paciente_id, profesional_id, empresa_id, fecha_hora, duracion_minutos,
                        tipo_cita, estado, motivo, notas, enlace_telemedicina, recordatorio_enviado,
                        created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    await stmt.bind(
      newId, data.paciente_id, userId, data.empresa_id, data.fecha_hora,
      data.duracion_minutos || 30, data.tipo_cita || 'presencial', data.estado || 'programada',
      data.motivo, data.notas, data.enlace_telemedicina, 0, now, now
    ).run();

    ctx.waitUntil(syncToSupabase(env, 'citas', { ...data, id: newId, profesional_id: userId }, 'INSERT'));
    ctx.waitUntil(logAudit(env, userId, 'CREATE', 'citas', newId, null, data));

    return new Response(JSON.stringify({ id: newId, ...data }), { status: 201 });
  }

  if (action === 'PUT') {
    if (!id) return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });
    
    const data = await request.json();
    const now = new Date().toISOString();
    const fields = Object.keys(data).filter(k => k !== 'id' && k !== 'profesional_id' && k !== 'created_at');
    
    if (fields.length === 0) return new Response(JSON.stringify({ error: 'No hay campos para actualizar' }), { status: 400 });
    
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = [...fields.map(f => data[f]), id, userId, now];
    
    const stmt = db.prepare(`UPDATE citas SET ${setClause}, updated_at = ? WHERE id = ? AND profesional_id = ?`);
    await stmt.bind(...values).run();

    ctx.waitUntil(syncToSupabase(env, 'citas', { ...data, id, profesional_id: userId }, 'UPDATE'));
    ctx.waitUntil(logAudit(env, userId, 'UPDATE', 'citas', id, null, data));

    return new Response(JSON.stringify({ id, ...data }));
  }

  if (action === 'DELETE') {
    if (!id) return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });
    
    const stmt = db.prepare('DELETE FROM citas WHERE id = ? AND profesional_id = ?');
    await stmt.bind(id, userId).run();

    ctx.waitUntil(syncToSupabase(env, 'citas', { id, profesional_id: userId }, 'DELETE'));
    ctx.waitUntil(logAudit(env, userId, 'DELETE', 'citas', id));

    return new Response(JSON.stringify({ success: true }));
  }

  return new Response(JSON.stringify({ error: 'Método no permitido' }), { status: 405 });
}

async function handleFacturas(request, env, action, id, userId) {
  const db = env.DB;

  if (action === 'GET') {
    if (id) {
      const stmt = db.prepare(`
        SELECT f.*, p.nombre as paciente_nombre, e.nombre as empresa_nombre
        FROM facturas f
        LEFT JOIN pacientes p ON f.paciente_id = p.id
        LEFT JOIN empresas e ON f.empresa_id = e.id
        WHERE f.id = ? AND f.profesional_id = ?
      `);
      const result = await stmt.bind(id, userId).first();
      if (!result) {
        return new Response(JSON.stringify({ error: 'Factura no encontrada' }), { status: 404 });
      }
      return new Response(JSON.stringify(result));
    } else {
      const url = new URL(request.url);
      const estado = url.searchParams.get('estado');
      const empresaId = url.searchParams.get('empresa_id');
      
      let query = `SELECT f.*, p.nombre as paciente_nombre FROM facturas f LEFT JOIN pacientes p ON f.paciente_id = p.id WHERE f.profesional_id = ?`;
      let params = [userId];
      
      if (estado) {
        query += ' AND f.estado = ?';
        params.push(estado);
      }
      if (empresaId) {
        query += ' AND f.empresa_id = ?';
        params.push(empresaId);
      }
      query += ' ORDER BY f.fecha_emision DESC';
      
      const stmt = db.prepare(query);
      const results = await stmt.bind(...params).all();
      return new Response(JSON.stringify(results.results || []));
    }
  }

  if (action === 'POST') {
    const data = await request.json();
    const now = new Date().toISOString();
    
    if (!data.numero_factura || !data.total) {
      return new Response(JSON.stringify({ error: 'Número de factura y total son requeridos' }), { status: 400 });
    }

    const newId = crypto.randomUUID();
    const stmt = db.prepare(`
      INSERT INTO facturas (id, numero_factura, paciente_id, empresa_id, profesional_id,
                           fecha_emision, fecha_vencimiento, subtotal, descuento, iva, total,
                           estado, forma_pago, items, cups_codes, observaciones,
                           created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    await stmt.bind(
      newId, data.numero_factura, data.paciente_id, data.empresa_id, userId,
      data.fecha_emision || now, data.fecha_vencimiento, data.subtotal || 0,
      data.descuento || 0, data.iva || 0, data.total, data.estado || 'pendiente',
      data.forma_pago, JSON.stringify(data.items || []), JSON.stringify(data.cups_codes || []),
      data.observaciones, now, now
    ).run();

    // Crear movimiento de caja si está pagada
    if (data.estado === 'pagada' && data.forma_pago) {
      const cajaId = crypto.randomUUID();
      const cajaStmt = db.prepare(`
        INSERT INTO caja_movimientos (id, user_id, tipo_movimiento, concepto, monto, saldo_anterior, saldo_nuevo, metodo_pago, factura_id, creado_por, created_at)
        VALUES (?, ?, 'ingreso', ?, ?, 0, ?, ?, ?, ?, ?)
      `);
      await cajaStmt.bind(cajaId, userId, `Pago factura ${data.numero_factura}`, data.total, data.total, data.forma_pago, newId, userId, now).run();
    }

    ctx.waitUntil(syncToSupabase(env, 'facturas', { ...data, id: newId, profesional_id: userId }, 'INSERT'));
    ctx.waitUntil(logAudit(env, userId, 'CREATE', 'facturas', newId, null, data));

    return new Response(JSON.stringify({ id: newId, ...data }), { status: 201 });
  }

  if (action === 'PUT') {
    if (!id) return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });
    
    const data = await request.json();
    const now = new Date().toISOString();
    const fields = Object.keys(data).filter(k => k !== 'id' && k !== 'profesional_id' && k !== 'created_at');
    
    if (fields.length === 0) return new Response(JSON.stringify({ error: 'No hay campos para actualizar' }), { status: 400 });
    
    const oldData = await db.prepare('SELECT * FROM facturas WHERE id = ?').bind(id).first();
    
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = [...fields.map(f => {
      if (['items', 'cups_codes'].includes(f)) {
        return typeof data[f] === 'object' ? JSON.stringify(data[f]) : data[f];
      }
      return data[f];
    }), id, userId, now];
    
    const stmt = db.prepare(`UPDATE facturas SET ${setClause}, updated_at = ? WHERE id = ? AND profesional_id = ?`);
    await stmt.bind(...values).run();

    // Si cambia estado a pagada, registrar en caja
    if (oldData && oldData.estado !== 'pagada' && data.estado === 'pagada' && data.forma_pago) {
      const cajaId = crypto.randomUUID();
      const cajaStmt = db.prepare(`
        INSERT INTO caja_movimientos (id, user_id, tipo_movimiento, concepto, monto, saldo_anterior, saldo_nuevo, metodo_pago, factura_id, creado_por, created_at)
        VALUES (?, ?, 'ingreso', ?, ?, 0, ?, ?, ?, ?, ?)
      `);
      await cajaStmt.bind(cajaId, userId, `Pago factura ${data.numero_factura}`, data.total, data.total, data.forma_pago, id, userId, now).run();
    }

    ctx.waitUntil(syncToSupabase(env, 'facturas', { ...data, id, profesional_id: userId }, 'UPDATE'));
    ctx.waitUntil(logAudit(env, userId, 'UPDATE', 'facturas', id, oldData, data));

    return new Response(JSON.stringify({ id, ...data }));
  }

  if (action === 'DELETE') {
    if (!id) return new Response(JSON.stringify({ error: 'ID requerido' }), { status: 400 });
    
    const stmt = db.prepare('DELETE FROM facturas WHERE id = ? AND profesional_id = ?');
    await stmt.bind(id, userId).run();

    ctx.waitUntil(syncToSupabase(env, 'facturas', { id, profesional_id: userId }, 'DELETE'));
    ctx.waitUntil(logAudit(env, userId, 'DELETE', 'facturas', id));

    return new Response(JSON.stringify({ success: true }));
  }

  return new Response(JSON.stringify({ error: 'Método no permitido' }), { status: 405 });
}

async function handleUsuarios(request, env, action, id, userId) {
  const db = env.DB;

  if (action === 'GET') {
    if (id) {
      const stmt = db.prepare('SELECT * FROM usuarios WHERE id = ?');
      const result = await stmt.bind(id).first();
      if (!result) {
        return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), { status: 404 });
      }
      // No retornar datos sensibles
      delete result.configuracion;
      return new Response(JSON.stringify(result));
    } else {
      // Solo retornar perfil del usuario autenticado
      const stmt = db.prepare('SELECT id, email, nombre_completo, rol, especialidad, licencia_medica, telefono, avatar_url FROM usuarios WHERE id = ?');
      const result = await stmt.bind(userId).first();
      if (!result) {
        return new Response(JSON.stringify({ error: 'Usuario no encontrado' }), { status: 404 });
      }
      return new Response(JSON.stringify(result));
    }
  }

  if (action === 'PUT') {
    if (!id || id !== userId) {
      return new Response(JSON.stringify({ error: 'Solo puedes actualizar tu propio perfil' }), { status: 403 });
    }
    
    const data = await request.json();
    const now = new Date().toISOString();
    const fields = Object.keys(data).filter(k => k !== 'id' && k !== 'email' && k !== 'created_at');
    
    if (fields.length === 0) return new Response(JSON.stringify({ error: 'No hay campos para actualizar' }), { status: 400 });
    
    const setClause = fields.map(f => `${f} = ?`).join(', ');
    const values = [...fields.map(f => data[f]), id, now];
    
    const stmt = db.prepare(`UPDATE usuarios SET ${setClause}, updated_at = ? WHERE id = ?`);
    await stmt.bind(...values).run();

    ctx.waitUntil(syncToSupabase(env, 'usuarios', { ...data, id }, 'UPDATE'));
    ctx.waitUntil(logAudit(env, userId, 'UPDATE', 'usuarios', id, null, data));

    return new Response(JSON.stringify({ id, ...data }));
  }

  return new Response(JSON.stringify({ message: 'Gestión de usuarios vía Supabase Auth. Use PUT para actualizar perfil extendido.' }));
}

async function handleSync(request, env, action, userId) {
  const db = env.DB;
  
  if (action === 'GET') {
    // Verificar estado de cola de sincronización
    const pending = await db.prepare('SELECT COUNT(*) as count FROM sync_queue WHERE status = ?').bind('pending').first();
    const failed = await db.prepare('SELECT COUNT(*) as count FROM sync_queue WHERE status = ?').bind('failed').first();
    
    return new Response(JSON.stringify({
      status: 'active',
      pending_count: pending?.count || 0,
      failed_count: failed?.count || 0,
      last_sync: new Date().toISOString()
    }));
  }
  
  if (action === 'POST') {
    // Forzar reprocesamiento de fallidos
    const failed = await db.prepare('SELECT * FROM sync_queue WHERE status = ? LIMIT 10').bind('failed').all();
    
    for (const item of (failed.results || [])) {
      try {
        await syncToSupabase(env, item.table_name, JSON.parse(item.data), item.operation);
        await db.prepare('UPDATE sync_queue SET status = ?, processed_at = ? WHERE id = ?').bind('completed', new Date().toISOString(), item.id).run();
      } catch (error) {
        await db.prepare('UPDATE sync_queue SET retry_count = retry_count + 1, error_message = ? WHERE id = ?').bind(error.message, item.id).run();
      }
    }
    
    return new Response(JSON.stringify({ message: 'Sincronización forzada completada', reprocessed: failed.results?.length || 0 }));
  }
  
  return new Response(JSON.stringify({ message: 'Sincronización automática habilitada', status: 'active' }));
}

// ============================================================================
// AUDITORÍA Y LOGGING
// ============================================================================

async function logAudit(env, userId, action, entidad, registroId, datosAnteriores = null, datosNuevos = null) {
  try {
    const db = env.DB;
    const id = crypto.randomUUID();
    const now = new Date().toISOString();
    
    const stmt = db.prepare(`
      INSERT INTO auditoria_logs (id, user_id, accion, entidad, registro_id, datos_anteriores, datos_nuevos, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    
    await stmt.bind(
      id, userId, action, entidad, registroId,
      datosAnteriores ? JSON.stringify(datosAnteriores) : null,
      datosNuevos ? JSON.stringify(datosNuevos) : null,
      now
    ).run();
  } catch (error) {
    console.error('Error logging audit:', error);
    // No fallar la operación principal por error en auditoría
  }
}

// ============================================================================
// SINCRONIZACIÓN CON SUPABASE (RESPALDO ASÍNCRONO)
// ============================================================================

async function syncToSupabase(env, table, data, operation) {
  try {
    const supabaseUrl = env.SUPABASE_URL;
    const supabaseKey = env.SUPABASE_SERVICE_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.warn('Supabase credentials not configured, skipping sync');
      return;
    }

    const url = `${supabaseUrl}/rest/v1/${table}`;
    const headers = {
      'apikey': supabaseKey,
      'Authorization': `Bearer ${supabaseKey}`,
      'Content-Type': 'application/json',
      'Prefer': operation === 'UPDATE' ? 'return=representation' : 'return=representation'
    };

    let body;
    let method = 'POST';

    if (operation === 'INSERT') {
      body = JSON.stringify(data);
      method = 'POST';
    } else if (operation === 'UPDATE') {
      body = JSON.stringify(data);
      method = 'PATCH'; // Supabase usa PATCH para actualizaciones parciales
      url += `?id=eq.${data.id}`;
    } else if (operation === 'DELETE') {
      method = 'DELETE';
      url += `?id=eq.${data.id}`;
    }

    const response = await fetch(url, {
      method,
      headers,
      body: operation !== 'DELETE' ? body : undefined
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Error syncing ${table} to Supabase:`, response.status, errorText);
    } else {
      console.log(`Successfully synced ${operation} for ${table}:${data.id} to Supabase`);
    }
  } catch (error) {
    console.error('Exception during Supabase sync:', error);
    // No relanzar el error para no afectar la operación principal en D1
  }
}
