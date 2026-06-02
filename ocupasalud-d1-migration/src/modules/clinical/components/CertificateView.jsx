// ═══════════════════════════════════════════════════════════════════════════
// CertificateView.jsx — Certificado de Aptitud Laboral COMPLETO
// Res. 1843/2025 (deroga Res. 2346/2007)
// Port FIEL del monolito renderCertificado (líneas 22562-23321)
// ═══════════════════════════════════════════════════════════════════════════
import React from 'react';
import { FileText, Lock } from 'lucide-react';
import { BrandLogo } from '../../../shared/components/ui/BrandLogo';
import { DoctorSignature } from '../../../shared/components/ui/DoctorSignature';

/**
 * CertificateView — Certificado de Aptitud Laboral imprimible
 * Muestra datos del paciente, concepto, énfasis especializado, firma.
 */
export const CertificateView = ({
  data,
  activeDoctorData,
  activeSignature,
  currentUser,
  onDownloadRDA,
  onPrintCarnet,
}) => {
  // Helper: badge normal/anormal
  const badNorm = (v, normal = 'Normal') =>
    v && v !== normal ? 'font-bold text-red-700' : 'text-gray-700';

  const rowCls = 'flex justify-between text-[10px] py-0.5 border-b border-gray-100';
  const enf = data.enfasisExamen;

  return (
    <div
      className="bg-white mx-auto shadow-2xl print:shadow-none carta-visual"
      style={{ width: '21.59cm', minHeight: 'auto', padding: '1.5cm', boxSizing: 'border-box' }}
    >
      {/* ── Print mini-header ───────────────────────────────────── */}
      <div className="hidden print:block text-[8pt] text-gray-400 border-b border-gray-200 pb-1 mb-2 flex justify-between print-header-mini">
        <span>{activeDoctorData?.nombre} -- {activeDoctorData?.licencia}</span>
        <span>Paciente: {data.nombres} | {data.docTipo} {data.docNumero}</span>
      </div>

      {/* ── Header principal ────────────────────────────────────── */}
      <div className="text-center border-b-2 border-gray-800 pb-3 mb-4">
        <div className="flex justify-center scale-90 origin-bottom mb-2">
          <BrandLogo data={activeDoctorData} />
        </div>
        <h2 className="text-2xl font-black uppercase">Certificado de Aptitud Laboral</h2>
        <p className="text-xs font-medium text-gray-500">
          Resolución 1843 de 2025 (vigente) - Deroga Res. 2346 de 2007
        </p>
      </div>

      {/* ── Datos del paciente ──────────────────────────────────── */}
      <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 mb-5 print:bg-transparent print:border-gray-400">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
          {[
            { l: 'Nombre', v: data.nombres },
            { l: 'Documento', v: `${data.docTipo || 'CC'} ${data.docNumero}` },
            { l: 'Edad', v: `${data.edad || '--'} años` },
            { l: 'Empresa', v: data.empresaNombre || '--' },
            { l: 'Cargo', v: data.cargo || '--' },
            { l: 'EPS', v: data.eps || '--' },
            { l: 'ARL', v: data.arl || '--' },
            { l: 'Énfasis', v: data.enfasisExamen || '--' },
            { l: 'Tipo Evaluación', v: data.tipoExamen || '--' },
            { l: 'Fecha', v: data.fechaExamen || '--' },
            { l: 'Médico Evaluador', v: activeDoctorData?.nombre || data.medicoNombre || '--' },
          ].map((item) => (
            <div key={item.l} className="flex gap-2 items-baseline">
              <span className="text-[10px] font-black uppercase text-gray-400 w-24 flex-shrink-0">{item.l}</span>
              <span className="font-semibold text-gray-800">{item.v}</span>
            </div>
          ))}
          <div className="col-span-2 flex gap-2 items-baseline mt-1 border-t border-gray-200 pt-1">
            <span className="text-[10px] font-black uppercase text-gray-400 w-24 flex-shrink-0">Diagnóstico Ppal.</span>
            <span className="font-semibold text-gray-800">
              {data.diagnosticoPrincipal || 'Z10.0 - EXAMEN MÉDICO OCUPACIONAL'}
            </span>
          </div>
          {(data.diagnosticoSecundario1 || data.diagnosticoSecundario2) && (
            <div className="col-span-2 flex gap-2 items-start">
              <span className="text-[10px] font-black uppercase text-gray-400 w-24 flex-shrink-0 mt-0.5">Dx Secundarios</span>
              <div className="text-xs font-semibold text-gray-700 space-y-0.5">
                {data.diagnosticoSecundario1 && <div>{data.diagnosticoSecundario1}</div>}
                {data.diagnosticoSecundario2 && <div>{data.diagnosticoSecundario2}</div>}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════ */}
      {/* RESULTADOS ÉNFASIS ESPECIALIZADO                          */}
      {/* ══════════════════════════════════════════════════════════ */}
      {enf && enf !== 'GENERAL' && (
        <div className="mb-4 border border-gray-300 rounded-xl overflow-hidden">
          <div className={
            'px-3 py-1.5 font-black text-xs uppercase ' +
            (enf === 'ALTURAS' ? 'bg-sky-100 text-sky-800' :
             enf === 'ALIMENTOS' ? 'bg-yellow-100 text-yellow-800' :
             enf === 'CONFINADOS' ? 'bg-orange-100 text-orange-800' :
             enf === 'OSTEOMUSCULAR' ? 'bg-violet-100 text-violet-800' :
             'bg-rose-100 text-rose-800')
          }>
            Hallazgos Examen Énfasis:{' '}
            {enf === 'ALTURAS' ? 'Trabajo en Alturas (Res. 4272/2021)' :
             enf === 'ALIMENTOS' ? 'Manipulación de Alimentos (Res. 2674/2013)' :
             enf === 'CONFINADOS' ? 'Espacios Confinados (Res. 0491/2020)' :
             enf === 'OSTEOMUSCULAR' ? 'Osteomuscular (Res. 2404/2019)' :
             'Cardiovascular (Res. 1843/2025)'}
          </div>
          <div className="p-3 grid grid-cols-2 gap-x-4 gap-y-0 text-[10px]">
            {/* ── Alturas ──────────────────────────────────────── */}
            {enf === 'ALTURAS' && (
              <>
                <div className={rowCls}><span className="text-gray-500">Romberg</span><span className={badNorm(data.examenAlturas?.romberg)}>{data.examenAlturas?.romberg || '--'}</span></div>
                <div className={rowCls}><span className="text-gray-500">Vértigo</span><span className={badNorm(data.examenAlturas?.vertigo, 'Negativo')}>{data.examenAlturas?.vertigo || '--'}</span></div>
                <div className={rowCls}><span className="text-gray-500">Coordinación</span><span className={badNorm(data.examenAlturas?.coordinacion)}>{data.examenAlturas?.coordinacion || '--'}</span></div>
                <div className={rowCls}><span className="text-gray-500">Marcha Tandem</span><span className={badNorm(data.examenAlturas?.marcha)}>{data.examenAlturas?.marcha || '--'}</span></div>
                <div className={rowCls}><span className="text-gray-500">Nistagmus</span><span className={badNorm(data.examenAlturas?.nistagmus, 'Ausente')}>{data.examenAlturas?.nistagmus || '--'}</span></div>
                <div className={rowCls}><span className="text-gray-500">Test Miedo Alturas</span><span className={badNorm(data.examenAlturas?.testMiedo, 'Negativo')}>{data.examenAlturas?.testMiedo || '--'}</span></div>
                {data.examenAlturas?.observaciones && (
                  <div className="col-span-2 mt-1 text-gray-600 italic">{data.examenAlturas.observaciones}</div>
                )}
              </>
            )}
            {/* ── Alimentos ────────────────────────────────────── */}
            {enf === 'ALIMENTOS' && (
              <>
                <div className={rowCls}><span className="text-gray-500">Piel / Faneras</span><span className={badNorm(data.examenAlimentos?.pielFaneras)}>{data.examenAlimentos?.pielFaneras || '--'}</span></div>
                <div className={rowCls}><span className="text-gray-500">ORL (boca/faringe)</span><span className={badNorm(data.examenAlimentos?.orl)}>{data.examenAlimentos?.orl || '--'}</span></div>
                <div className={rowCls}><span className="text-gray-500">Sistema Gastrointestinal</span><span className={badNorm(data.examenAlimentos?.gastrointestinal)}>{data.examenAlimentos?.gastrointestinal || '--'}</span></div>
                {data.examenAlimentos?.observaciones && (
                  <div className="col-span-2 mt-1 text-gray-600 italic">{data.examenAlimentos.observaciones}</div>
                )}
              </>
            )}
            {/* ── Confinados ───────────────────────────────────── */}
            {enf === 'CONFINADOS' && (
              <>
                <div className={rowCls}><span className="text-gray-500">Cardiovascular</span><span className={badNorm(data.examenConfinados?.cardiovascular)}>{data.examenConfinados?.cardiovascular || '--'}</span></div>
                <div className={rowCls}><span className="text-gray-500">Respiratorio</span><span className={badNorm(data.examenConfinados?.respiratorio)}>{data.examenConfinados?.respiratorio || '--'}</span></div>
                <div className={rowCls}><span className="text-gray-500">Neurológico</span><span className={badNorm(data.examenConfinados?.neurologico)}>{data.examenConfinados?.neurologico || '--'}</span></div>
                <div className={rowCls}><span className="text-gray-500">Psicológico</span><span className={badNorm(data.examenConfinados?.psicologico, 'Apto')}>{data.examenConfinados?.psicologico || '--'}</span></div>
                <div className={rowCls}><span className="text-gray-500">ORL / Oído</span><span className={badNorm(data.examenConfinados?.otorrino)}>{data.examenConfinados?.otorrino || '--'}</span></div>
                <div className={rowCls}><span className="text-gray-500">Uso EPP Respiratorio</span><span className={badNorm(data.examenConfinados?.usoEpp, 'Apto')}>{data.examenConfinados?.usoEpp || '--'}</span></div>
                {data.examenConfinados?.hallazgosCardio && (
                  <div className="col-span-2 mt-1 text-gray-600 italic">Signos vitales: {data.examenConfinados.hallazgosCardio}</div>
                )}
                {data.examenConfinados?.observaciones && (
                  <div className="col-span-2 text-gray-600 italic">{data.examenConfinados.observaciones}</div>
                )}
              </>
            )}
            {/* ── Osteomuscular ─────────────────────────────────── */}
            {enf === 'OSTEOMUSCULAR' && (
              <>
                <div className={rowCls}><span className="text-gray-500">Columna Vertebral</span><span className={badNorm(data.examenOsteomuscular?.columna)}>{data.examenOsteomuscular?.columna || '--'}</span></div>
                <div className={rowCls}><span className="text-gray-500">Miembros Superiores</span><span className={badNorm(data.examenOsteomuscular?.miembrosSup)}>{data.examenOsteomuscular?.miembrosSup || '--'}</span></div>
                <div className={rowCls}><span className="text-gray-500">Miembros Inferiores</span><span className={badNorm(data.examenOsteomuscular?.miembrosInf)}>{data.examenOsteomuscular?.miembrosInf || '--'}</span></div>
                <div className={rowCls}><span className="text-gray-500">Sistema Muscular</span><span className={badNorm(data.examenOsteomuscular?.muscular)}>{data.examenOsteomuscular?.muscular || '--'}</span></div>
                <div className={rowCls}><span className="text-gray-500">Sistema Articular</span><span className={badNorm(data.examenOsteomuscular?.articular)}>{data.examenOsteomuscular?.articular || '--'}</span></div>
                <div className={rowCls}><span className="text-gray-500">Evaluación Postural</span><span className={badNorm(data.examenOsteomuscular?.postural)}>{data.examenOsteomuscular?.postural || '--'}</span></div>
                {(() => {
                  const pos = Object.entries(data.maniobrasOsteomusculares || {})
                    .filter(([, v]) => v?.estado === 'Positivo')
                    .map(([k]) => k);
                  return pos.length > 0 ? (
                    <div className="col-span-2 mt-1">
                      <span className="font-bold text-red-700">Maniobras positivas: </span>
                      <span className="text-red-700">{pos.join(', ')}</span>
                    </div>
                  ) : (
                    <div className="col-span-2 mt-1 text-gray-500">Maniobras especiales: todas negativas</div>
                  );
                })()}
                {data.examenOsteomuscular?.hallazgos && (
                  <div className="col-span-2 mt-1 text-gray-600 italic">{data.examenOsteomuscular.hallazgos}</div>
                )}
                {data.examenOsteomuscular?.diagnosticoFuncional && (
                  <div className="col-span-2 font-bold text-gray-700">{data.examenOsteomuscular.diagnosticoFuncional}</div>
                )}
              </>
            )}
            {/* ── Cardiovascular ────────────────────────────────── */}
            {enf === 'CORAZON' && (
              <>
                <div className={rowCls}><span className="text-gray-500">Frecuencia Cardiaca</span><span className={badNorm(data.examenCorazon?.frecuenciaCardiaca)}>{data.examenCorazon?.frecuenciaCardiaca || '--'}</span></div>
                <div className={rowCls}><span className="text-gray-500">Presión Arterial</span><span className={badNorm(data.examenCorazon?.presionArterial)}>{data.examenCorazon?.presionArterial || '--'}</span></div>
                <div className={rowCls}><span className="text-gray-500">Ritmo y Tonos</span><span className={badNorm(data.examenCorazon?.ritmoyTonos)}>{data.examenCorazon?.ritmoyTonos || '--'}</span></div>
                <div className={rowCls}><span className="text-gray-500">Pulsos Periféricos</span><span className={badNorm(data.examenCorazon?.pulsos)}>{data.examenCorazon?.pulsos || '--'}</span></div>
                <div className={rowCls}><span className="text-gray-500">Edemas</span><span className={badNorm(data.examenCorazon?.edemas, 'Ausente')}>{data.examenCorazon?.edemas || '--'}</span></div>
                <div className={rowCls}><span className="text-gray-500">Perfusión Periférica</span><span className={badNorm(data.examenCorazon?.perfusionPeriferica)}>{data.examenCorazon?.perfusionPeriferica || '--'}</span></div>
                {data.examenCorazon?.signosVitales && (
                  <div className="col-span-2 mt-1 text-gray-700"><span className="font-bold">Signos vitales: </span>{data.examenCorazon.signosVitales}</div>
                )}
                {data.examenCorazon?.imc && (
                  <div className="col-span-2 text-gray-700"><span className="font-bold">Antropometría: </span>{data.examenCorazon.imc}</div>
                )}
                {data.examenCorazon?.riesgoCV && (
                  <div className="col-span-2 text-gray-700"><span className="font-bold">Riesgo cardiovascular: </span>{data.examenCorazon.riesgoCV}</div>
                )}
                {data.examenCorazon?.hallazgos && (
                  <div className="col-span-2 mt-1 text-gray-600 italic">{data.examenCorazon.hallazgos}</div>
                )}
                {data.examenCorazon?.restricciones && (
                  <div className="col-span-2 font-bold text-gray-700">{data.examenCorazon.restricciones}</div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════ */}
      {/* CONCEPTO EMITIDO                                          */}
      {/* ══════════════════════════════════════════════════════════ */}
      <div className="mb-4 text-center p-4 border-2 border-gray-800 rounded-xl">
        <h3 className="text-xs font-bold text-gray-500 mb-1 uppercase tracking-widest">Concepto Emitido</h3>
        <div className="text-xl font-black text-gray-900 uppercase leading-tight">
          {data.conceptoAptitud || 'PENDIENTE'}
        </div>
        {data.vigencia ? (
          <div className="mt-2 inline-block bg-emerald-100 border border-emerald-400 rounded-lg px-3 py-1">
            <span className="text-[10px] font-black text-emerald-700 uppercase">Vigencia: </span>
            <span className="text-sm font-black text-emerald-900">{data.vigencia}</span>
          </div>
        ) : (
          <p className="text-[10px] text-red-500 font-bold mt-1">⚠️ Vigencia no registrada - Res. 1843/2025</p>
        )}
      </div>

      {/* Recomendaciones */}
      {data.recomendaciones && (
        <div className="mb-3">
          <h4 className="font-bold uppercase border-b border-gray-300 mb-1 text-xs text-gray-500">Recomendaciones</h4>
          <p className="text-xs whitespace-pre-wrap leading-tight">{data.recomendaciones}</p>
        </div>
      )}

      {/* Restricciones */}
      {data.analisisRestricciones && (
        <div className="mb-3">
          <h4 className="font-bold uppercase border-b border-red-300 mb-1 text-xs text-red-600">Restricciones Laborales</h4>
          <p className="text-xs whitespace-pre-wrap font-bold text-red-800 leading-tight">{data.analisisRestricciones}</p>
        </div>
      )}

      {/* HC Cerrada badge */}
      {data.estadoHistoria === 'Cerrada' && (
        <div className="mx-4 mb-3 bg-emerald-50 border-2 border-emerald-400 rounded-xl px-4 py-3 flex items-center gap-3 no-print">
          <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
            <Lock className="w-4 h-4 text-white" />
          </div>
          <div>
            <p className="text-xs font-black text-emerald-800">Historia Clínica Firmada y Cerrada</p>
            <p className="text-[10px] text-emerald-600">
              Código de verificación: <span className="font-mono font-bold">{data.codigoVerificacion || '--'}</span>
            </p>
          </div>
        </div>
      )}

      {/* ── Firmas ──────────────────────────────────────────────── */}
      <div className="mt-6 flex justify-between items-end px-4 print-break-avoid">
        <div className="text-center w-1/3">
          <div className="border-t border-gray-800 pt-1 text-[10px] font-bold">Firma del Trabajador</div>
        </div>
        <div className="text-center w-1/3">
          {/* Notas aclaratorias - Res. 1995/1999 */}
          {data.notasAclaratorias && data.notasAclaratorias.length > 0 && (
            <div className="mt-4 bg-amber-50 border border-amber-200 rounded-xl p-4 print:bg-transparent">
              <h4 className="text-xs font-black text-amber-800 uppercase mb-3 flex items-center gap-1">
                <FileText className="w-3 h-3" /> Notas Aclaratorias - Res. 1995/1999
              </h4>
              <div className="space-y-2">
                {data.notasAclaratorias.map((nota, i) => (
                  <div key={nota.id || i} className="bg-white border border-amber-200 rounded-lg p-3 text-xs">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-black text-amber-800">{nota.autor} ({nota.rol})</span>
                      <span className="text-gray-400 text-[10px]">{new Date(nota.fecha).toLocaleString('es-CO')}</span>
                    </div>
                    <p className="text-gray-700">{nota.contenido}</p>
                    <p className="text-[9px] text-gray-400 mt-1">HC Ref: {nota.codigoHC}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {/* Botón RDA - Res. 1888/2025 */}
          {data.estadoHistoria === 'Cerrada' && data.codigoVerificacion && onDownloadRDA && (
            <button
              onClick={() => onDownloadRDA(data, activeDoctorData, currentUser?.sesionId)}
              className="mb-2 flex items-center gap-1.5 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-blue-700 no-print"
            >
              <FileText className="w-3 h-3" /> Descargar RDA - Res. 1888/2025
            </button>
          )}
        </div>
        <div className="text-center w-1/3">
          <DoctorSignature signature={activeSignature} data={activeDoctorData} showData={true} />
        </div>
      </div>

      {/* ── Carné Alimentos ─────────────────────────────────────── */}
      {data.enfasisExamen === 'ALIMENTOS' && onPrintCarnet && (
        <div className="no-print my-3 bg-green-50 border border-green-300 rounded-xl p-3 flex items-center justify-between">
          <div>
            <p className="text-xs font-black text-green-800">🍽️ Carné de Manipulación de Alimentos</p>
            <p className="text-[10px] text-green-600">Carné imprimible 8.5×5.5 cm con foto y datos del trabajador</p>
          </div>
          <button
            onClick={() => onPrintCarnet(data, activeDoctorData)}
            className="px-4 py-2 bg-green-700 hover:bg-green-800 text-white text-xs font-black rounded-lg"
          >
            🖨️ Imprimir Carné
          </button>
        </div>
      )}

      {/* ── Registro entrega certificado — Res. 1843/2025 Art. 25 ─ */}
      <div className={`no-print mt-4 p-3 rounded-xl border-2 ${
        data.certificadoEntregado ? 'bg-emerald-50 border-emerald-400' : 'bg-blue-50 border-blue-200'
      }`}>
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={!!data.certificadoEntregado}
              onChange={(e) => {
                // NOTE: in the modular app the parent setData is called via a prop or context
                // This is a read-only view primarily, but we preserve the pattern
              }}
              disabled={data.estadoHistoria === 'Cerrada'}
              className="w-4 h-4 accent-emerald-600"
            />
            <span className={`text-[11px] font-black uppercase ${
              data.certificadoEntregado ? 'text-emerald-800' : 'text-blue-800'
            }`}>
              {data.certificadoEntregado
                ? '✅ Copia entregada al trabajador'
                : 'Registrar entrega de copia al trabajador'}
            </span>
          </label>
          <span className="text-[9px] text-gray-400 font-bold">Res. 1843/2025 Art. 25</span>
        </div>
        {data.certificadoEntregado && (
          <div className="flex flex-wrap gap-3 mt-2">
            <div className="flex flex-col gap-0.5">
              <label className="text-[9px] font-bold text-gray-500 uppercase">Fecha de entrega</label>
              <input type="date" value={data.fechaEntregaCertificado || ''}
                disabled className="p-1 border border-emerald-300 rounded text-xs bg-white" />
            </div>
            <div className="flex flex-col gap-0.5">
              <label className="text-[9px] font-bold text-gray-500 uppercase">Método de entrega</label>
              <span className="p-1 text-xs text-gray-700">{data.metodoEntregaCertificado || 'Física'}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CertificateView;
