import React, { useState } from 'react';
import { Brain, Loader2, FileText, AlertTriangle, Shield, Clipboard } from 'lucide-react';
import { _ss, sps } from '../../../shared/lib/storage';

const NIVELES_RIESGO = ['I - Mínimo', 'II - Bajo', 'III - Medio', 'IV - Alto', 'V - Máximo'];

const EXAMENES_BASE = {
  'I - Mínimo': ['Examen médico ocupacional', 'Visiometría', 'Optometría'],
  'II - Bajo': ['Examen médico ocupacional', 'Visiometría', 'Audiometría', 'Laboratorio básico (hemograma, glicemia)'],
  'III - Medio': [
    'Examen médico ocupacional', 'Visiometría', 'Audiometría', 'Espirometría',
    'Laboratorio (hemograma, glicemia, perfil lipídico)', 'Electrocardiograma',
  ],
  'IV - Alto': [
    'Examen médico ocupacional', 'Visiometría', 'Audiometría', 'Espirometría',
    'Laboratorio completo', 'Electrocardiograma', 'Rx tórax', 'Pruebas psicotécnicas',
  ],
  'V - Máximo': [
    'Examen médico ocupacional', 'Visiometría', 'Audiometría', 'Espirometría',
    'Laboratorio completo (incluye tóxicos)', 'Electrocardiograma', 'Rx tórax',
    'Pruebas psicotécnicas', 'Prueba de esfuerzo', 'RMN según exposición',
  ],
};

const FRECUENCIAS = {
  'I - Mínimo': 'Cada 3 años',
  'II - Bajo': 'Cada 2 años',
  'III - Medio': 'Anual',
  'IV - Alto': 'Anual',
  'V - Máximo': 'Semestral',
};

