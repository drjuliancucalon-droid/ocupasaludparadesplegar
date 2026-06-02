const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.SUPABASE_URL || 'https://your-project.supabase.co';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'your-anon-key';
const supabase = createClient(supabaseUrl, supabaseKey);

app.get('/api/empresa-encuestas-socio/:empresaId', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('reports')
      .select(`
        *,
        patients (
          nombres, apellidos, docTipo, docNumero, fechaNacimiento, genero,
          eps, arl, nivel_riesgo_arl, afp, escolaridad, estado_civil,
          dependencia_area, cargo_actual, antigüedad_cargo, turno_trabajo,
          tipo_contrato, telefono_fijo, celular, email, direccion_residencia,
          zona_residencia, estrato, tipo_vivienda, personas_cargo,
          grupo_sanguineo, grupo_etnico
        )
      `)
      .eq('empresaId', req.params.empresaId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    res.json(data);
  } catch (error) {
    console.error('Error encuestas:', error);
    res.status(500).json({ error: error.message });
  }
});

