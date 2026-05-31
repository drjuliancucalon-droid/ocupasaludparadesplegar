// src/pages/AnalisisDocsEmpresas.jsx
// Análisis de Documentación Portal — detecta bloques periódicos (>3 trabajadores
// "PERIODICO" misma empresa+mes) y muestra qué documentos faltan
// (Informe sociodemográfico + Carta de custodia).
// Reutiliza savedInformes y la navegación existente — no duplica lógica.

import React, { useState, useMemo, useEffect } from "react";
import { Building2, FileText, FolderOpen, CheckCircle2, AlertTriangle, ArrowRight, ChevronDown, ChevronUp, ExternalLink, Upload, Loader2 } from "lucide-react";

const nitNorm = (n) => (n || "").toString().replace(/[^0-9]/g, "");
const nitMatch = (a, b) => {
  const na = nitNorm(a), nb = nitNorm(b);
  if (!na || !nb) return false;
  if (na === nb) return true;
  if (na.length > 6 && na.slice(0, -1) === nb) return true;
  if (nb.length > 6 && nb.slice(0, -1) === na) return true;
  return false;
};
const yearMonth = (date) => {
  if (!date) return null;
  const m = String(date).match(/^(\d{4})-(\d{2})/);
  return m ? `${m[1]}-${m[2]}` : null;
};
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
const ymLabel = (ym) => {
  if (!ym) return "Sin fecha";
  const [y, m] = ym.split("-");
  return `${MESES[parseInt(m) - 1]} ${y}`;
};

// Considera "PERIODICO" como subtipo objetivo para bloques.
// Resto (INGRESO, EGRESO, POSTINCAPACIDAD, SEGUIMIENTO, etc.) → individuales.
const esPeriodico = (a) => (a?.tipoExamen || a?.subtipo || "").toUpperCase().includes("PERIODIC");