export const ProfesiogramaAI = () => {
  const [cargo, setCargo] = useState('');
  const [area, setArea] = useState('');
  const [nivelRiesgo, setNivelRiesgo] = useState('III - Medio');
  const [resultado, setResultado] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState('');
  const [usandoIA, setUsandoIA] = useState(false);

  const generarConIA = async () => {
    if (!cargo.trim()) {
      setError('Ingrese el nombre del cargo');
      return;
    }
    setCargando(true);
    setError('');
    setUsandoIA(true);

    try {
      // Intentar usar IA configurada
      const aiKeys = sps('siso_ai_keys', {});
      const geminiKey = aiKeys?.gemini;

      if (geminiKey) {
        const prompt = `Eres un médico especialista en salud ocupacional en Colombia. Genera un profesiograma para:
- Cargo: ${cargo}
- Área: ${area || 'General'}
- Nivel de riesgo: ${nivelRiesgo}

Responde SOLO en formato JSON (sin markdown) con esta estructura:
{
  "cargo": "${cargo}",
  "area": "${area || 'General'}",
  "nivelRiesgo": "${nivelRiesgo}",
  "examenes": ["examen1", "examen2"],
  "frecuencia": "periodicidad recomendada",
  "riesgos": ["riesgo1", "riesgo2"],
  "epp": ["equipo1", "equipo2"],
  "restricciones": ["restricción1"],
  "normativa": ["Decreto 1072/2015", "Res. 0312/2019"]
}`;

        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { temperature: 0.3 },
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
          const jsonMatch = text.match(/\{[\s\S]*\}/);
          if (jsonMatch) {
            const parsed = JSON.parse(jsonMatch[0]);
            setResultado(parsed);
            setCargando(false);
            return;
          }
        }
      }

      // Fallback: generar sin IA usando base de datos local
      generarLocal();
    } catch {
      // Fallback silencioso
      generarLocal();
    }
    setCargando(false);
  };

  const generarLocal = () => {
    setUsandoIA(false);
    const examenes = EXAMENES_BASE[nivelRiesgo] || EXAMENES_BASE['III - Medio'];
    const frecuencia = FRECUENCIAS[nivelRiesgo] || 'Anual';

    setResultado({
      cargo: cargo || 'Sin especificar',
      area: area || 'General',
      nivelRiesgo,
      examenes,
      frecuencia,
      riesgos: [
        'Riesgo biomecánico por postura',
        'Riesgo psicosocial',
        nivelRiesgo.includes('IV') || nivelRiesgo.includes('V') ? 'Riesgo químico/físico según exposición' : 'Riesgo locativo',
      ].filter(Boolean),
      epp: [
        'Dotación según cargo',
        nivelRiesgo.includes('IV') || nivelRiesgo.includes('V') ? 'EPP específico según GTC 45' : null,
      ].filter(Boolean),
      restricciones: ['Según hallazgos del examen médico ocupacional'],
      normativa: ['Decreto 1072/2015', 'Resolución 0312/2019', 'GTC 45'],
    });
    setCargando(false);
  };

  const handleGenerar = () => {
    generarConIA();
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
        <Brain className="w-5 h-5 text-purple-600" /> Profesiograma IA
      </h2>

      <p className="text-xs text-gray-500">
        Genera perfiles de riesgo y exámenes recomendados por cargo. Usa IA cuando está configurada, o base de datos local como respaldo.
      </p>

      {/* Formulario */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Cargo *</label>
          <input
            type="text"
            value={cargo}
            onChange={(e) => setCargo(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400"
            placeholder="Ej: Operario de planta"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Área</label>
          <input
            type="text"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400"
            placeholder="Ej: Producción"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Nivel de riesgo</label>
          <select
            value={nivelRiesgo}
            onChange={(e) => setNivelRiesgo(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-purple-400"
          >
            {NIVELES_RIESGO.map((n) => (
              <option key={n} value={n}>{n}</option>
            ))}
          </select>
        </div>
      </div>

      <button
        onClick={handleGenerar}
        disabled={cargando}
        className="px-6 py-2.5 bg-purple-600 text-white rounded-xl font-semibold flex items-center gap-2 hover:bg-purple-700 disabled:opacity-50 transition"
      >
        {cargando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
        {cargando ? 'Generando...' : 'Generar Profesiograma'}
      </button>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Resultado */}
      {resultado && (
        <div className="bg-white border rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <FileText className="w-5 h-5 text-purple-600" /> Profesiograma: {resultado.cargo}
            </h3>
            {!usandoIA && (
              <span className="text-[10px] bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">
                Base local (sin IA)
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[10px] text-gray-500 uppercase">Cargo</p>
              <p className="text-sm font-semibold">{resultado.cargo}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[10px] text-gray-500 uppercase">Área</p>
              <p className="text-sm font-semibold">{resultado.area}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[10px] text-gray-500 uppercase">Nivel de riesgo</p>
              <p className="text-sm font-semibold">{resultado.nivelRiesgo}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-[10px] text-gray-500 uppercase">Frecuencia</p>
              <p className="text-sm font-semibold">{resultado.frecuencia}</p>
            </div>
          </div>

          {/* Exámenes */}
          <div>
            <h4 className="text-sm font-bold text-gray-700 flex items-center gap-1 mb-2">
              <Clipboard className="w-4 h-4" /> Exámenes recomendados
            </h4>
            <ul className="space-y-1">
              {(resultado.examenes || []).map((ex, i) => (
                <li key={i} className="text-sm text-gray-700 flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-purple-100 text-purple-700 flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  {ex}
                </li>
              ))}
            </ul>
          </div>

          {/* Riesgos */}
          {resultado.riesgos?.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-gray-700 flex items-center gap-1 mb-2">
                <AlertTriangle className="w-4 h-4 text-orange-500" /> Riesgos identificados
              </h4>
              <ul className="space-y-1">
                {resultado.riesgos.map((r, i) => (
                  <li key={i} className="text-sm text-gray-600">• {r}</li>
                ))}
              </ul>
            </div>
          )}

          {/* EPP */}
          {resultado.epp?.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-gray-700 flex items-center gap-1 mb-2">
                <Shield className="w-4 h-4 text-blue-500" /> EPP requerido
              </h4>
              <ul className="space-y-1">
                {resultado.epp.map((e, i) => (
                  <li key={i} className="text-sm text-gray-600">• {e}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Normativa */}
          {resultado.normativa?.length > 0 && (
            <div className="pt-2 border-t">
              <p className="text-[10px] text-gray-400">
                Normativa aplicable: {resultado.normativa.join(' · ')}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
