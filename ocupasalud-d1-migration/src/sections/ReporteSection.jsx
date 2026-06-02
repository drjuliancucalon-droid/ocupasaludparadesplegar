import React from 'react';
import {
  FileText,
  Printer,
  Sparkles,
  BrainCircuit,
  Loader2,
  CheckCircle2,
  LogOut,
  BarChart3,
  ShieldCheck,
  HardDrive,
  UserCheck,
  FileSearch,
  Receipt,
  Shield,
} from 'lucide-react';
import { _secretariaPuede } from '../shared/data/planConfig';
import { _generarCertificadoHTMLNormalizado } from '../shared/lib/printUtils';
import { _safeLogoUrl, _sanitize } from '../shared/lib/security';
import BrandLogo from '../components/ui/BrandLogo';

export default function ReporteSection({ ctx }) {
  const {
    _isAdmin,
    activeDoctorData,
    activeSignature,
    certSelected,
    companies,
    currentUser,
    data,
    exportPatientTable,
    generateAIReport,
    goBack,
    goTo,
    handlePrint,
    isGeneratingReport,
    lista,
    np,
    p,
    patientsList,
    precioPorPaciente,
    ref,
    reportAIResult,
    reportEndDate,
    reportStartDate,
    reporteActiveTab,
    savedBillsList,
    selectedCompanyReport,
    selectedMedicoReport,
    setBillData,
    setCertSelected,
    setPrecioPorPaciente,
    setReportAIResult,
    setReportEndDate,
    setReportStartDate,
    setReporteActiveTab,
    setSelectedCompanyReport,
    setSelectedMedicoReport,
    setShowExportTable,
    showAlert,
    showExportTable,
    tipoExamen,
    u,
    usersList,
  } = ctx;

    // ── SECRETARIA GATE: "Reportes Epidemiológicos" requiere autorización del admin ──
    if (
      currentUser?.role === "secretaria" &&
      !_secretariaPuede("reporte", currentUser, usersList)
    )
      return (
        <div className="min-h-screen bg-gray-50 font-sans">
          {/* navbar rendered by App.jsx */}
          <div className="max-w-xl mx-auto px-4 py-16 text-center">
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-8 space-y-3">
              <div className="text-5xl">🔐</div>
              <p className="font-black text-amber-800 text-xl">
                Módulo restringido
              </p>
              <p className="text-amber-700 text-sm font-bold">
                Reportes Epidemiológicos
              </p>
              <p className="text-amber-600 text-xs leading-relaxed">
                Este módulo requiere autorización explícita del administrador.
                <br />
                Solicita que habilite el permiso{" "}
                <strong>"Reportes Epidemiológicos"</strong> en tu perfil.
                <br />
                (Usuarios → tu nombre → 🔐 Permisos de secretaria)
              </p>
              <button
                onClick={() => goBack()}
                className="mt-3 bg-amber-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-amber-700 transition"
              >
                ← Volver al panel
              </button>
            </div>
          </div>
        </div>
      );
    // ── IPS: auto-select empresa for empresa users ──
    const _reportEmpId = currentUser?.empresaId || selectedCompanyReport;
    if (currentUser?.empresaId && !selectedCompanyReport) {
      setTimeout(() => setSelectedCompanyReport(currentUser.empresaId), 0);
    }
    const _secMedVisibles = (() => {
      if (currentUser?.role !== "secretaria") return null;
      const secU = usersList.find(u => u.user === currentUser.user);
      const asig = secU?.medicosAsignados || [];
      return asig.length > 0 ? asig : null;
    })();
    const filtered = _reportEmpId
      ? patientsList.filter(
          (p) =>
            p.empresaId === _reportEmpId &&
            p.fechaExamen &&
            (reportStartDate ? p.fechaExamen >= reportStartDate : true) &&
            (reportEndDate ? p.fechaExamen <= reportEndDate : true) &&
            (selectedMedicoReport ? p._medicoId === selectedMedicoReport : true) &&
            (_secMedVisibles ? _secMedVisibles.includes(p._medicoId) || !p._medicoId : true)
        )
      : [];
    const total = filtered.length;
    const compName =
      companies.find((c) => c.id === selectedCompanyReport)?.nombre ||
      "Empresa";
    const countBy = (list, fn) =>
      list.reduce((acc, p) => {
        const k = fn(p) || "N/R";
        acc[k] = (acc[k] || 0) + 1;
        return acc;
      }, {});
    const getAgeRange = (a) => {
      const n = parseInt(a);
      if (isNaN(n)) return "N/R";
      if (n < 28) return "18-27";
      if (n < 38) return "28-37";
      if (n < 48) return "38-47";
      if (n < 58) return "48-57";
      return "58+";
    };
    const getIMC = (v) => {
      const b = parseFloat(v);
      if (isNaN(b)) return "N/R";
      if (b < 18.5) return "Bajo Peso";
      if (b < 25) return "Normal";
      if (b < 30) return "Sobrepeso";
      return "Obesidad";
    };
    const getTA = (v) => {
      if (!v || !v.includes("/")) return "N/R";
      const [s, d] = v.split("/").map(Number);
      if (s < 120 && d < 80) return "Normal";
      if (s < 130 && d < 80) return "Elevada";
      if (s < 140 || d < 90) return "HTA I";
      return "HTA II";
    };
    const getSeniority = (v) => {
      if (!v) return "N/R";
      const n = parseFloat((v.match(/\d+(\.\d+)?/) || [0])[0]);
      if (!n) return "N/R";
      if (v.toLowerCase().includes("mes")) return "<1 año";
      if (n < 1) return "<1 año";
      if (n <= 3) return "1-3 años";
      if (n <= 5) return "3-5 años";
      if (n <= 10) return "5-10 años";
      return ">10 años";
    };
    // Antecedentes por grupo
    const cntAntec = (grupo) =>
      filtered.filter((p) => p.antecedentesAgrupados?.[grupo]?.val).length;
    // Revisión por sistemas anormal
    const cntRevSis = (sis) =>
      filtered.filter((p) => {
        const s = p.revisionPorSistemas?.[sis];
        return (
          s &&
          s.toLowerCase() !== "normal" &&
          s.toLowerCase() !== "negativo" &&
          s.trim() !== ""
        );
      }).length;
    const stats = {
      genero: countBy(filtered, (p) => p.genero),
      edad: countBy(filtered, (p) => getAgeRange(p.edad)),
      imc: countBy(filtered, (p) => getIMC(p.imc)),
      ta: countBy(filtered, (p) => getTA(p.ta)),
      escolaridad: countBy(filtered, (p) => p.escolaridad),
      estadoCivil: countBy(filtered, (p) => p.estadoCivil),
      estrato: countBy(filtered, (p) => p.estrato || "N/R"),
      zonaResidencia: countBy(filtered, (p) => p.zonaResidencia || "N/R"),
      grupoEtnico: countBy(filtered, (p) => p.grupoEtnico || "N/R"),
      cargo: countBy(filtered, (p) => p.cargo || "N/R"),
      tipoContrato: countBy(filtered, (p) => p.tipoContrato || "N/R"),
      turnoTrabajo: countBy(filtered, (p) => p.turnoTrabajo || "N/R"),
      antiguedad: countBy(filtered, (p) => getSeniority(p.antiguedadEmpresa)),
      tipoExamen: countBy(filtered, (p) => p.tipoExamen || "N/R"),
      conceptoAptitud: countBy(filtered, (p) => p.conceptoAptitud || "N/R"),
      diagnosticos: countBy(
        filtered,
        (p) => p.diagnosticoPrincipal?.split(" - ")[0] || "Z10.0"
      ),
      hallazgos: filtered.reduce((acc, p) => {
        Object.entries(p.examenFisicoSistemas || {}).forEach(([k, v]) => {
          if (v.estado === "Anormal") acc[k] = (acc[k] || 0) + 1;
        });
        return acc;
      }, {}),
      riesgos: filtered.reduce((acc, p) => {
        Object.entries(p.riesgos || {}).forEach(([k, v]) => {
          if (v) acc[k] = (acc[k] || 0) + 1;
        });
        return acc;
      }, {}),
      // Antecedentes agrupados
      antecCardio: cntAntec("cardio"),
      antecResp: cntAntec("respiratorio"),
      antecOsteo: cntAntec("osteoarticular"),
      antecNeuro: cntAntec("neuropsiquiatrico"),
      antecMetab: cntAntec("metabolico"),
      antecQuirurg: cntAntec("quirurgico"),
      // Estilos de vida
      fumadores: filtered.filter((p) => p.habitos?.fuma === "Si").length,
      alcohol: filtered.filter((p) => p.habitos?.alcohol === "Si").length,
      deporte: filtered.filter((p) => p.habitos?.deporte === "Si").length,
      // Revisión por sistemas
      revCardio: cntRevSis("cardiovascular"),
      revResp: cntRevSis("respiratorio"),
      revOsteo: cntRevSis("osteoarticular"),
      revNeuro: cntRevSis("neurologico"),
      revGastro: cntRevSis("gastrointestinal"),
      // B-30: Analytics avanzado
      topDx: Object.entries(
        countBy(
          filtered,
          (p) =>
            (p.diagnosticos || [{ descripcion: p.diagnosticoPrincipal }])[0]
              ?.descripcion || "Sin dx"
        )
      )
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5),
      tendenciaMensual: filtered.reduce((acc, p) => {
        const m = (p.fechaExamen || "").substring(0, 7);
        if (m) acc[m] = (acc[m] || 0) + 1;
        return acc;
      }, {}),
      promedioEdad: filtered.length
        ? Math.round(
            filtered.reduce((s, p) => s + (parseInt(p.edad) || 0), 0) /
              filtered.length
          )
        : 0,
      tasaNoAptos: total
        ? Math.round(
            (filtered.filter((p) =>
              (p.conceptoAptitud || "").toLowerCase().includes("no apto")
            ).length /
              total) *
              100
          )
        : 0,
    };
    return (
      <div className="min-h-screen bg-gray-50 font-sans p-8 print:bg-white print:p-0">
        <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-2xl p-8 print:shadow-none">
          <div className="flex justify-between items-center mb-6 border-b pb-4 no-print">
            <button
              onClick={() => goBack()}
              className="text-blue-600 font-bold flex items-center gap-1"
            >
              <LogOut className="rotate-180 w-4 h-4" /> ← Volver
            </button>
            <div className="flex items-center gap-3 flex-wrap">
              <input
                type="date"
                className="text-xs border rounded p-1.5"
                value={reportStartDate}
                onChange={(e) => setReportStartDate(e.target.value)}
              />
              <span className="text-gray-400 text-xs">--</span>
              <input
                type="date"
                className="text-xs border rounded p-1.5"
                value={reportEndDate}
                onChange={(e) => setReportEndDate(e.target.value)}
              />
              <select
                className="border rounded p-1.5 text-sm max-w-[200px]"
                value={selectedCompanyReport}
                onChange={(e) => {
                  setSelectedCompanyReport(e.target.value);
                  setReportAIResult(null);
                }}
              >
                <option value="">Seleccione empresa...</option>
                {(currentUser?.empresaId
                  ? companies.filter((c) => c.id === currentUser.empresaId)
                  : companies
                ).map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.nombre}
                  </option>
                ))}
              </select>
              {(currentUser?.role === "secretaria" || _isAdmin(currentUser?.role)) && (
                <select
                  className="border-2 border-indigo-200 rounded-lg p-1.5 text-sm bg-indigo-50 text-indigo-800 font-bold"
                  value={selectedMedicoReport}
                  onChange={(e) => { setSelectedMedicoReport(e.target.value); setReportAIResult(null); }}
                >
                  <option value="">👨‍⚕️ Todos los médicos</option>
                  {(() => {
                    if (currentUser?.role === "secretaria") {
                      const secUser = usersList.find(u => u.user === currentUser.user);
                      const asig = secUser?.medicosAsignados || [];
                      const lista = asig.length > 0
                        ? usersList.filter(u => asig.includes(u.user))
                        : usersList.filter(u => ["medico","administrador","super_admin"].includes(u.role) && u.activo !== false);
                      return lista.map(m => <option key={m.user} value={m.user}>Dr. {m.name||m.user}</option>);
                    }
                    return usersList.filter(u => ["medico","administrador","super_admin"].includes(u.role) && u.activo !== false)
                      .map(m => <option key={m.user} value={m.user}>{m.name||m.user}</option>);
                  })()}
                </select>
              )}
            </div>
            <button
              onClick={() => {
                // Capturar el contenido del reporte y abrirlo en ventana nueva para impresión limpia
                const reportContent = document.querySelector('[data-report-content]');
                if (!reportContent) { handlePrint("Reporte-" + compName); return; }
                const html = reportContent.innerHTML;
                const w = window.open("", "_blank", "width=1000,height=800");
                if (!w) { showAlert("Permita ventanas emergentes para imprimir."); return; }
                w.document.write('<!DOCTYPE html><html lang="es"><head><meta charset="UTF-8"/>'
                  + '<title>[OCUPASALUD] Reporte - ' + (compName || "Empresa") + '</title>'
                  + '<script src="https://cdn.tailwindcss.com"><\/script>'
                  + '<style>'
                  + '* { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; color-adjust: exact !important; }'
                  + 'body { font-family: "Segoe UI", Arial, sans-serif; font-size: 10pt; color: #111; margin: 0; padding: 10mm 12mm; }'
                  + 'table { width: 100%; border-collapse: collapse; margin: 6px 0; page-break-inside: auto; }'
                  + 'thead { display: table-header-group; }'
                  + 'tr { page-break-inside: avoid; }'
                  + 'th { font-size: 8.5pt; font-weight: 700; padding: 5px 8px; border: 1px solid #d1d5db; }'
                  + 'td { font-size: 8.5pt; padding: 4px 8px; border: 1px solid #d1d5db; }'
                  + '.no-print, nav, button { display: none !important; }'
                  + '.print-bar { position: fixed; top: 0; left: 0; right: 0; background: #1e293b; color: #fff; padding: 8px 16px; display: flex !important; align-items: center; gap: 10px; z-index: 9999; }'
                  + '.print-bar button { display: inline-flex !important; border: none; padding: 6px 16px; border-radius: 6px; font-weight: 900; cursor: pointer; font-size: 9pt; background: #10b981; color: #fff; }'
                  + '.print-bar .btn-close { background: #ef4444; }'
                  + '@media print { .print-bar { display: none !important; } body { padding: 5mm 8mm; } }'
                  + '@page { size: letter landscape; margin: 0.8cm 1cm; }'
                  + '</style></head><body>'
                  + '<div class="print-bar"><span style="flex:1;font-weight:700;">📊 Reporte — ' + (compName || "") + '</span>'
                  + '<button onclick="window.print()">📥 Imprimir / PDF</button>'
                  + '<button class="btn-close" onclick="window.close()">✕ Cerrar</button></div>'
                  + '<div style="margin-top:50px;">' + html + '</div>'
                  + '</body></html>');
                w.document.close();
                w.focus();
              }}
              className="bg-slate-800 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2"
            >
              <Printer className="w-4 h-4" /> Imprimir
            </button>
          </div>

          {/* ── []: Estadísticas | Certificados por empresa ── */}
          {selectedCompanyReport && (
            <div className="flex gap-1 mb-6 border-b border-gray-200 no-print">
              {[
                { k: "estadisticas", l: "📊 Estadísticas y Diagnóstico" },
                { k: "certificados", l: "📄 Certificados por empresa" },
              ].map((t) => (
                <button
                  key={t.k}
                  onClick={() => {
                    setReporteActiveTab(t.k);
                    setCertSelected({});
                  }}
                  className={`px-5 py-2.5 text-xs font-black rounded-t-lg border-b-2 transition ${
                    reporteActiveTab === t.k
                      ? "border-blue-600 text-blue-700 bg-blue-50"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                  }`}
                >
                  {t.l}
                </button>
              ))}
            </div>
          )}

          {reporteActiveTab === "estadisticas" && (
            <div data-report-content>
              <div className="text-center mb-6">
                <div className="flex justify-center mb-2">
                  <BrandLogo data={activeDoctorData} />
                </div>
                <h1 className="text-xl font-black text-blue-900">
                  DIAGNÓSTICO DE CONDICIONES DE SALUD
                </h1>
                {selectedCompanyReport && (
                  <div className="mt-2 inline-block p-3 bg-blue-50 rounded-lg border border-blue-100">
                    <p className="font-bold text-blue-800 text-lg">
                      {compName}
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      Población evaluada: <strong>{total} trabajadores</strong>
                    </p>
                  </div>
                )}
              </div>
              {total > 0 ? (
                <>
                  <div className="grid grid-cols-4 gap-4 mb-6 text-center">
                    {[
                      { l: "Total evaluados", v: total, c: "blue" },
                      {
                        l: "Con hallazgos",
                        v: filtered.filter((p) =>
                          Object.values(p.examenFisicoSistemas || {}).some(
                            (s) => s.estado === "Anormal"
                          )
                        ).length,
                        c: "yellow",
                      },
                      {
                        l: "Con restricciones",
                        v: filtered.filter(
                          (p) =>
                            p.analisisRestricciones &&
                            p.analisisRestricciones.length > 10
                        ).length,
                        c: "red",
                      },
                      {
                        l: "Con riesgos activos",
                        v: filtered.filter(
                          (p) =>
                            p.riesgos && Object.values(p.riesgos).some(Boolean)
                        ).length,
                        c: "orange",
                      },
                    ].map((s) => (
                      <div
                        key={s.l}
                        className={`bg-${s.c}-50 border border-${s.c}-200 rounded-xl p-3`}
                      >
                        <p className="text-[10px] text-gray-500 uppercase font-bold">
                          {s.l}
                        </p>
                        <p
                          className={`text-3xl font-black text-${s.c}-600 mt-1`}
                        >
                          {s.v}
                        </p>
                      </div>
                    ))}
                  </div>
                  {/* B-30: Analytics Panel */}
                  <div className="grid grid-cols-2 gap-3 mb-4 no-print">
                    <div className="bg-violet-50 border border-violet-100 rounded-xl p-3">
                      <p className="text-[10px] font-black text-violet-600 uppercase mb-2">
                        🏆 Top 5 Diagnósticos
                      </p>
                      {stats.topDx.length === 0 ? (
                        <p className="text-xs text-gray-400">Sin datos</p>
                      ) : (
                        stats.topDx.map(([dx, n]) => (
                          <div
                            key={dx}
                            className="flex justify-between items-center mb-1"
                          >
                            <span className="text-[10px] text-gray-700 truncate flex-1">
                              {dx}
                            </span>
                            <span className="text-[10px] font-black text-violet-700 ml-2 bg-violet-100 px-1.5 rounded">
                              {n}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                      <p className="text-[10px] font-black text-blue-600 uppercase mb-2">
                        📈 Tendencia Mensual
                      </p>
                      {Object.entries(stats.tendenciaMensual)
                        .sort(([a], [b]) => a.localeCompare(b))
                        .slice(-6)
                        .map(([m, n]) => (
                          <div
                            key={m}
                            className="flex justify-between items-center mb-1"
                          >
                            <span className="text-[10px] text-gray-600">
                              {m}
                            </span>
                            <div className="flex items-center gap-1 flex-1 ml-2">
                              <div className="flex-1 bg-blue-100 rounded-full h-2 overflow-hidden">
                                <div
                                  className="bg-blue-500 h-full rounded-full"
                                  style={{
                                    width: `${Math.min(
                                      100,
                                      (n / total) * 100 * 3
                                    )}%`,
                                  }}
                                />
                              </div>
                              <span className="text-[10px] font-black text-blue-700 w-5 text-right">
                                {n}
                              </span>
                            </div>
                          </div>
                        ))}
                      <div className="flex gap-3 mt-2 pt-2 border-t border-blue-100">
                        <div className="text-center flex-1">
                          <p className="text-[9px] text-gray-400">Edad prom.</p>
                          <p className="text-xs font-black text-gray-700">
                            {stats.promedioEdad} años
                          </p>
                        </div>
                        <div className="text-center flex-1">
                          <p className="text-[9px] text-gray-400">
                            Tasa No Aptos
                          </p>
                          <p className="text-xs font-black text-red-600">
                            {stats.tasaNoAptos}%
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Precio por paciente + total + cuenta de cobro */}
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 mb-4 no-print">
                    <div className="flex flex-wrap items-center gap-3">
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-gray-700 whitespace-nowrap">
                          💰 Precio por paciente ($):
                        </label>
                        <input
                          type="number"
                          min="0"
                          placeholder="0"
                          value={precioPorPaciente}
                          onChange={(e) => setPrecioPorPaciente(e.target.value)}
                          className="border border-orange-300 rounded-lg px-2 py-1.5 text-sm font-bold w-32 text-right focus:outline-none focus:ring-2 focus:ring-orange-400"
                        />
                      </div>
                      {precioPorPaciente && total > 0 && (
                        <>
                          <div className="bg-white border border-orange-300 rounded-lg px-3 py-1.5 text-sm font-black text-orange-700">
                            Total: $
                            {(
                              parseFloat(precioPorPaciente || 0) * total
                            ).toLocaleString("es-CO")}
                          </div>
                          <div className="text-[10px] text-gray-500">
                            {total} pacientes × $
                            {parseFloat(precioPorPaciente).toLocaleString(
                              "es-CO"
                            )}
                          </div>
                          <button
                            onClick={() => {
                              const comp = companies.find(
                                (c) => c.id === selectedCompanyReport
                              );
                              const total2 =
                                parseFloat(precioPorPaciente || 0) * total;
                              const _maxBill = savedBillsList.reduce(
                                (mx, b) => {
                                  const n = parseInt(b.number || "0", 10);
                                  return n > mx ? n : mx;
                                },
                                0
                              );
                              const nextNum = String(_maxBill + 1).padStart(
                                3,
                                "0"
                              );
                              setBillData((p) => ({
                                ...p,
                                companyId: selectedCompanyReport || "",
                                clientName: comp?.nombre || compName,
                                clientNit: comp
                                  ? `${comp.nit}${comp.dv ? "-" + comp.dv : ""}`
                                  : "",
                                amount: String(total2),
                                number: nextNum,
                                date: new Date().toISOString().split("T")[0],
                                concept: `EXAMENES MEDICOS OCUPACIONALES - ${total} trabajador(es) evaluado(s) · $${parseFloat(
                                  precioPorPaciente
                                ).toLocaleString("es-CO")} c/u`,
                              }));
                              goTo("bill");
                            }}
                            className="bg-orange-600 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-orange-700 shadow ml-auto"
                          >
                            <Receipt className="w-3.5 h-3.5" /> Generar Cuenta
                            de Cobro
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                  {/* Botones de exportación y tabla */}
                  <div className="flex flex-wrap gap-2 mb-4 no-print">
                    <button
                      onClick={() => exportPatientTable(filtered, compName)}
                      className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-emerald-700 shadow"
                    >
                      <HardDrive className="w-3.5 h-3.5" /> Exportar CSV
                    </button>
                    <button
                      onClick={() => {
                        const compData = companies.find(
                          (c) => c.id === selectedCompanyReport
                        );
                        const _miIPSReport = currentUser?.empresaId
                          ? companies.find(
                              (c) => c.id === currentUser.empresaId
                            ) || null
                          : null;
                        const _rptIpsHtml = _miIPSReport
                          ? `<div style="text-align:right;font-size:9px;color:#555;">
                              ${
                                _safeLogoUrl(_miIPSReport.logo || "") // SEC-FIX-02
                                  ? `<img src="${_safeLogoUrl(_miIPSReport.logo)}" style="max-height:28px;max-width:70px;object-fit:contain;display:block;margin-left:auto;margin-bottom:2px;"/>`
                                  : ""
                              }
                              <b style="font-size:10px;color:#059669;">${_sanitize(
                                _miIPSReport.nombre || ""
                              )}</b><br/>
                              ${
                                _miIPSReport.nit
                                  ? `NIT: ${_sanitize(_miIPSReport.nit)}${
                                      _miIPSReport.dv
                                        ? "-" + _sanitize(_miIPSReport.dv)
                                        : ""
                                    }<br/>`
                                  : ""
                              }
                              Confidencial - Res.1843/2025
                            </div>`
                          : `<div style="text-align:right;font-size:9px;color:#555;">Confidencial - Res.1843/2025 Art.19</div>`;
                        const w = window.open("", "_blank");
                        w.document
                          .write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Tabla Trabajadores - ${_sanitize(
                          compName
                        )}</title><style>
                  body{font-family:Arial,sans-serif;font-size:10px;margin:20px;}
                  h1{font-size:14px;color:#1e293b;margin:0;}
                  .header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #059669;padding-bottom:10px;margin-bottom:12px;}
                  .company-info{font-size:9px;color:#555;line-height:1.6;}
                  table{width:100%;border-collapse:collapse;font-size:9px;}
                  th{background:#1e293b;color:white;padding:5px 6px;text-align:left;white-space:nowrap;}
                  td{padding:4px 6px;border-bottom:1px solid #e5e7eb;}
                  tr:nth-child(even){background:#f8fafc;}
                  .footer{margin-top:10px;font-size:8px;color:#888;text-align:center;}
                  @media print{body{margin:0;} button{display:none;}}
                </style></head><body>
                <div class="header">
                  <div>
                    <h1>TABLA DE TRABAJADORES EVALUADOS</h1>
                    <div class="company-info">
                      <b>Empresa:</b> ${compName} &nbsp;|&nbsp; <b>NIT:</b> ${
                          compData
                            ? compData.nit +
                              (compData.dv ? "-" + compData.dv : "")
                            : "N/A"
                        }<br/>
                      ${
                        compData?.direccion
                          ? "<b>Dirección:</b> " +
                            compData.direccion +
                            " &nbsp;|&nbsp; "
                          : ""
                      }
                      ${
                        compData?.ciudad
                          ? "<b>Ciudad:</b> " +
                            compData.ciudad +
                            " &nbsp;|&nbsp; "
                          : ""
                      }
                      ${
                        compData?.telefono
                          ? "<b>Tel:</b> " + compData.telefono
                          : ""
                      }<br/>
                      <b>Total evaluados:</b> ${
                        filtered.length
                      } trabajadores &nbsp;|&nbsp; <b>Fecha:</b> ${new Date().toLocaleDateString(
                          "es-CO"
                        )}
                      ${
                        reportStartDate || reportEndDate
                          ? " &nbsp;|&nbsp; <b>Período:</b> " +
                            (reportStartDate || "...") +
                            " al " +
                            (reportEndDate || "...")
                          : ""
                      }
                    </div>
                  </div>
                  ${_rptIpsHtml}
                </div>
                <table>
                  <thead><tr>
                    <th>#</th><th>Nombre / Trabajador</th><th>Documento</th><th>Edad</th>
                    <th>Cargo</th><th>Empresa</th><th>EPS</th><th>ARL</th><th>Tipo Examen</th><th>Énfasis</th><th>Fecha</th>
                  </tr></thead>
                  <tbody>${filtered
                    .map(
                      (p, i) => `<tr>
                    <td>${String(i + 1).padStart(3, "0")}</td>
                    <td><b>${p.nombres || "--"}</b></td>
                    <td>${p.docTipo || "CC"} ${p.docNumero || "--"}</td>
                    <td style="text-align:center">${p.edad || "--"}</td>
                    <td>${p.cargo || "--"}</td>
                    <td>${p.empresaNombre || "--"}</td>
                    <td>${p.eps || "--"}</td>
                    <td>${p.arl || "--"}</td>
                    <td>${p.tipoExamen || "--"}</td>
                    <td>${p.enfasisExamen || "--"}</td>
                    <td>${p.fechaExamen || "--"}</td>
                  </tr>`
                    )
                    .join("")}</tbody>
                </table>
                <div class="footer">OCUPASALUD · Generado: ${new Date().toLocaleString(
                  "es-CO"
                )}</div>
                <br/><button onclick="window.print()" style="background:#1e293b;color:white;padding:6px 16px;border:none;border-radius:6px;cursor:pointer;font-size:11px;">🖨️ Imprimir / Guardar PDF</button>
                </body></html>`);
                        w.document.close();
                      }}
                      className="bg-slate-700 text-white px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 hover:bg-slate-800 shadow"
                    >
                      <FileText className="w-3.5 h-3.5" /> Exportar PDF Tabla
                    </button>
                    <button
                      onClick={() => setShowExportTable((v) => !v)}
                      className={`px-4 py-2 rounded-lg text-xs font-bold flex items-center gap-2 shadow border ${
                        showExportTable
                          ? "bg-blue-700 text-white border-blue-700"
                          : "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100"
                      }`}
                    >
                      <UserCheck className="w-3.5 h-3.5" />{" "}
                      {showExportTable ? "Ocultar" : "Ver"} Tabla Pantalla
                    </button>
                    <span className="ml-auto text-[10px] text-gray-400 italic flex items-center">
                      ⚠ Res.1843/2025 Art.19 - Confidencial
                    </span>
                  </div>
                  {/* Tabla de pacientes (solo visible en pantalla, no exporta datos sensibles) */}
                  {showExportTable && (
                    <div className="mb-6 border border-gray-200 rounded-xl overflow-hidden no-print">
                      <div className="bg-slate-800 px-4 py-2 flex items-center justify-between">
                        <span className="text-white text-xs font-bold uppercase tracking-wide">
                          Tabla de Trabajadores -- {filtered.length} registros
                        </span>
                        <span className="text-slate-400 text-[10px]">
                          ID anonimizado · Res.1843/2025 Art.19 - Confidencial
                        </span>
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-[10px]">
                          <thead>
                            <tr className="bg-slate-700 text-white">
                              {[
                                "ID",
                                "Nombre / Trabajador",
                                "Documento",
                                "Edad",
                                "Cargo",
                                "Empresa",
                                "EPS",
                                "ARL",
                                "Tipo Examen",
                                "Énfasis",
                                "Fecha",
                              ].map((h) => (
                                <th
                                  key={h}
                                  className="px-2 py-1.5 font-bold text-left whitespace-nowrap border-r border-slate-600 last:border-0"
                                >
                                  {h}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {filtered.map((p, idx) => (
                              <tr
                                key={idx}
                                className={`border-b border-gray-100 align-middle ${
                                  idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                                }`}
                              >
                                <td className="px-2 py-1 font-mono font-bold text-slate-700">
                                  {String(idx + 1).padStart(3, "0")}
                                </td>
                                <td
                                  className="px-2 py-1 font-bold text-gray-800 max-w-[140px] truncate"
                                  title={p.nombres}
                                >
                                  {p.nombres || "--"}
                                </td>
                                <td className="px-2 py-1 font-mono">
                                  {p.docTipo || "CC"} {p.docNumero || "--"}
                                </td>
                                <td className="px-2 py-1 text-center font-bold">
                                  {p.genero === "Masculino"
                                    ? "M"
                                    : p.genero === "Femenino"
                                    ? "F"
                                    : p.genero || "--"}
                                </td>
                                <td className="px-2 py-1 text-center">
                                  {p.edad || "--"}
                                </td>
                                <td
                                  className="px-2 py-1 max-w-[110px] truncate"
                                  title={p.cargo}
                                >
                                  {p.cargo || "--"}
                                </td>
                                <td
                                  className="px-2 py-1 max-w-[120px] truncate"
                                  title={p.empresaNombre}
                                >
                                  {p.empresaNombre || "--"}
                                </td>
                                <td className="px-2 py-1 whitespace-nowrap">
                                  {p.eps || "--"}
                                </td>
                                <td className="px-2 py-1 whitespace-nowrap">
                                  {p.arl || "--"}
                                </td>
                                <td className="px-2 py-1 whitespace-nowrap">
                                  {p.tipoExamen || "--"}
                                </td>
                                <td className="px-2 py-1 whitespace-nowrap">
                                  {p.enfasisExamen || "--"}
                                </td>
                                <td className="px-2 py-1 whitespace-nowrap">
                                  {p.fechaExamen || "--"}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                  {/* Tablas sociodemográficas ampliadas (20+ variables) */}
                  <div className="mb-6">
                    <h3 className="font-black text-gray-700 uppercase text-xs mb-3 border-b pb-1">
                      1. Perfil Sociodemográfico y Ocupacional
                    </h3>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      {[
                        { title: "Género", data: stats.genero, color: "blue" },
                        {
                          title: "Rango Etario",
                          data: stats.edad,
                          color: "indigo",
                        },
                        {
                          title: "Escolaridad",
                          data: stats.escolaridad,
                          color: "violet",
                        },
                        {
                          title: "Estado Civil",
                          data: stats.estadoCivil,
                          color: "purple",
                        },
                        {
                          title: "Estrato",
                          data: stats.estrato,
                          color: "fuchsia",
                        },
                        {
                          title: "Zona Residencia",
                          data: stats.zonaResidencia,
                          color: "pink",
                        },
                        {
                          title: "Grupo Étnico",
                          data: stats.grupoEtnico,
                          color: "rose",
                        },
                        {
                          title: "Cargo/Puesto",
                          data: stats.cargo,
                          color: "orange",
                        },
                        {
                          title: "Tipo Contrato",
                          data: stats.tipoContrato,
                          color: "amber",
                        },
                        {
                          title: "Turno",
                          data: stats.turnoTrabajo,
                          color: "yellow",
                        },
                        {
                          title: "Antigüedad",
                          data: stats.antiguedad,
                          color: "lime",
                        },
                        {
                          title: "Tipo Examen",
                          data: stats.tipoExamen,
                          color: "green",
                        },
                      ].map((t) => (
                        <div
                          key={t.title}
                          className={`bg-${t.color}-50 rounded-xl p-3 border border-${t.color}-100`}
                        >
                          <h4
                            className={`font-bold text-${t.color}-800 mb-2 uppercase text-[10px]`}
                          >
                            {t.title}
                          </h4>
                          {Object.entries(t.data)
                            .filter(
                              ([k]) =>
                                (k && k !== "N/R") ||
                                Object.keys(t.data).length <= 3
                            )
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 6)
                            .map(([k, v]) => (
                              <div
                                key={k}
                                className="flex justify-between items-center mb-1"
                              >
                                <span
                                  className="text-gray-600 truncate max-w-[120px]"
                                  title={k}
                                >
                                  {k || "N/R"}
                                </span>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <div className="w-14 h-1.5 bg-white rounded-full overflow-hidden border">
                                    <div
                                      className={`h-full bg-${t.color}-500 rounded-full`}
                                      style={{
                                        width: `${Math.round(
                                          (v / total) * 100
                                        )}%`,
                                      }}
                                    />
                                  </div>
                                  <span
                                    className={`font-bold text-${t.color}-700 w-8 text-right text-[9px]`}
                                  >
                                    {Math.round((v / total) * 100)}%
                                  </span>
                                </div>
                              </div>
                            ))}
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="mb-6">
                    <h3 className="font-black text-gray-700 uppercase text-xs mb-3 border-b pb-1">
                      2. Perfil Clínico y de Salud
                    </h3>
                    <div className="grid grid-cols-3 gap-3 text-xs">
                      {[
                        { title: "IMC", data: stats.imc, color: "blue" },
                        {
                          title: "Tensión Arterial",
                          data: stats.ta,
                          color: "red",
                        },
                        {
                          title: "Concepto Aptitud",
                          data: stats.conceptoAptitud,
                          color: "emerald",
                        },
                        {
                          title: "Diagnóstico CIE-10",
                          data: stats.diagnosticos,
                          color: "indigo",
                        },
                      ].map((t) => (
                        <div
                          key={t.title}
                          className={`bg-${t.color}-50 rounded-xl p-3 border border-${t.color}-100`}
                        >
                          <h4
                            className={`font-bold text-${t.color}-800 mb-2 uppercase text-[10px]`}
                          >
                            {t.title}
                          </h4>
                          {Object.entries(t.data)
                            .sort(([, a], [, b]) => b - a)
                            .slice(0, 6)
                            .map(([k, v]) => (
                              <div
                                key={k}
                                className="flex justify-between items-center mb-1"
                              >
                                <span
                                  className="text-gray-600 truncate max-w-[120px]"
                                  title={k}
                                >
                                  {k || "N/R"}
                                </span>
                                <div className="flex items-center gap-1.5 flex-shrink-0">
                                  <div className="w-14 h-1.5 bg-white rounded-full overflow-hidden border">
                                    <div
                                      className={`h-full bg-${t.color}-500 rounded-full`}
                                      style={{
                                        width: `${Math.round(
                                          (v / total) * 100
                                        )}%`,
                                      }}
                                    />
                                  </div>
                                  <span
                                    className={`font-bold text-${t.color}-700 w-8 text-right text-[9px]`}
                                  >
                                    {Math.round((v / total) * 100)}%
                                  </span>
                                </div>
                              </div>
                            ))}
                        </div>
                      ))}
                      {/* Hallazgos físicos anormales */}
                      <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
                        <h4 className="font-bold text-orange-800 mb-2 uppercase text-[10px]">
                          Hallazgos Físicos Anormales
                        </h4>
                        {Object.entries(stats.hallazgos)
                          .sort(([, a], [, b]) => b - a)
                          .slice(0, 8)
                          .map(([k, v]) => (
                            <div
                              key={k}
                              className="flex justify-between items-center mb-1"
                            >
                              <span className="text-gray-600 truncate max-w-[120px]">
                                {k}
                              </span>
                              <span className="font-bold text-orange-700 text-[9px]">
                                {v} ({Math.round((v / total) * 100)}%)
                              </span>
                            </div>
                          ))}
                        {Object.keys(stats.hallazgos).length === 0 && (
                          <p className="text-green-600 text-[10px] italic">
                            Sin hallazgos anormales
                          </p>
                        )}
                      </div>
                      {/* Antecedentes */}
                      <div className="bg-yellow-50 rounded-xl p-3 border border-yellow-100">
                        <h4 className="font-bold text-yellow-800 mb-2 uppercase text-[10px]">
                          Antecedentes Patológicos
                        </h4>
                        {[
                          ["Cardiovascular", stats.antecCardio],
                          ["Respiratorio", stats.antecResp],
                          ["Osteomuscular", stats.antecOsteo],
                          ["Neuropsiquiátrico", stats.antecNeuro],
                          ["Metabólico", stats.antecMetab],
                          ["Quirúrgico", stats.antecQuirurg],
                        ]
                          .filter(([, v]) => v > 0)
                          .map(([k, v]) => (
                            <div
                              key={k}
                              className="flex justify-between items-center mb-1"
                            >
                              <span className="text-gray-600">{k}</span>
                              <span className="font-bold text-yellow-700 text-[9px]">
                                {v} ({Math.round((v / total) * 100)}%)
                              </span>
                            </div>
                          ))}
                        {stats.antecCardio +
                          stats.antecResp +
                          stats.antecOsteo +
                          stats.antecNeuro +
                          stats.antecMetab ===
                          0 && (
                          <p className="text-green-600 text-[10px] italic">
                            Sin antecedentes significativos
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                  {/* Riesgos + estilos de vida */}
                  <div className="grid grid-cols-2 gap-4 mb-6 text-xs">
                    <div className="bg-orange-50 rounded-xl p-3 border border-orange-100">
                      <h4 className="font-bold text-orange-800 mb-2 uppercase text-[10px]">
                        Riesgos Laborales Expuestos
                      </h4>
                      {Object.entries(stats.riesgos)
                        .sort(([, a], [, b]) => b - a)
                        .map(([k, v]) => (
                          <div
                            key={k}
                            className="flex justify-between items-center mb-1.5"
                          >
                            <span className="text-gray-700 capitalize">
                              {k}
                            </span>
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-2 bg-white rounded-full overflow-hidden border">
                                <div
                                  className="h-full bg-orange-500 rounded-full"
                                  style={{ width: `${(v / total) * 100}%` }}
                                />
                              </div>
                              <span className="font-bold text-orange-700 w-10 text-right">
                                {((v / total) * 100).toFixed(1)}%
                              </span>
                            </div>
                          </div>
                        ))}
                    </div>
                    <div className="bg-teal-50 rounded-xl p-3 border border-teal-100">
                      <h4 className="font-bold text-teal-800 mb-2 uppercase text-[10px]">
                        Estilos de Vida y Hábitos
                      </h4>
                      {[
                        {
                          k: "Fumadores activos",
                          v: stats.fumadores,
                          c: "red",
                        },
                        {
                          k: "Consumo de alcohol",
                          v: stats.alcohol,
                          c: "amber",
                        },
                        { k: "Practica deporte", v: stats.deporte, c: "green" },
                      ].map(({ k, v, c }) => (
                        <div
                          key={k}
                          className="flex justify-between items-center mb-1.5"
                        >
                          <span className="text-gray-700">{k}</span>
                          <div className="flex items-center gap-2">
                            <div className="w-20 h-2 bg-white rounded-full overflow-hidden border">
                              <div
                                className={`h-full bg-${c}-500 rounded-full`}
                                style={{ width: `${(v / total) * 100}%` }}
                              />
                            </div>
                            <span
                              className={`font-bold text-${c}-700 w-10 text-right`}
                            >
                              {((v / total) * 100).toFixed(1)}%
                            </span>
                          </div>
                        </div>
                      ))}
                      <div className="mt-2 pt-2 border-t border-teal-200">
                        <h5 className="font-bold text-teal-700 text-[10px] uppercase mb-1">
                          Revisión por Sistemas (alterados)
                        </h5>
                        {[
                          ["Cardiovascular", stats.revCardio],
                          ["Respiratorio", stats.revResp],
                          ["Osteomuscular", stats.revOsteo],
                          ["Neurológico", stats.revNeuro],
                          ["Gastrointestinal", stats.revGastro],
                        ]
                          .filter(([, v]) => v > 0)
                          .map(([k, v]) => (
                            <div
                              key={k}
                              className="flex justify-between text-[9px] mb-0.5"
                            >
                              <span className="text-gray-600">{k}</span>
                              <span className="font-bold text-teal-700">
                                {v} ({Math.round((v / total) * 100)}%)
                              </span>
                            </div>
                          ))}
                      </div>
                    </div>
                  </div>
                  <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100 mb-4">
                    <div className="flex justify-between items-center mb-3">
                      <h3 className="font-black text-indigo-900 flex items-center gap-2">
                        <BrainCircuit className="w-4 h-4 no-print" /> Análisis
                        <span className="ai-label-print-hide">Inteligente IA</span>
                      </h3>
                      <button
                        onClick={async () => {
                          // Generar el informe
                          await generateAIReport(stats, total, compName);
                          
                          // Esperar un momento para que se actualice el estado con el resultado del IA
                          setTimeout(async () => {
                            // Verificar que tenemos el resultado del IA
                            if (!reportAIResult) {
                              console.warn('No se pudo obtener el resultado del IA para guardar');
                              return;
                            }
                            
                            const compData = companies.find(c => c.id === selectedCompanyReport);
                            const reportData = {
                              companyId: selectedCompanyReport,
                              empresaId: selectedCompanyReport,
                              empresaNombre: compName,
                              empresaNit: compData?.nit || null,
                              empresaId: selectedCompanyReport,
                              periodoInicio: reportStartDate,
                              periodoFin: reportEndDate,
                              tipoInforme: 'epidemiologico',
                              totalTrabajadores: total,
                              estadisticas: stats,
                              // Incluir el resultado completo del IA
                              resultadoIA: {
                                resumenEjecutivo: reportAIResult.resumenEjecutivo,
                                conclusiones: reportAIResult.conclusiones,
                                analisisJustificado: reportAIResult.analisisJustificado,
                                recomendacionesInforme: reportAIResult.recomendacionesInforme,
                                tabla: reportAIResult.tabla,
                                matrizLegalNormativa: reportAIResult.matrizLegalNormativa,
                                pveRecomendados: reportAIResult.pveRecomendados,
                              },
                              // Referencias para el portal de empresas
                              referenciaEmpresa: {
                                nit: compData?.nit || null,
                                nombre: compName,
                                empresaId: selectedCompanyReport,
                                periodo: reportStartDate && reportEndDate 
                                  ? `${reportStartDate} al ${reportEndDate}`
                                  : new Date().toISOString().slice(0, 7),
                                fechaGeneracion: new Date().toISOString(),
                                tipoDocumento: 'Informe Epidemiológico',
                                medicoId: selectedMedicoReport || currentUser?.user,
                              },
                              fechaGeneracion: new Date().toISOString(),
                              generadoPor: currentUser?.user || currentUser?.nombre || 'Sistema',
                            };
                            
                            try {
                              const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
                              const token = currentUser?.token || localStorage.getItem('token');
                              
                              const res = await fetch(`${API_URL}/write/reports/save`, {
                                method: 'POST',
                                headers: {
                                  'Authorization': `Bearer ${token}`,
                                  'Content-Type': 'application/json'
                                },
                                body: JSON.stringify(reportData)
                              });
                              
                              if (res.ok) {
                                const result = await res.json();
                                console.log('Informe guardado exitosamente:', result);
                                showAlert('Informe guardado exitosamente');
                              } else {
                                console.error('Error guardando informe:', res.statusText);
                              }
                            } catch (err) {
                              console.error('Error guardando informe:', err);
                              showAlert('Error al guardar el informe');
                            }
                          }, 1500);
                        }}
                        disabled={isGeneratingReport}
                        className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {isGeneratingReport ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <Sparkles className="w-3.5 h-3.5" />
                        )}{" "}
                        Generar y Guardar Análisis IA
                      </button>
                    </div>
                    {reportAIResult ? (
                      <div>
                        {reportAIResult.resumenEjecutivo && (
                          <div className="bg-white p-3 rounded-lg border border-indigo-200 mb-3 text-xs font-bold text-indigo-900">
                            {reportAIResult.resumenEjecutivo}
                          </div>
                        )}
                        <div className="text-xs text-justify text-gray-700 leading-relaxed whitespace-pre-wrap mb-3">
                          {reportAIResult.conclusiones}
                        </div>
                        {/* ── Análisis Justificado (Punto 11) ── */}
                        {reportAIResult.analisisJustificado && (
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-3">
                            <p className="font-black text-amber-900 text-xs uppercase mb-2 flex items-center gap-1">
                              <FileSearch className="w-3.5 h-3.5" /> Análisis Justificado — Interpretación Epidemiológica
                            </p>
                            <div className="text-xs text-justify text-amber-900 leading-relaxed whitespace-pre-wrap">
                              {reportAIResult.analisisJustificado}
                            </div>
                          </div>
                        )}
                        {/* ── Recomendaciones del Informe (Punto 11) ── */}
                        {reportAIResult.recomendacionesInforme && (
                          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-3">
                            <p className="font-black text-emerald-900 text-xs uppercase mb-2 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5" /> Recomendaciones — Acciones Correctivas y PVE
                            </p>
                            <div className="text-xs text-justify text-emerald-900 leading-relaxed whitespace-pre-wrap">
                              {reportAIResult.recomendacionesInforme}
                            </div>
                          </div>
                        )}
                        {reportAIResult.tabla?.length > 0 && (
                          <div className="overflow-x-auto mb-4">
                            <p className="font-black text-gray-700 text-xs uppercase mb-2">📊 Morbilidad Prevalente</p>
                            <table className="w-full text-xs border border-gray-300">
                              <thead>
                                <tr className="bg-slate-800 text-white">
                                  <th className="py-2.5 px-3 text-left font-bold">
                                    Diagnóstico (CIE-10)
                                  </th>
                                  <th className="py-2.5 px-3 text-center font-bold w-20">Casos</th>
                                  <th className="py-2.5 px-3 text-center font-bold w-20">%</th>
                                  <th className="py-2.5 px-3 text-left font-bold w-32">Relación</th>
                                </tr>
                              </thead>
                              <tbody>
                                {reportAIResult.tabla.map((r, i) => (
                                  <tr key={i} className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                                    <td className="py-2 px-3 border-b border-gray-200 font-semibold">{r.diagnostico}</td>
                                    <td className="py-2 px-3 border-b border-gray-200 text-center font-bold">
                                      {r.cantidad}
                                    </td>
                                    <td className="py-2 px-3 border-b border-gray-200 text-center font-bold text-indigo-700">
                                      {r.porcentaje}
                                    </td>
                                    <td className="py-2 px-3 border-b border-gray-200 text-gray-600">
                                      {r.relacion || "—"}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-center text-gray-400 text-xs py-4 italic">
                        Haga clic en "Generar Análisis IA" para obtener el
                        diagnóstico poblacional completo.
                      </p>
                    )}
                    {reportAIResult?.matrizLegalNormativa && (
                      <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-900">
                        <p className="font-black mb-2 flex items-center gap-1 uppercase text-blue-800">
                          <ShieldCheck className="w-3.5 h-3.5" /> Cumplimiento
                          Normativo
                        </p>
                        <p className="text-justify leading-relaxed">
                          {reportAIResult.matrizLegalNormativa}
                        </p>
                      </div>
                    )}
                    {/* PVE Recomendados */}
                    {reportAIResult?.pveRecomendados?.length > 0 && (
                      <div className="mt-4 bg-teal-50 border border-teal-200 rounded-lg p-4 text-xs">
                        <p className="font-black text-teal-900 uppercase mb-2 flex items-center gap-1">
                          <Shield className="w-3.5 h-3.5" /> Programas de Vigilancia Epidemiológica Recomendados
                        </p>
                        <div className="grid grid-cols-2 gap-2">
                          {reportAIResult.pveRecomendados.map((pve, i) => (
                            <div key={i} className="flex items-center gap-2 bg-white border border-teal-100 rounded-lg px-3 py-2">
                              <span className="text-teal-600 font-bold">✓</span>
                              <span className="text-teal-900 font-semibold">{pve}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  {/* PUNTO 4: MATRIZ LEGAL DE CONDICIONES DE SALUD */}
                  <div className="mt-6 border-t-2 border-gray-200 pt-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="bg-blue-900 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0">
                        4
                      </div>
                      <div>
                        <h2 className="text-base font-black text-blue-900 uppercase">
                          Matriz Legal de Condiciones de Salud y Tabulación
                        </h2>
                        <p className="text-xs text-gray-500">
                          Cumplimiento Normativo SST - Res. 1843/2025 · Dec.
                          1072/2015 · Res. 0312/2019 · Ley 1562/2012
                        </p>
                      </div>
                    </div>
                    <div className="overflow-x-auto border border-gray-200 rounded-xl">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="bg-blue-900 text-white">
                            <th className="p-2 text-left font-bold">
                              ID / Trabajador
                            </th>
                            <th className="p-2 font-bold">Edad</th>
                            <th className="p-2 font-bold text-left">
                              Riesgos Ocupacionales
                            </th>
                            <th className="p-2 font-bold text-left">
                              Diagnóstico (CIE-10)
                            </th>
                            <th
                              className="p-2 font-bold text-left"
                              style={{ minWidth: "220px" }}
                            >
                              Restricciones Laborales
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {filtered.map((p, i) => {
                            const riesgosActivos = Object.entries(
                              p.riesgos || {}
                            )
                              .filter(([, v]) => v)
                              .map(
                                ([k]) => k.charAt(0).toUpperCase() + k.slice(1)
                              )
                              .join(", ");
                            const bmiInfo = analyzeBMI(p.imc);
                            const bpInfo = analyzeBP(p.ta);
                            return (
                              <tr
                                key={`${p.id}-${i}`}
                                className={`border-b ${
                                  i % 2 === 0 ? "bg-white" : "bg-gray-50"
                                } hover:bg-blue-50 align-top`}
                              >
                                <td className="p-2">
                                  <p className="font-bold text-blue-900">
                                    {p.docNumero}
                                  </p>
                                  <p className="text-gray-600 text-[10px]">
                                    {p.nombres?.substring(0, 28)}
                                    {p.nombres?.length > 28 ? "..." : ""}
                                  </p>
                                </td>
                                <td className="p-2 text-center">
                                  {p.edad || "--"}
                                </td>
                                <td
                                  className="p-2"
                                  style={{ maxWidth: "130px" }}
                                >
                                  <p className="text-gray-700 leading-relaxed">
                                    {riesgosActivos || (
                                      <span className="text-gray-400 italic">
                                        No registrados
                                      </span>
                                    )}
                                  </p>
                                </td>
                                {/* Sintomatología eliminada — dato confidencial */}
                                <td
                                  className="p-2"
                                  style={{ maxWidth: "140px" }}
                                >
                                  <p className="font-bold text-blue-900">
                                    {p.diagnosticoPrincipal || "Z10.0"}
                                  </p>
                                  {p.diagnosticoSecundario1 && (
                                    <p className="text-gray-500 text-[10px] mt-0.5">
                                      {p.diagnosticoSecundario1}
                                    </p>
                                  )}
                                </td>
                                <td
                                  className="p-2"
                                  style={{ minWidth: "220px" }}
                                >
                                  {p.analisisRestricciones ? (
                                    <div>
                                      <p className="text-[9px] font-black text-red-700 uppercase mb-0.5">
                                        ⚠ Restricciones:
                                      </p>
                                      <p className="text-red-800 leading-relaxed text-[10px] whitespace-pre-wrap">
                                        {Array.isArray(p.analisisRestricciones) ? p.analisisRestricciones.join("\n") : p.analisisRestricciones}
                                      </p>
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 italic text-[10px]">
                                      Sin restricciones
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                          {filtered.length === 0 && (
                            <tr>
                              <td
                                colSpan="5"
                                className="p-8 text-center text-gray-400 italic"
                              >
                                No hay registros para esta empresa en el período
                                seleccionado.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                    {/* Normativa SST aplicable */}
                    <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <h4 className="font-black text-blue-900 text-xs uppercase mb-3 flex items-center gap-2">
                        <ShieldCheck className="w-4 h-4" /> Marco Normativo SST
                        Aplicado
                      </h4>
                      <div className="grid grid-cols-2 gap-2 text-[10px]">
                        {[
                          {
                            ley: "Resolución 1843/2025",
                            desc: "Evaluaciones médicas ocupacionales - Norma vigente (deroga Res. 2346/2007 y 1918/2009)",
                          },
                          {
                            ley: "Decreto 1072/2015 Art. 2.2.4.6",
                            desc: "Obligaciones del empleador en el Sistema de Gestión SST",
                          },
                          {
                            ley: "Resolución 0312/2019",
                            desc: "Estándares mínimos del SG-SST -- exámenes de ingreso, periódicos y egreso",
                          },
                          {
                            ley: "Ley 1562/2012 Art. 11",
                            desc: "Sistema General de Riesgos Laborales -- EPS y ARL",
                          },
                          {
                            ley: "GTC-45:2012",
                            desc: "Identificación de peligros y valoración de riesgos laborales",
                          },
                          {
                            ley: "Resolución 2404/2019",
                            desc: "Guías técnicas de vigilancia epidemiológica",
                          },
                          {
                            ley: "GATISO-DME (2015)",
                            desc: "Desórdenes musculoesqueléticos relacionados con el trabajo",
                          },
                          {
                            ley: "Res. 1995/1999 Art. 15",
                            desc: "Custodia y retención de historias clínicas - mínimo 20 años (Gestión 5 + Central 10 + Histórico 5)",
                          },
                          {
                            ley: "Resolución 1442/2024",
                            desc: "CIE-11 Colombia - transición gradual desde CIE-10 (implementado en SISO en paralelo)",
                          },
                          {
                            ley: "Res. 2175/2015 CUPS-MSPS",
                            desc: "Códigos Únicos de Procedimientos - integrados en solicitud de exámenes con autocomplete",
                          },
                          ,
                        ].map((n, i) => (
                          <div
                            key={i}
                            className="flex gap-2 bg-white p-2 rounded border border-blue-100"
                          >
                            <span className="font-bold text-blue-800 min-w-[140px]">
                              {n.ley}
                            </span>
                            <span className="text-gray-600">{n.desc}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center py-16 text-gray-400">
                  <BarChart3 className="w-16 h-16 mx-auto mb-3 opacity-30" />
                  <p>Seleccione una empresa para ver su informe.</p>
                </div>
              )}
            </div>
          )}
          {/* ══ TAB: CERTIFICADOS POR EMPRESA ══ */}
          {reporteActiveTab === "certificados" &&
            selectedCompanyReport &&
            (() => {
              const allIds = filtered.map((p) => p.id);
              const allChecked =
                allIds.length > 0 && allIds.every((id) => certSelected[id]);
              const someChecked = allIds.some((id) => certSelected[id]);
              const selectedList = filtered.filter((p) => certSelected[p.id]);

              // ── CERT-FIX: Reportes usa EXACTAMENTE el mismo HTML que la HC ──────
              // _generarCertificadoHTMLNormalizado produce el HTML canónico.
              // Para 1 cert → abre el documento completo sin modificarlo.
              // Para N certs → reutiliza el CSS del mismo generador + concatena cuerpos.
              const printSelectedCerts = () => {
                if (selectedList.length === 0) return;
                const docData = activeDoctorData || {};
                const sig = activeSignature || "";
                if (selectedList.length === 1) {
                  // ── Certificado individual: idéntico a "Ver Certificado" en la HC ──
                  const _miIPSCert = currentUser?.empresaId
                    ? companies.find((c) => c.id === currentUser.empresaId) ||
                      null
                    : null;
                  const html = _generarCertificadoHTMLNormalizado(
                    selectedList[0],
                    docData,
                    sig,
                    _miIPSCert
                  );
                  const w = window.open("", "_blank", "width=920,height=1150");
                  if (!w) {
                    showAlert(
                      "El navegador bloqueó la ventana emergente. Permita los popups."
                    );
                    return;
                  }
                  const htmlBtn = html.replace(
                    "</body>",
                    '<div class="np-dl"><button onclick="window.print()">📥 Guardar / Imprimir PDF</button>' +
                      "<p>En el diálogo, selecciona <b>Guardar como PDF</b></p></div></body>"
                  );
                  w.document.write(htmlBtn);
                  w.document.close();
                  w.focus();
                } else {
                  // ── Múltiples certificados: mismo CSS, un <body> por página ─────
                  const _miIPSCertM = currentUser?.empresaId
                    ? companies.find((c) => c.id === currentUser.empresaId) ||
                      null
                    : null;
                  const sampleFull = _generarCertificadoHTMLNormalizado(
                    { nombres: "_sample_" },
                    docData,
                    sig,
                    _miIPSCertM
                  );
                  const headMatch = sampleFull.match(
                    /<head>([\s\S]*?)<\/head>/i
                  );
                  const sharedHead = headMatch ? headMatch[1] : "";
                  const certs = selectedList
                    .map((p, idx) => {
                      const full = _generarCertificadoHTMLNormalizado(
                        p,
                        docData,
                        sig,
                        _miIPSCertM
                      );
                      const bm = full.match(/<body[^>]*>([\s\S]*)<\/body>/i);
                      const body = bm ? bm[1] : full;
                      const isLast = idx === selectedList.length - 1;
                      return (
                        '<div style="' +
                        (isLast ? "" : "page-break-after:always;") +
                        '">' +
                        body +
                        "</div>"
                      );
                    })
                    .join("");
                  const w = window.open("", "_blank", "width=900,height=1100");
                  if (!w) {
                    showAlert(
                      "El navegador bloqueó la ventana emergente. Permita los popups."
                    );
                    return;
                  }
                  w.document.write(
                    '<!DOCTYPE html><html lang="es"><head>' +
                      sharedHead +
                      "<style>@page{size:letter portrait;margin:1cm 1.2cm;}" +
                      ".np-bar{position:fixed;top:0;left:0;right:0;background:#065f46;color:#fff;" +
                      "padding:7px 14px;display:flex;align-items:center;gap:10px;z-index:9999;}" +
                      ".np-bar span{flex:1;font-size:9pt;font-weight:700;}" +
                      ".np-bar button{border:none;padding:5px 14px;border-radius:6px;font-weight:900;cursor:pointer;font-size:9pt;}" +
                      ".np-bp{background:#10b981;color:#fff;}.np-bc{background:#ef4444;color:#fff;}" +
                      "body{padding-top:50px!important;}" +
                      "@media print{.np-bar{display:none!important;}body{padding-top:0!important;}}" +
                      "</style></head><body>" +
                      '<div class="np-bar">' +
                      "<span>📄 Certificados - " +
                      compName +
                      " (" +
                      selectedList.length +
                      " trabajadores)</span>" +
                      '<button class="np-bp" onclick="window.print()">🖨️ Imprimir todos</button>' +
                      '<button class="np-bc" onclick="window.close()">✕ Cerrar</button></div>' +
                      certs +
                      "</body></html>"
                  );
                  w.document.close();
                  w.focus();
                }
              };

              return (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-5">
                    <div className="flex items-center justify-between flex-wrap gap-3">
                      <div>
                        <h3 className="font-black text-blue-900 text-base flex items-center gap-2">
                          📄 Certificados de Aptitud - {compName}
                        </h3>
                        <p className="text-xs text-gray-400 mt-0.5">
                          {filtered.length} trabajador
                          {filtered.length !== 1 ? "es" : ""} en el período
                          {selectedList.length > 0 && (
                            <span className="ml-2 font-black text-blue-700">
                              · {selectedList.length} seleccionado
                              {selectedList.length !== 1 ? "s" : ""}
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        <button
                          onClick={() => {
                            const newSel = {};
                            if (!allChecked)
                              filtered.forEach((p) => {
                                newSel[p.id] = true;
                              });
                            setCertSelected(newSel);
                          }}
                          className={`px-4 py-2 rounded-xl text-xs font-black border-2 transition flex items-center gap-1.5 ${
                            allChecked
                              ? "bg-blue-600 border-blue-600 text-white"
                              : "bg-white border-blue-300 text-blue-700 hover:bg-blue-50"
                          }`}
                        >
                          {allChecked
                            ? "☑ Deseleccionar todos"
                            : "☐ Seleccionar todos"}
                        </button>
                        <button
                          onClick={printSelectedCerts}
                          disabled={selectedList.length === 0}
                          className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-black rounded-xl flex items-center gap-1.5 transition"
                        >
                          <Printer className="w-3.5 h-3.5" />
                          Imprimir seleccionados ({selectedList.length})
                        </button>
                      </div>
                    </div>
                  </div>
                  {filtered.length === 0 ? (
                    <div className="text-center py-16 text-gray-400">
                      <p className="text-sm">
                        No hay trabajadores en el período seleccionado.
                      </p>
                    </div>
                  ) : (
                    <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                      <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={allChecked}
                          ref={(el) => {
                            if (el)
                              el.indeterminate = someChecked && !allChecked;
                          }}
                          onChange={() => {
                            const n = {};
                            if (!allChecked)
                              filtered.forEach((p) => {
                                n[p.id] = true;
                              });
                            setCertSelected(n);
                          }}
                          className="w-4 h-4 accent-blue-600 cursor-pointer"
                        />
                        <span className="text-[10px] font-black text-gray-500 uppercase tracking-wide">
                          Seleccionar todo
                        </span>
                        <span className="ml-auto text-[10px] text-gray-400">
                          {filtered.length} certificados disponibles
                        </span>
                      </div>
                      <div className="divide-y divide-gray-100">
                        {filtered.map((p, idx) => {
                          const isChecked = !!certSelected[p.id];
                          const conceptoLower = (
                            p.conceptoAptitud || ""
                          ).toLowerCase();
                          const esApto =
                            conceptoLower.includes("apto") &&
                            !conceptoLower.includes("no apto");
                          const esNoApto = conceptoLower.includes("no apto");
                          return (
                            <div
                              key={p.id || idx}
                              className={`flex items-center gap-3 px-4 py-3 transition ${
                                isChecked ? "bg-blue-50" : "hover:bg-gray-50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() =>
                                  setCertSelected((prev) => ({
                                    ...prev,
                                    [p.id]: !prev[p.id],
                                  }))
                                }
                                className="w-4 h-4 accent-blue-600 shrink-0 cursor-pointer"
                              />
                              <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-600 font-black text-[10px] flex items-center justify-center shrink-0">
                                {String(idx + 1).padStart(2, "0")}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-black text-gray-900 text-sm truncate">
                                  {p.nombres || "--"}
                                </p>
                                <p className="text-[10px] text-gray-500">
                                  {p.docTipo || "CC"}: {p.docNumero || "--"}{" "}
                                  &nbsp;·&nbsp; {p.cargo || "--"} &nbsp;·&nbsp;{" "}
                                  {p.tipoExamen || "--"}
                                </p>
                              </div>
                              <div className="text-right shrink-0">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${
                                    esApto
                                      ? "bg-emerald-100 text-emerald-700"
                                      : esNoApto
                                      ? "bg-red-100 text-red-700"
                                      : "bg-gray-100 text-gray-500"
                                  }`}
                                >
                                  {p.conceptoAptitud
                                    ? p.conceptoAptitud
                                        .split(" ")
                                        .slice(0, 3)
                                        .join(" ")
                                    : "Sin concepto"}
                                </span>
                                <p className="text-[9px] text-gray-400 mt-0.5">
                                  {p.fechaExamen || "--"}
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  const doc = activeDoctorData || {};
                                  const sig = activeSignature || "";
                                  // ── Usa el MISMO generador que la HC - certificado idéntico ──
                                  const _miIPSC2 = currentUser?.empresaId
                                    ? companies.find(
                                        (c) => c.id === currentUser.empresaId
                                      ) || null
                                    : null;
                                  const html =
                                    _generarCertificadoHTMLNormalizado(
                                      p,
                                      doc,
                                      sig,
                                      _miIPSC2
                                    );
                                  const w = window.open(
                                    "",
                                    "_blank",
                                    "width=900,height=1100"
                                  );
                                  if (!w) {
                                    showAlert(
                                      "El navegador bloqueó la ventana emergente. Permita los popups."
                                    );
                                    return;
                                  }
                                  w.document.write(html);
                                  w.document.close();
                                  w.focus();
                                }}
                                className="shrink-0 no-print bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg px-2.5 py-1.5 text-[10px] font-bold flex items-center gap-1 transition"
                              >
                                <Printer className="w-3 h-3" /> Ver
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
        </div>
      </div>
    );
}
