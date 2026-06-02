import React, { useState } from 'react';
import { Shield, Search, FileText, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { sp } from '../../../shared/lib/storage';

const PACIENTES_KEY = 'siso_pacientes';

export const WorkerPortal = () => {
  const [codigo, setCodigo] = useState('');
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  const buscar = () => {
    if (!codigo.trim()) {
      setError('Ingrese su código de verificación');
      return;
    }

    setCargando(true);
    setError('');
    setResultado(null);

    // Simular búsqueda con pequeño delay
    setTimeout(() => {
      const pacientes = sp(PACIENTES_KEY, []);
      const encontrado = pacientes.find(
        (p) =>
          (p.codigoVerificacion || p.codigo || '').toUpperCase() === codigo.trim().toUpperCase() ||
          (p.documento || '') === codigo.trim()
      );

      if (encontrado) {
        setResultado({
          nombre: encontrado.nombre || encontrado.paciente || 'Paciente',
          documento: encontrado.documento || 'N/A',
          concepto: encontrado.concepto || encontrado.conceptoAptitud || 'Pendiente',
          restricciones: encontrado.restricciones || [],
          recomendaciones: encontrado.recomendaciones || [],
          fechaExamen: encontrado.fechaExamen || encontrado.fecha || 'No registrada',
          empresa: encontrado.empresa || encontrado.empresaNombre || '',
          tipoExamen: encontrado.tipoExamen || encontrado.tipo || '',
        });
      } else {
        setError('No se encontraron resultados con ese código. Verifique e intente nuevamente.');
      }
      setCargando(false);
    }, 500);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') buscar();
  };

  const conceptoColor = (concepto) => {
    const c = (concepto || '').toLowerCase();
    if (c.includes('apto sin') || c === 'apto') return 'bg-green-100 text-green-800 border-green-300';
    if (c.includes('apto con')) return 'bg-yellow-100 text-yellow-800 border-yellow-300';
    if (c.includes('no apto') || c.includes('aplazado')) return 'bg-red-100 text-red-800 border-red-300';
    return 'bg-blue-100 text-blue-800 border-blue-300';
  };

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="text-center">
        <Shield className="w-12 h-12 text-teal-600 mx-auto mb-3" />
        <h2 className="text-xl font-black text-gray-800">Portal del Trabajador</h2>
        <p className="text-sm text-gray-500 mt-1">
          Consulte los resultados de su examen médico ocupacional
        </p>
        <p className="text-xs text-gray-400 mt-1">
          No requiere inicio de sesión · Res. 1552/2013
        </p>
      </div>

      {/* Búsqueda */}
      <div className="bg-white border rounded-xl p-5 shadow-sm">
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          Código de verificación
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={codigo}
            onChange={(e) => { setCodigo(e.target.value); setError(''); }}
            onKeyDown={handleKeyDown}
            className="flex-1 border rounded-lg px-4 py-2.5 text-sm focus:ring-2 focus:ring-teal-400 uppercase"
            placeholder="Ingrese su código..."
            maxLength={20}
          />
          <button
            onClick={buscar}
            disabled={cargando}
            className="px-5 py-2.5 bg-teal-600 text-white rounded-lg font-semibold flex items-center gap-2 hover:bg-teal-700 disabled:opacity-50 transition"
          >
            <Search className="w-4 h-4" /> Buscar
          </button>
        </div>
        {error && (
          <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" /> {error}
          </div>
        )}
      </div>

      {/* Resultado */}
      {resultado && (
        <div className="bg-white border rounded-xl p-5 shadow-sm space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h3 className="font-bold text-gray-800 text-lg">{resultado.nombre}</h3>
              <p className="text-sm text-gray-500">Documento: {resultado.documento}</p>
              {resultado.empresa && (
                <p className="text-xs text-gray-400">Empresa: {resultado.empresa}</p>
              )}
            </div>
            <div className="flex items-center gap-1 text-xs text-gray-400">
              <Clock className="w-3 h-3" /> {resultado.fechaExamen}
            </div>
          </div>

          {/* Concepto */}
          <div className={`p-4 rounded-xl border-2 ${conceptoColor(resultado.concepto)}`}>
            <p className="text-xs font-semibold uppercase opacity-70">Concepto de Aptitud</p>
            <p className="text-lg font-black mt-1">{resultado.concepto}</p>
            {resultado.tipoExamen && (
              <p className="text-xs mt-1 opacity-70">Tipo: {resultado.tipoExamen}</p>
            )}
          </div>

          {/* Restricciones */}
          {resultado.restricciones?.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-gray-700 flex items-center gap-1 mb-2">
                <AlertCircle className="w-4 h-4 text-orange-500" /> Restricciones
              </h4>
              <ul className="space-y-1">
                {resultado.restricciones.map((r, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-orange-500 mt-0.5">⚠</span>
                    {typeof r === 'string' ? r : r.texto || r.descripcion || JSON.stringify(r)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Recomendaciones */}
          {resultado.recomendaciones?.length > 0 && (
            <div>
              <h4 className="text-sm font-bold text-gray-700 flex items-center gap-1 mb-2">
                <CheckCircle className="w-4 h-4 text-green-500" /> Recomendaciones
              </h4>
              <ul className="space-y-1">
                {resultado.recomendaciones.map((r, i) => (
                  <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-green-500 mt-0.5">✓</span>
                    {typeof r === 'string' ? r : r.texto || r.descripcion || JSON.stringify(r)}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <p className="text-[10px] text-gray-400 text-center pt-2 border-t">
            Conforme a la Resolución 1552 de 2013 y Ley 1581 de 2012 (Habeas Data).
            Para mayor información, comuníquese con su empleador o el servicio de salud ocupacional.
          </p>
        </div>
      )}
    </div>
  );
};
