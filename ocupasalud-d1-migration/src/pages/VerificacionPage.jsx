// src/pages/VerificacionPage.jsx — Verificación pública + Portal Trabajador + Carnet
// B-10: Búsqueda NIT, display checklists, carnet digital
// Ref. monolito: App.jsx líneas 44882-46000
import React, { useState, useRef } from 'react';
import { useParams } from 'react-router-dom';
import {
  ShieldCheck, Search, Loader2, AlertCircle, CheckCircle,
  Building2, User, Printer, QrCode, Download, FileText
} from 'lucide-react';

const SB_URL = 'https://yqrrktrgoijgzccrxnpz.supabase.co';
const SB_KEY = 'sb_publishable_K88qYuJ9wsWjQqnIhLVK7Q_NroFvPI7';

// Semáforo de concepto de aptitud (verde/amarillo/rojo)
const getAptitudColor = (concepto = '') => {
  const c = concepto.toUpperCase();
  if (c.includes('NO APTO')) return { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500', label: 'NO APTO' };
  if (c.includes('RESTRICCIONES') || c.includes('CON RESTRICCIÓN')) return { bg: 'bg-yellow-100', text: 'text-yellow-700', dot: 'bg-yellow-500', label: 'APTO CON RESTRICCIONES' };
  if (c.includes('APTO')) return { bg: 'bg-green-100', text: 'text-green-700', dot: 'bg-green-500', label: 'APTO' };
  return { bg: 'bg-gray-100', text: 'text-gray-700', dot: 'bg-gray-400', label: concepto };
};

// Buscar en Supabase por clave
const sbGet = async (key) => {
  const res = await fetch(
    `${SB_URL}/rest/v1/siso_store?key=eq.${encodeURIComponent(key)}&select=value`,
    { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
  );
  if (!res.ok) return null;
  const rows = await res.json();
  return rows?.[0]?.value || null;
};

export default function VerificacionPage() {
  const { codigo: urlCodigo } = useParams();
  const [codigo, setCodigo] = useState(urlCodigo || '');
  const [nit, setNit] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null); // portalData de un trabajador
  const [empresaResult, setEmpresaResult] = useState(null); // índice de empresa (por NIT)
  const [empresaWorkers, setEmpresaWorkers] = useState([]); // lista de HC por NIT
  const [error, setError] = useState('');
  const [mode, setMode] = useState('codigo'); // 'codigo' | 'nit'
  const carnetRef = useRef(null);

  // Búsqueda por código QR o cédula
  const buscarPorCodigo = async () => {
    if (!codigo.trim()) { setError('Ingresa un código de verificación o número de cédula'); return; }
    setLoading(true); setError(''); setResult(null); setEmpresaResult(null);
    try {
      // 1. Por código QR
      let data = await sbGet(`siso_portal_${codigo.trim()}`);
      if (!data) data = await sbGet(`siso_portal_CV-${codigo.trim()}`);
      // 2. Por cédula
      if (!data) data = await sbGet(`siso_portal_doc_${codigo.trim().replace(/\s/g, '')}`);
      if (data) { setResult(data); }
      else setError('No se encontró ninguna historia clínica con ese código.');
    } catch (err) { setError('Error al buscar: ' + err.message); }
    finally { setLoading(false); }
  };

  // B-10: Búsqueda por NIT de empresa (para RR.HH.)
  const buscarPorNIT = async () => {
    if (!nit.trim()) { setError('Ingresa el NIT de la empresa'); return; }
    setLoading(true); setError(''); setResult(null); setEmpresaResult(null); setEmpresaWorkers([]);
    try {
      const nitLimpio = nit.replace(/[^0-9]/g, '');
      const empresaIdx = await sbGet(`siso_portal_empresa_${nitLimpio}`);
      if (!empresaIdx) { setError('No se encontraron registros para ese NIT.'); setLoading(false); return; }
      setEmpresaResult(empresaIdx);
      // Cargar la HC de cada documento en el índice
      const workers = [];
      for (const docNum of (empresaIdx.documentos || [])) {
        try {
          const w = await sbGet(`siso_portal_doc_${docNum}`);
          if (w) workers.push(w);
        } catch {}
      }
      setEmpresaWorkers(workers);
    } catch (err) { setError('Error al buscar: ' + err.message); }
    finally { setLoading(false); }
  };

  // Auto-search si viene código en URL
  React.useEffect(() => {
    if (urlCodigo) buscarPorCodigo();
  }, []);

  // B-10: Generar carnet digital e imprimir
  const imprimirCarnet = (r) => {
    if (!r) return;
    const apt = getAptitudColor(r.conceptoAptitud || '');
    const html = `
<!DOCTYPE html><html><head><meta charset="utf-8"><title>Carnet</title>
<style>
  body { margin: 0; font-family: Arial, sans-serif; background: #f0f4f8; display: flex; justify-content: center; align-items: center; min-height: 100vh; }
  .carnet { width: 85.6mm; min-height: 54mm; background: white; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,.2); overflow: hidden; }
  .header { background: linear-gradient(135deg, #065f46, #0d9488); color: white; padding: 10px 14px; }
  .header h3 { margin: 0; font-size: 11px; font-weight: 900; letter-spacing: .5px; }
  .header p { margin: 0; font-size: 8px; opacity: .8; }
  .body { padding: 10px 14px; }
  .name { font-size: 14px; font-weight: 900; color: #111; margin-bottom: 2px; }
  .info { font-size: 9px; color: #555; margin-bottom: 1px; }
  .apt { display: inline-block; padding: 3px 10px; border-radius: 20px; font-size: 9px; font-weight: 900; margin: 6px 0; }
  .apto { background: #d1fae5; color: #065f46; }
  .restricciones { background: #fef3c7; color: #92400e; }
  .no-apto { background: #fee2e2; color: #991b1b; }
  .footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 6px 14px; display: flex; justify-content: space-between; align-items: center; }
  .codigo { font-size: 7px; color: #94a3b8; font-family: monospace; }
  .vigencia { font-size: 7px; color: #64748b; }
</style></head><body>
<div class="carnet">
  <div class="header">
    <h3>🏥 SISO — OCUPASALUD</h3>
    <p>Certificado de Aptitud Médico-Laboral · Res. 1843/2025</p>
  </div>
  <div class="body">
    <div class="name">${r.nombres || ''} ${r.apellidos || ''}</div>
    <div class="info">CC/NIT: ${r.docNumero || '---'} · Cargo: ${r.cargo || '---'}</div>
    <div class="info">Empresa: ${r.empresaNombre || r.empresa || '---'}</div>
    <div class="info">Tipo examen: ${r.tipoExamen || '---'} · Fecha: ${r.fechaExamen || '---'}</div>
    <div class="apt ${apt.label === 'APTO' ? 'apto' : apt.label.includes('RESTRICCIONES') ? 'restricciones' : 'no-apto'}">
      ${apt.label}
    </div>
    <div class="info">Médico: ${r.medicoNombre || r._doctorData?.nombre || '---'}</div>
  </div>
  <div class="footer">
    <div class="codigo">Cód: ${r.codigoVerificacion || '---'}</div>
    <div class="vigencia">Vigencia: ${r.vigencia || '1 año'}</div>
  </div>
</div>
<script>window.onload = () => { window.print(); }</script>
</body></html>`;
    const w = window.open('', '_blank', 'width=400,height=300');
    w.document.write(html);
    w.document.close();
  };

  const aptitud = result ? getAptitudColor(result.conceptoAptitud || '') : null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 via-white to-teal-50 flex flex-col items-center px-4 py-12">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-tr from-emerald-700 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg">
            <ShieldCheck className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-gray-800">Portal de Verificación</h1>
          <div className="h-0.5 w-12 bg-gradient-to-r from-emerald-500 to-teal-400 mx-auto my-2 rounded-full" />
          <p className="text-gray-500 text-sm">Consulta de Historia Clínica Ocupacional · Res. 1843/2025</p>
        </div>

        {/* Tabs: código / NIT */}
        <div className="flex bg-gray-100 rounded-xl p-1 mb-4">
          <button
            onClick={() => { setMode('codigo'); setError(''); setResult(null); setEmpresaResult(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${mode === 'codigo' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <QrCode className="w-4 h-4" /> Por Código / Cédula
          </button>
          <button
            onClick={() => { setMode('nit'); setError(''); setResult(null); setEmpresaResult(null); }}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-bold rounded-lg transition-all ${mode === 'nit' ? 'bg-white text-emerald-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
          >
            <Building2 className="w-4 h-4" /> Por NIT Empresa
          </button>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
          {/* Input búsqueda */}
          {mode === 'codigo' ? (
            <div className="flex gap-2">
              <input type="text" value={codigo}
                onChange={(e) => setCodigo(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && buscarPorCodigo()}
                placeholder="Código QR, cédula o número de documento"
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
                disabled={loading}
              />
              <button onClick={buscarPorCodigo} disabled={loading}
                className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white px-5 py-3 rounded-xl font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
              </button>
            </div>
          ) : (
            <div>
              <div className="flex gap-2">
                <input type="text" value={nit}
                  onChange={(e) => setNit(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && buscarPorNIT()}
                  placeholder="NIT de la empresa (ej: 901234567)"
                  className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-emerald-400 outline-none"
                  disabled={loading}
                />
                <button onClick={buscarPorNIT} disabled={loading}
                  className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white px-5 py-3 rounded-xl font-bold hover:opacity-90 disabled:opacity-50 flex items-center gap-2">
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-2">Acceso para gestores de RR.HH. — Ver todos los trabajadores de la empresa</p>
            </div>
          )}

          {error && (
            <div className="mt-4 flex items-center gap-2 bg-red-50 text-red-700 px-4 py-3 rounded-xl text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0" /><span>{error}</span>
            </div>
          )}

          {/* Resultado: trabajador individual */}
          {result && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between bg-emerald-50 px-4 py-2 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-700">
                  <CheckCircle className="w-5 h-5" />
                  <span className="font-bold text-sm">Historia Clínica verificada ✅</span>
                </div>
                <button onClick={() => imprimirCarnet(result)}
                  className="flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-white border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-colors">
                  <Printer className="w-3.5 h-3.5" /> Carnet
                </button>
              </div>

              {/* Datos principales */}
              <div className="border border-gray-200 rounded-xl p-4 space-y-2 text-sm">
                <div className="flex items-center gap-3 pb-2 border-b">
                  <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
                    <User className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div>
                    <p className="font-black text-gray-800 text-base">{result.nombres} {result.apellidos || ''}</p>
                    <p className="text-xs text-gray-500">{result.docTipo || 'CC'} {result.docNumero}</p>
                  </div>
                  {/* Semáforo aptitud */}
                  <div className={`ml-auto px-3 py-1.5 rounded-xl text-xs font-black ${aptitud.bg} ${aptitud.text}`}>
                    <span className={`inline-block w-2 h-2 rounded-full ${aptitud.dot} mr-1`}></span>
                    {aptitud.label}
                  </div>
                </div>

                {[
                  ['Empresa', result.empresaNombre || result.empresa],
                  ['Cargo', result.cargo],
                  ['ARL', result.arl],
                  ['Tipo examen', result.tipoExamen],
                  ['Fecha', result.fechaExamen],
                  ['Vigencia', result.vigencia],
                  ['Énfasis', result.enfasisExamen],
                ].filter(([, v]) => v).map(([label, val]) => (
                  <div key={label} className="flex justify-between items-center py-0.5">
                    <span className="text-gray-500">{label}</span>
                    <span className="font-medium text-gray-800">{val}</span>
                  </div>
                ))}

                {/* Diagnóstico principal */}
                {result.diagnosticoPrincipal && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Diagnóstico principal</p>
                    <p className="text-sm font-medium text-gray-700">{result.diagnosticoPrincipal}</p>
                  </div>
                )}

                {/* B-10: Restricciones con checklist formateado */}
                {(result.restricciones || result.restriccionesChecklist) && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Restricciones médico-laborales</p>
                    {typeof result.restriccionesChecklist === 'object' && Object.keys(result.restriccionesChecklist || {}).length > 0 ? (
                      <ul className="space-y-1">
                        {Object.entries(result.restriccionesChecklist).filter(([, v]) => v).map(([k]) => (
                          <li key={k} className="flex items-start gap-2 text-xs text-gray-700">
                            <span className="text-amber-500 font-bold mt-0.5">✓</span> {k}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-gray-700 bg-gray-50 p-2 rounded-lg whitespace-pre-line">{result.restricciones}</p>
                    )}
                  </div>
                )}

                {/* B-10: Recomendaciones con checklist formateado */}
                {(result.recomendaciones || result.recomendacionesChecklist) && (
                  <div className="pt-2 border-t">
                    <p className="text-xs text-gray-400 uppercase tracking-wider mb-1">Recomendaciones</p>
                    {typeof result.recomendacionesChecklist === 'object' && Object.keys(result.recomendacionesChecklist || {}).length > 0 ? (
                      <ul className="space-y-1">
                        {Object.entries(result.recomendacionesChecklist).filter(([, v]) => v).map(([k]) => (
                          <li key={k} className="flex items-start gap-2 text-xs text-gray-700">
                            <span className="text-emerald-500 font-bold mt-0.5">✓</span> {k}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-gray-700 bg-gray-50 p-2 rounded-lg whitespace-pre-line">{result.recomendaciones}</p>
                    )}
                  </div>
                )}

                {/* Médico firmante */}
                {(result._doctorData?.nombre || result.medicoNombre) && (
                  <div className="pt-2 border-t flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400">Médico firmante</p>
                      <p className="text-sm font-bold text-gray-800">{result._doctorData?.nombre || result.medicoNombre}</p>
                      {result._doctorData?.licencia && (
                        <p className="text-xs text-gray-500">RM: {result._doctorData.licencia}</p>
                      )}
                    </div>
                    {result._firma && (
                      <img src={result._firma} alt="Firma" className="h-10 opacity-80" />
                    )}
                  </div>
                )}

                {/* Código de verificación */}
                {result.codigoVerificacion && (
                  <div className="flex justify-between border-t pt-2 mt-2">
                    <span className="text-gray-500 text-xs">Código QR</span>
                    <span className="font-mono text-xs text-emerald-600">{result.codigoVerificacion}</span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* B-10: Resultado lista empresa por NIT */}
          {empresaResult && (
            <div className="mt-6 space-y-4">
              <div className="flex items-center justify-between bg-emerald-50 px-4 py-2 rounded-xl">
                <div className="flex items-center gap-2 text-emerald-700">
                  <Building2 className="w-5 h-5" />
                  <span className="font-bold text-sm">Empresa: {empresaResult.nombre || nit}</span>
                </div>
                <span className="text-xs text-emerald-600 font-bold">{empresaWorkers.length} trabajadores</span>
              </div>

              {empresaWorkers.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">Cargando registros de trabajadores...</p>
              ) : (
                <>
                  {/* NUEVO: Botón para acceder al portal completo */}
                  <div className="flex items-center justify-between mb-3 bg-emerald-50 p-3 rounded-lg border border-emerald-200">
                    <div>
                      <p className="text-sm font-bold text-emerald-800">Portal de Documentos Completo</p>
                      <p className="text-xs text-emerald-600">
                        Acceda a certificados descargables, informes, cuentas de cobro y cartas de custodia
                      </p>
                    </div>
                    <button
                      onClick={() => {
                        window.location.href = `/portal-certificados?nit=${encodeURIComponent(nit)}`;
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700 transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      Ver Portal
                    </button>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="text-left py-2 px-3 font-bold text-gray-600">Trabajador</th>
                          <th className="text-left py-2 px-3 font-bold text-gray-600">Cargo</th>
                          <th className="text-left py-2 px-3 font-bold text-gray-600">Fecha</th>
                          <th className="text-left py-2 px-3 font-bold text-gray-600">Concepto</th>
                          <th className="text-left py-2 px-3 font-bold text-gray-600">Vigencia</th>
                          <th className="py-2 px-3"></th>
                        </tr>
                      </thead>
                      <tbody>
                        {empresaWorkers.map((w, i) => {
                          const apt = getAptitudColor(w.conceptoAptitud || '');
                          return (
                            <tr key={i} className="border-b hover:bg-gray-50">
                              <td className="py-2 px-3">
                                <p className="font-bold text-gray-800">{w.nombres}</p>
                                <p className="text-gray-400">{w.docTipo} {w.docNumero}</p>
                              </td>
                              <td className="py-2 px-3 text-gray-600">{w.cargo}</td>
                              <td className="py-2 px-3 text-gray-500">{w.fechaExamen}</td>
                              <td className="py-2 px-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${apt.bg} ${apt.text}`}>
                                  {apt.label}
                                </span>
                              </td>
                              <td className="py-2 px-3 text-gray-500">{w.vigencia}</td>
                              <td className="py-2 px-3">
                                <button onClick={() => { setResult(w); setMode('codigo'); window.scrollTo(0, 0); }}
                                  className="text-emerald-600 hover:underline font-bold text-[10px]">Ver</button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          SISO OcupaSalud · Res. 1843/2025 · Ley 527/1999 · Verificación digital
        </p>
      </div>
    </div>
  );
}