export default function AnalisisDocsEmpresas({
  companies,
  patientsList,
  atencionesCerradas,
  savedInformes,
  goTo,
  goBack,
  showAlert,
  currentUser,
  setSelectedCompanyReport,
  setReportStartDate,
  setReportEndDate,
  publicarAlPortalFn,        // función _publicarAlPortalEmpresa expuesta desde App
  workerUrl,                  // _WORKER_URL para verificar estado portal
  workerToken,                // _WORKER_TOKEN
}) {
  const [expanded, setExpanded] = useState(null); // "nit|ym"
  const [portalStatus, setPortalStatus] = useState({}); // { "nit|ym": { tieneInformePortal, tieneCustodiaPortal, loaded } }
  const [publishing, setPublishing] = useState({}); // { "nit|ym|tipo": true }
  const [refreshTick, setRefreshTick] = useState(0);

  // ─── Lógica de detección de bloques ───────────────────────────────────────
  const { bloquesIncompletos, bloquesCompletos, individuales, stats } = useMemo(() => {
    // Fuente: atencionesCerradas (autoritativa) — con fallback a patientsList HC cerradas
    const fuente = Array.isArray(atencionesCerradas) && atencionesCerradas.length > 0
      ? atencionesCerradas
      : (Array.isArray(patientsList) ? patientsList.filter(p => p?.estadoHistoria === "Cerrada") : []);

    // Solo atenciones de empresas reales (excluir PARTICULAR NIT=1)
    const periodicos = fuente.filter(a => {
      const nit = nitNorm(a?.empresaNit);
      return esPeriodico(a) && nit && nit !== "1";
    });
    const noPeriodicos = fuente.filter(a => !esPeriodico(a));

    // Agrupar PERIODICO por (empresaNit + año-mes)
    const grupos = new Map();
    for (const a of periodicos) {
      const nit = nitNorm(a.empresaNit);
      const ym = yearMonth(a.fechaExamen || a.fechaCierre || a.fechaAtencion);
      if (!ym) continue;
      const k = `${nit}|${ym}`;
      if (!grupos.has(k)) grupos.set(k, {
        nit, ym, empresaNombre: a.empresaNombre, trabajadores: []
      });
      grupos.get(k).trabajadores.push(a);
    }

    // Bloques: solo grupos con > 3 trabajadores
    const bloques = [...grupos.values()].filter(g => g.trabajadores.length > 3);

    // Para cada bloque, verificar si tiene informe + custodia en savedInformes
    const enrich = (g) => {
      const empData = (companies || []).find(c => nitMatch(c.nit, g.nit));
      const informe = (savedInformes || []).find(i =>
        !i.tipo && nitMatch(i.empresaNit, g.nit) &&
        (yearMonth(i.fecha) === g.ym || (i.periodo || "").startsWith(g.ym))
      ) || (savedInformes || []).find(i =>
        !i.tipo && empData && i.empresaId === empData.id &&
        (yearMonth(i.fecha) === g.ym || (i.periodo || "").startsWith(g.ym))
      );
      const custodia = (savedInformes || []).find(i =>
        i.tipo === "custodia" && nitMatch(i.empresaNit, g.nit) &&
        (yearMonth(i.fecha) === g.ym || (i.periodo || "").startsWith(g.ym))
      ) || (savedInformes || []).find(i =>
        i.tipo === "custodia" && empData && i.empresaId === empData.id &&
        (yearMonth(i.fecha) === g.ym || (i.periodo || "").startsWith(g.ym))
      );
      return {
        ...g,
        empresaId: empData?.id,
        nombre: empData?.nombre || g.empresaNombre || "(sin nombre)",
        codigoPortal: empData?.portalCode || null,
        informe,
        custodia,
        tieneInforme: !!informe,
        tieneCustodia: !!custodia,
        completo: !!informe && !!custodia,
      };
    };

    const enriched = bloques.map(enrich);
    const incompletos = enriched.filter(b => !b.completo);
    const completos = enriched.filter(b => b.completo);

    // Estadísticas individuales
    const indivByTipo = {};
    for (const a of noPeriodicos) {
      const t = ((a?.tipoExamen || a?.subtipo || "OTRO").toUpperCase());
      indivByTipo[t] = (indivByTipo[t] || 0) + 1;
    }

    return {
      bloquesIncompletos: incompletos.sort((a, b) => (b.ym || "").localeCompare(a.ym || "")),
      bloquesCompletos: completos.sort((a, b) => (b.ym || "").localeCompare(a.ym || "")),
      individuales: { porTipo: indivByTipo, total: noPeriodicos.length },
      stats: {
        totalBloques: enriched.length,
        completos: completos.length,
        incompletos: incompletos.length,
        totalAtenciones: fuente.length,
        atencionesPeriodicas: periodicos.length,
        atencionesIndividuales: noPeriodicos.length,
        empresasInvolucradas: new Set(enriched.map(b => b.nit)).size,
      }
    };
  }, [companies, patientsList, atencionesCerradas, savedInformes]);

  // ─── Lectura del portal para detectar qué está YA PUBLICADO ──────────────
  // Para cada bloque, consulta siso_portal_empresa_docs_{nit} y verifica si
  // el periodo (yyyy-mm) ya tiene informe / custodia registrados.
  useEffect(() => {
    if (!workerUrl || !workerToken) return;
    const todos = [...bloquesIncompletos, ...bloquesCompletos];
    const pendientes = todos.filter(b => !portalStatus[`${b.nit}|${b.ym}`]?.loaded);
    if (pendientes.length === 0) return;
    let cancelled = false;
    (async () => {
      // De-duplicar por NIT para no hacer fetch redundantes
      const nitsUnicos = [...new Set(pendientes.map(b => b.nit))];
      for (const nit of nitsUnicos) {
        if (cancelled) return;
        const tryKeys = [`siso_portal_empresa_docs_${nit}`];
        if (nit.length > 6) tryKeys.push(`siso_portal_empresa_docs_${nit.slice(0, -1)}`);
        let portalData = null;
        for (const k of tryKeys) {
          try {
            const r = await fetch(`${workerUrl}/store/${encodeURIComponent(k)}`, {
              headers: { "X-Siso-Token": workerToken }
            });
            if (r.ok) {
              const d = await r.json();
              if (d[0]?.value) { portalData = d[0].value; break; }
            }
          } catch {}
        }
        if (cancelled) return;
        const periodosPortal = portalData?.periodos || [];
        // Actualizar status para TODOS los bloques de este NIT
        setPortalStatus(prev => {
          const out = { ...prev };
          for (const b of todos.filter(x => x.nit === nit)) {
            const key = `${b.nit}|${b.ym}`;
            const per = periodosPortal.find(p => (p.fecha || "").startsWith(b.ym) || (p.periodo || "").includes(b.ym));
            out[key] = {
              loaded: true,
              tieneInformePortal: !!per?.informe,
              tieneCustodiaPortal: !!per?.custodia,
              tieneCuentaPortal: !!per?.cuenta,
              portalDataRaw: portalData,
            };
          }
          return out;
        });
      }
    })();
    return () => { cancelled = true; };
  }, [bloquesIncompletos, bloquesCompletos, workerUrl, workerToken, refreshTick]);

  // ─── Publicar informe/custodia EXISTENTE al portal ───────────────────────
  const publicarExistente = async (bloque, tipo /* 'informe' | 'custodia' */) => {
    const doc = tipo === "custodia" ? bloque.custodia : bloque.informe;
    if (!doc) {
      showAlert?.("No hay documento para publicar.");
      return;
    }
    if (!publicarAlPortalFn) {
      showAlert?.("Función de publicación no disponible.");
      return;
    }
    const pubKey = `${bloque.nit}|${bloque.ym}|${tipo}`;
    setPublishing(prev => ({ ...prev, [pubKey]: true }));
    try {
      await publicarAlPortalFn(doc);
      // Forzar releer portal status después de un breve delay para
      // que el Worker termine de procesar la escritura.
      setTimeout(() => {
        setPortalStatus(prev => {
          const out = { ...prev };
          delete out[`${bloque.nit}|${bloque.ym}`];
          return out;
        });
        setRefreshTick(t => t + 1);
      }, 1500);
    } catch (e) {
      showAlert?.("Error publicando: " + (e?.message || "desconocido"));
    } finally {
      setPublishing(prev => ({ ...prev, [pubKey]: false }));
    }
  };

  // ─── Acciones — navegan a flujos existentes ────────────────────────────────
  const irAGenerarInforme = (bloque) => {
    if (!bloque.empresaId) {
      showAlert?.("La empresa no tiene ID interno asociado. Crea/edita la empresa primero.");
      return;
    }
    // Pre-set en el módulo de Reportes
    setSelectedCompanyReport?.(bloque.empresaId);
    // Setear filtro de fechas al mes del bloque (primer y último día)
    if (bloque.ym) {
      const [y, m] = bloque.ym.split("-");
      const ini = `${y}-${m}-01`;
      const finMes = new Date(parseInt(y), parseInt(m), 0).getDate();
      const fin = `${y}-${m}-${String(finMes).padStart(2, "0")}`;
      setReportStartDate?.(ini);
      setReportEndDate?.(fin);
    }
    goTo?.("reporte");
  };

  const irACrearCustodia = (bloque) => {
    goTo?.("custodia");
    // El módulo CartaCustodia permitirá seleccionar la empresa internamente
  };

  const verEnPortal = (bloque) => {
    if (!bloque.codigoPortal || !bloque.nit) {
      showAlert?.("Esta empresa no tiene código de portal aún.");
      return;
    }
    showAlert?.(`Para ver en portal:\n\nNIT: ${bloque.nit}\nCódigo: ${bloque.codigoPortal}\n\nIngresa al Portal Público y usa estos datos.`);
  };

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Header */}
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-black text-emerald-900 flex items-center gap-2">
            <FileText className="w-6 h-6" /> Análisis Documentación Portal
          </h2>
          <button onClick={() => goBack?.()} className="text-gray-500 font-bold text-sm">← Volver</button>
        </div>

        {/* Explicación regla */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4 text-xs">
          <p className="font-black text-blue-800 mb-1">📐 Regla de detección automática</p>
          <ul className="text-blue-700 leading-relaxed pl-5 list-disc">
            <li><b>Bloque periódico</b> = más de 3 trabajadores con examen <b>PERIODICO</b> de la misma empresa en el mismo mes.</li>
            <li>Los bloques REQUIEREN: certificados + informe sociodemográfico + carta de custodia.</li>
            <li>Exámenes individuales (ingreso, egreso, post-incapacidad, seguimiento) y particulares NO requieren informe ni custodia.</li>
            <li>Las cuentas de cobro son una preocupación separada (módulo Contabilidad V2).</li>
          </ul>
        </div>

        {/* Resumen */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <p className="text-2xl font-black text-emerald-700">{stats.totalBloques}</p>
            <p className="text-[10px] text-gray-600 uppercase font-bold">Bloques detectados</p>
          </div>
          <div className="bg-white rounded-xl border border-emerald-200 p-3 text-center">
            <p className="text-2xl font-black text-emerald-700">{stats.completos}</p>
            <p className="text-[10px] text-emerald-600 uppercase font-bold">✅ Completos</p>
          </div>
          <div className="bg-white rounded-xl border border-amber-200 p-3 text-center">
            <p className="text-2xl font-black text-amber-700">{stats.incompletos}</p>
            <p className="text-[10px] text-amber-600 uppercase font-bold">⚠️ Incompletos</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <p className="text-2xl font-black text-gray-700">{stats.atencionesIndividuales}</p>
            <p className="text-[10px] text-gray-500 uppercase font-bold">Individuales</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-200 p-3 text-center">
            <p className="text-2xl font-black text-purple-700">{stats.empresasInvolucradas}</p>
            <p className="text-[10px] text-gray-500 uppercase font-bold">Empresas con bloque</p>
          </div>
        </div>

        {/* Bloques incompletos */}
        {bloquesIncompletos.length > 0 && (
          <section className="mb-6">
            <h3 className="text-sm font-black text-amber-800 mb-2 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" /> Bloques INCOMPLETOS — requieren acción
            </h3>
            <div className="bg-white rounded-xl border border-amber-200 overflow-hidden">
              {bloquesIncompletos.map((b) => {
                const key = `${b.nit}|${b.ym}`;
                const isOpen = expanded === key;
                const faltan = [];
                if (!b.tieneInforme) faltan.push("Informe");
                if (!b.tieneCustodia) faltan.push("Custodia");
                return (
                  <div key={key} className="border-b border-amber-100 last:border-b-0">
                    <button
                      onClick={() => setExpanded(isOpen ? null : key)}
                      className="w-full px-4 py-3 flex items-center justify-between hover:bg-amber-50 transition text-left"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-sm text-gray-800 truncate">{b.nombre}</p>
                        <p className="text-[10px] text-gray-500 mt-0.5">
                          NIT {b.nit} · {ymLabel(b.ym)} · <b>{b.trabajadores.length}</b> trabajadores
                        </p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border ${b.tieneInforme ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-red-100 text-red-800 border-red-300'}`}>
                          INF {b.tieneInforme ? '✓' : '✗'}
                        </span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-black border ${b.tieneCustodia ? 'bg-emerald-100 text-emerald-800 border-emerald-300' : 'bg-red-100 text-red-800 border-red-300'}`}>
                          CUS {b.tieneCustodia ? '✓' : '✗'}
                        </span>
                        {isOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                      </div>
                    </button>
                    {isOpen && (
                      <div className="px-4 pb-4 bg-amber-50/40 space-y-3 border-t border-amber-100">
                        {/* Lista trabajadores */}
                        <details className="text-xs">
                          <summary className="cursor-pointer font-bold text-gray-700 py-1">📋 Ver {b.trabajadores.length} trabajadores</summary>
                          <div className="mt-2 max-h-48 overflow-y-auto bg-white rounded-lg border border-gray-200 p-2 space-y-1">
                            {b.trabajadores.map((t, i) => (
                              <div key={i} className="text-[11px] text-gray-700 flex justify-between">
                                <span>{t.nombres || "(sin nombre)"}</span>
                                <span className="font-mono text-gray-400">CC {t.docNumero || "?"}</span>
                              </div>
                            ))}
                          </div>
                        </details>

                        {/* Estado de publicación al portal */}
                        {(() => {
                          const statusKey = `${b.nit}|${b.ym}`;
                          const status = portalStatus[statusKey];
                          const infoPubKey = `${b.nit}|${b.ym}|informe`;
                          const cusPubKey = `${b.nit}|${b.ym}|custodia`;
                          return (
                            <div className="grid md:grid-cols-2 gap-2 pt-2">
                              {/* Informe */}
                              <div className={`rounded-xl p-3 border ${b.tieneInforme ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-amber-300'}`}>
                                <p className="text-xs font-black mb-2 flex items-center gap-1">
                                  <FileText className="w-3.5 h-3.5" /> Informe sociodemográfico {b.tieneInforme && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                                </p>
                                {b.tieneInforme ? (
                                  <div className="space-y-1.5">
                                    <p className="text-[10px] text-emerald-700">✓ Generado el {b.informe.fecha || "(sin fecha)"}</p>
                                    {status?.loaded && (
                                      status.tieneInformePortal ? (
                                        <p className="text-[10px] text-emerald-700 flex items-center gap-1">
                                          <CheckCircle2 className="w-3 h-3" /> Publicado en portal
                                        </p>
                                      ) : (
                                        <button
                                          onClick={() => publicarExistente(b, "informe")}
                                          disabled={publishing[infoPubKey]}
                                          className="w-full py-1 px-2 bg-orange-600 text-white rounded text-[10px] font-black hover:bg-orange-700 transition flex items-center justify-center gap-1 disabled:opacity-50"
                                        >
                                          {publishing[infoPubKey] ? (
                                            <><Loader2 className="w-3 h-3 animate-spin" /> Publicando…</>
                                          ) : (
                                            <><Upload className="w-3 h-3" /> Publicar al portal</>
                                          )}
                                        </button>
                                      )
                                    )}
                                    {!status?.loaded && (
                                      <p className="text-[10px] text-gray-400 italic">Verificando portal…</p>
                                    )}
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => irAGenerarInforme(b)}
                                    className="w-full py-1.5 px-3 bg-blue-600 text-white rounded-lg text-xs font-black hover:bg-blue-700 transition flex items-center justify-center gap-1"
                                  >
                                    Generar con IA <ArrowRight className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                              {/* Custodia */}
                              <div className={`rounded-xl p-3 border ${b.tieneCustodia ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-amber-300'}`}>
                                <p className="text-xs font-black mb-2 flex items-center gap-1">
                                  <FolderOpen className="w-3.5 h-3.5" /> Carta de custodia {b.tieneCustodia && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
                                </p>
                                {b.tieneCustodia ? (
                                  <div className="space-y-1.5">
                                    <p className="text-[10px] text-emerald-700">✓ Generada el {b.custodia.fecha || "(sin fecha)"}</p>
                                    {status?.loaded && (
                                      status.tieneCustodiaPortal ? (
                                        <p className="text-[10px] text-emerald-700 flex items-center gap-1">
                                          <CheckCircle2 className="w-3 h-3" /> Publicada en portal
                                        </p>
                                      ) : (
                                        <button
                                          onClick={() => publicarExistente(b, "custodia")}
                                          disabled={publishing[cusPubKey]}
                                          className="w-full py-1 px-2 bg-orange-600 text-white rounded text-[10px] font-black hover:bg-orange-700 transition flex items-center justify-center gap-1 disabled:opacity-50"
                                        >
                                          {publishing[cusPubKey] ? (
                                            <><Loader2 className="w-3 h-3 animate-spin" /> Publicando…</>
                                          ) : (
                                            <><Upload className="w-3 h-3" /> Publicar al portal</>
                                          )}
                                        </button>
                                      )
                                    )}
                                    {!status?.loaded && (
                                      <p className="text-[10px] text-gray-400 italic">Verificando portal…</p>
                                    )}
                                  </div>
                                ) : (
                                  <button
                                    onClick={() => irACrearCustodia(b)}
                                    className="w-full py-1.5 px-3 bg-purple-600 text-white rounded-lg text-xs font-black hover:bg-purple-700 transition flex items-center justify-center gap-1"
                                  >
                                    Generar carta <ArrowRight className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })()}

                        <p className="text-[10px] text-gray-500 italic text-center">
                          📌 Los documentos nuevos se publican automáticamente. Los existentes usa el botón naranja para publicar.
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* Bloques completos */}
        {bloquesCompletos.length > 0 && (
          <section className="mb-6">
            <h3 className="text-sm font-black text-emerald-800 mb-2 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4" /> Bloques COMPLETOS — publicados en portal
            </h3>
            <div className="bg-white rounded-xl border border-emerald-200 overflow-hidden">
              {bloquesCompletos.map((b) => (
                <div key={`${b.nit}|${b.ym}`} className="px-4 py-3 border-b border-emerald-50 last:border-b-0 flex justify-between items-center">
                  <div>
                    <p className="font-black text-sm text-gray-800">{b.nombre}</p>
                    <p className="text-[10px] text-gray-500">{ymLabel(b.ym)} · {b.trabajadores.length} trabajadores</p>
                  </div>
                  <button
                    onClick={() => verEnPortal(b)}
                    className="text-[10px] bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-1 rounded-lg font-bold hover:bg-emerald-200 flex items-center gap-1"
                  >
                    Ver en portal <ExternalLink className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Individuales — info */}
        {individuales.total > 0 && (
          <section className="mb-6">
            <h3 className="text-sm font-black text-gray-700 mb-2 flex items-center gap-2">
              ⚪ Exámenes individuales (no requieren informe ni custodia)
            </h3>
            <div className="bg-gray-50 rounded-xl border border-gray-200 p-3 text-xs flex flex-wrap gap-2">
              {Object.entries(individuales.porTipo).sort((a, b) => b[1] - a[1]).map(([tipo, count]) => (
                <span key={tipo} className="bg-white border border-gray-200 px-2 py-1 rounded-lg font-bold">
                  {tipo} <span className="text-emerald-700">×{count}</span>
                </span>
              ))}
              <span className="ml-auto text-gray-500 italic">Total: {individuales.total}</span>
            </div>
          </section>
        )}

        {/* Estado vacío */}
        {stats.totalBloques === 0 && (
          <div className="bg-white rounded-2xl border border-gray-200 p-10 text-center">
            <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="font-black text-gray-700">No se detectaron bloques periódicos</p>
            <p className="text-xs text-gray-500 mt-1">Un bloque requiere más de 3 trabajadores con examen PERIODICO de la misma empresa en el mismo mes.</p>
          </div>
        )}
      </div>
    </div>
  );
}
