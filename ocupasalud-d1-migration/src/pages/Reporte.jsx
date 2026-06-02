// src/pages/Reporte.jsx
// ═══════════════════════════════════════════════════════════════════════
// REPORTES — Estadísticas, indicadores SVE, exportación RIPS/FHIR,
// certificados batch, generación con IA
// ═══════════════════════════════════════════════════════════════════════
import React, { useState, useMemo, useCallback } from 'react';
import {
  BarChart3, Download, FileText, Building2, Calendar, Filter,
  Users, Stethoscope, Brain, Shield, Heart, Eye, Ear,
  Wind, Activity, AlertTriangle, CheckCircle2, TrendingUp,
  PieChart, Printer, RefreshCw, Loader2, FileCheck, Search,
  ChevronDown, ChevronUp, Copy, Star, Zap, ClipboardList,
  DollarSign, Send, FilePlus, Save, Trash2, Briefcase,
  Sparkles, BrainCircuit, ShieldCheck, UserCheck, HardDrive,
  FileSearch, MessageSquare,
} from 'lucide-react';
import { SVEPrograms } from '../modules/reports/components/SVEPrograms';
import { parseAIJSON } from '../modules/ai/services/aiAnalysis';

// ═══════════════════════════════════════════════════════════════════════
// REPORTE COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export default function Reporte({
  patientsList = [], companies = [], currentUser, aiConfig, savedReports = [], goTo,
  // Report state from App
  selectedCompanyReport, setSelectedCompanyReport,
  reporteActiveTab, setReporteActiveTab,
  certSelected = {}, setCertSelected,
  reportStartDate, setReportStartDate, reportEndDate, setReportEndDate,
  reportAIResult, setReportAIResult,
  isGeneratingReport, setIsGeneratingReport,
  showExportTable, setShowExportTable,
  precioPorPaciente, setPrecioPorPaciente,
  selectedMedicoReport, setSelectedMedicoReport,
  // AI
  callAI, showAlert, showConfirm,
  usersList = [],
  ...rest
}) {
  const [localTab, setLocalTab] = useState(reporteActiveTab || 'estadisticas');

  const activeTab = reporteActiveTab || localTab;
  const setActiveTab = (t) => {
    setLocalTab(t);
    setReporteActiveTab?.(t);
  };

  // ── Filtered patients — idéntico al monolito líneas 23819-23829 ────────
  const filteredPatients = useMemo(() => {
    const secMed = (() => {
      if (currentUser?.role !== 'secretaria') return null;
      const secU = usersList?.find(u => u.user === currentUser.user);
      const asig = secU?.medicosAsignados || [];
      return asig.length > 0 ? asig : null;
    })();

    let list = patientsList.filter(p => {
      if (!p.fechaExamen || p._archivado) return false;
      if (selectedCompanyReport && p.empresaId !== selectedCompanyReport) return false;
      if (reportStartDate && p.fechaExamen < reportStartDate) return false;
      if (reportEndDate && p.fechaExamen > reportEndDate) return false;
      if (selectedMedicoReport && p._medicoId !== selectedMedicoReport) return false;
      if (secMed && p._medicoId && !secMed.includes(p._medicoId)) return false;
      return true;
    });

    return list;
  }, [patientsList, selectedCompanyReport, reportStartDate, reportEndDate, selectedMedicoReport, usersList, currentUser]);

  // ── Statistics ──────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const total = filteredPatients.length;

    // By tipo examen
    const byTipo = {};
    filteredPatients.forEach(p => {
      const tipo = p.tipoExamen || 'Sin clasificar';
      byTipo[tipo] = (byTipo[tipo] || 0) + 1;
    });

    // By concepto aptitud
    const byConcepto = {};
    filteredPatients.forEach(p => {
      const concepto = p.conceptoAptitud || p.conceptoOcupacional || 'Sin concepto';
      byConcepto[concepto] = (byConcepto[concepto] || 0) + 1;
    });

    // Top 10 CIE-10 diagnosis
    const diagCount = {};
    filteredPatients.forEach(p => {
      const diags = [
        p.diagnostico1, p.diagnostico2, p.diagnostico3,
        p.diagPrincipal, p.cie10Principal,
        ...(p.diagnosticos || []).map(d => d.cie10 || d.descripcion),
      ].filter(Boolean);
      diags.forEach(d => {
        const key = d.trim();
        if (key) diagCount[key] = (diagCount[key] || 0) + 1;
      });
    });
    const topDiag = Object.entries(diagCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10);

    // By gender
    const byGender = {};
    filteredPatients.forEach(p => {
      const g = p.genero || 'No registrado';
      byGender[g] = (byGender[g] || 0) + 1;
    });

    // By age group
    const byAge = { '< 20': 0, '20-29': 0, '30-39': 0, '40-49': 0, '50-59': 0, '60+': 0 };
    filteredPatients.forEach(p => {
      const age = parseInt(p.edad) || 0;
      if (age < 20) byAge['< 20']++;
      else if (age < 30) byAge['20-29']++;
      else if (age < 40) byAge['30-39']++;
      else if (age < 50) byAge['40-49']++;
      else if (age < 60) byAge['50-59']++;
      else byAge['60+']++;
    });

    // By escolaridad
    const byEscolaridad = {};
    filteredPatients.forEach(p => {
      const esc = p.escolaridad || 'No registrada';
      byEscolaridad[esc] = (byEscolaridad[esc] || 0) + 1;
    });

    // By estado civil
    const byEstadoCivil = {};
    filteredPatients.forEach(p => {
      const ec = p.estadoCivil || 'No registrado';
      byEstadoCivil[ec] = (byEstadoCivil[ec] || 0) + 1;
    });

    // By estrato
    const byEstrato = {};
    filteredPatients.forEach(p => {
      const est = p.estrato || 'No registrado';
      byEstrato[est] = (byEstrato[est] || 0) + 1;
    });

    // By zona residencia
    const byZona = {};
    filteredPatients.forEach(p => {
      const zona = p.zonaResidencia || 'No registrada';
      byZona[zona] = (byZona[zona] || 0) + 1;
    });

    // By cargo
    const byCargo = {};
    filteredPatients.forEach(p => {
      const cargo = p.cargo || 'No registrado';
      byCargo[cargo] = (byCargo[cargo] || 0) + 1;
    });

    // By tipo contrato
    const byContrato = {};
    filteredPatients.forEach(p => {
      const tc = p.tipoContrato || 'No registrado';
      byContrato[tc] = (byContrato[tc] || 0) + 1;
    });

    // By turno
    const byTurno = {};
    filteredPatients.forEach(p => {
      const turno = p.turnoTrabajo || 'No registrado';
      byTurno[turno] = (byTurno[turno] || 0) + 1;
    });

    // By riesgos ocupacionales
    const byRiesgos = { 'Físicos': 0, 'Químicos': 0, 'Biológicos': 0, 'Mecánicos': 0, 'Biomecánicos': 0, 'Psicosocial': 0, 'Seguridad': 0, 'Locativos': 0 };
    filteredPatients.forEach(p => {
      const riesgos = p.riesgos || {};
      if (riesgos.fisicos) byRiesgos['Físicos']++;
      if (riesgos.quimicos) byRiesgos['Químicos']++;
      if (riesgos.biologicos) byRiesgos['Biológicos']++;
      if (riesgos.mecanicos) byRiesgos['Mecánicos']++;
      if (riesgos.biomecanicos) byRiesgos['Biomecánicos']++;
      if (riesgos.psicosocial) byRiesgos['Psicosocial']++;
      if (riesgos.seguridad) byRiesgos['Seguridad']++;
      if (riesgos.locativos) byRiesgos['Locativos']++;
    });

    // By estilos de vida
    const byEstilos = { 'Fumadores': 0, 'Alcohol': 0, 'Deporte': 0 };
    filteredPatients.forEach(p => {
      if ((p.habitos?.fuma || p.fuma || '').toLowerCase().includes('si')) byEstilos['Fumadores']++;
      if ((p.habitos?.alcohol || p.alcohol || '').toLowerCase().includes('si')) byEstilos['Alcohol']++;
      if ((p.habitos?.deporte || p.deporte || '').toLowerCase().includes('si')) byEstilos['Deporte']++;
    });

    // ── Perfil Clínico: IMC ───────────────────────────────────────────────
    const byIMC = { 'Bajo peso': 0, 'Normal': 0, 'Sobrepeso': 0, 'Obesidad I': 0, 'Obesidad II': 0, 'Obesidad III': 0 };
    filteredPatients.forEach(p => {
      const peso = parseFloat(p.peso) || 0;
      const talla = parseFloat(p.talla) || 0; // en metros
      if (peso > 0 && talla > 0) {
        const imc = peso / (talla * talla);
        if (imc < 18.5) byIMC['Bajo peso']++;
        else if (imc < 25) byIMC['Normal']++;
        else if (imc < 30) byIMC['Sobrepeso']++;
        else if (imc < 35) byIMC['Obesidad I']++;
        else if (imc < 40) byIMC['Obesidad II']++;
        else byIMC['Obesidad III']++;
      }
    });

    // ── Perfil Clínico: Tensión Arterial ─────────────────────────────────
    const byTension = { 'Óptima': 0, 'Normal': 0, 'Pre-hipertensión': 0, 'HTA Etapa 1': 0, 'HTA Etapa 2': 0 };
    filteredPatients.forEach(p => {
      const ta = p.tensionArterial || p.ta || '';
      if (ta.includes('/')) {
        const [sistolica, diastolica] = ta.split('/').map(n => parseInt(n) || 0);
        if (sistolica < 120 && diastolica < 80) byTension['Óptima']++;
        else if (sistolica < 130 && diastolica < 80) byTension['Normal']++;
        else if (sistolica < 140 || diastolica < 90) byTension['Pre-hipertensión']++;
        else if (sistolica < 160 || diastolica < 100) byTension['HTA Etapa 1']++;
        else byTension['HTA Etapa 2']++;
      }
    });

    // ── Perfil Clínico: Examen Físico Alterado ─────────────────────────────
    const examenFisicoAlterado = { 'Cardiovascular': 0, 'Respiratorio': 0, 'Neurológico': 0, 'Musculoesquelético': 0, 'Piel': 0, 'Abdomen': 0 };
    filteredPatients.forEach(p => {
      if ((p.examenFisicoCardiovascular || '').toLowerCase().includes('alter')) examenFisicoAlterado['Cardiovascular']++;
      if ((p.examenFisicoRespiratorio || '').toLowerCase().includes('alter')) examenFisicoAlterado['Respiratorio']++;
      if ((p.examenFisicoNeurologico || '').toLowerCase().includes('alter')) examenFisicoAlterado['Neurológico']++;
      if ((p.examenFisicoMusculoesq || '').toLowerCase().includes('alter')) examenFisicoAlterado['Musculoesquelético']++;
      if ((p.examenFisicoPiel || '').toLowerCase().includes('alter')) examenFisicoAlterado['Piel']++;
      if ((p.examenFisicoAbdomen || '').toLowerCase().includes('alter')) examenFisicoAlterado['Abdomen']++;
    });

    // ── Monolith-compatible aliases ────────────────────────────────────────
    const tasaNoAptos = total > 0
      ? Math.round((filteredPatients.filter(p => (p.conceptoAptitud || '').toLowerCase().includes('no apto')).length / total) * 100)
      : 0;
    const promedioEdad = total > 0
      ? Math.round(filteredPatients.reduce((s, p) => s + (parseInt(p.edad) || 0), 0) / total)
      : 0;
    const topDx = Object.entries(
      filteredPatients.reduce((acc, p) => {
        const d = (p.diagnosticoPrincipal || p.diagPrincipal || '').split(' - ')[0] || 'Z10.0';
        acc[d] = (acc[d] || 0) + 1; return acc;
      }, {})
    ).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const tendenciaMensual = filteredPatients.reduce((acc, p) => {
      const m = (p.fechaExamen || '').substring(0, 7);
      if (m) acc[m] = (acc[m] || 0) + 1; return acc;
    }, {});

    return {
      total, byTipo, byConcepto, topDiag, byGender, byAge,
      byEscolaridad, byEstadoCivil, byEstrato, byZona,
      byCargo, byContrato, byTurno, byRiesgos, byEstilos,
      byIMC, byTension, examenFisicoAlterado,
      // Monolith-compatible aliases
      genero: byGender, edad: byAge, imc: byIMC, ta: byTension,
      escolaridad: byEscolaridad, estadoCivil: byEstadoCivil,
      estrato: byEstrato, zonaResidencia: byZona,
      cargo: byCargo, tipoContrato: byContrato, turnoTrabajo: byTurno,
      tipoExamen: byTipo, conceptoAptitud: byConcepto,
      riesgos: byRiesgos,
      tasaNoAptos, promedioEdad, topDx, tendenciaMensual,
    };
  }, [filteredPatients]);

  // ── SVE Indicators ──────────────────────────────────────────────────
  const sveIndicators = useMemo(() => {
    const total = filteredPatients.length || 1;

    // DME (Desórdenes Musculoesqueléticos)
    const dme = filteredPatients.filter(p =>
      (p.sintomatologiaDME || p.dolorOsteomusular || p.osteomuscular_dolor || '').toLowerCase().includes('si') ||
      (p.diagPrincipal || '').toLowerCase().includes('m') // CIE-10 M codes
    ).length;

    // Cardiovascular
    const cardio = filteredPatients.filter(p => {
      const ta = p.tensionArterial || p.ta || '';
      if (!ta.includes('/')) return false;
      const [s] = ta.split('/').map(Number);
      return s >= 140;
    }).length;

    // Respiratorio
    const resp = filteredPatients.filter(p =>
      (p.espirometria || '').toLowerCase().includes('anormal') ||
      (p.diagPrincipal || '').toLowerCase().startsWith('j')
    ).length;

    // Auditivo
    const audit = filteredPatients.filter(p =>
      (p.audiometria || '').toLowerCase().includes('anormal') ||
      (p.audiometria || '').toLowerCase().includes('hipoacusia') ||
      (p.diagPrincipal || '').toLowerCase().startsWith('h9')
    ).length;

    // Psicosocial
    const psico = filteredPatients.filter(p =>
      (p.riesgoPsicosocial || '').toLowerCase().includes('alto') ||
      (p.riesgoPsicosocial || '').toLowerCase().includes('muy alto') ||
      (p.diagPrincipal || '').toLowerCase().startsWith('f')
    ).length;

    return {
      dme: { count: dme, pct: ((dme / total) * 100).toFixed(1) },
      cardiovascular: { count: cardio, pct: ((cardio / total) * 100).toFixed(1) },
      respiratorio: { count: resp, pct: ((resp / total) * 100).toFixed(1) },
      auditivo: { count: audit, pct: ((audit / total) * 100).toFixed(1) },
      psicosocial: { count: psico, pct: ((psico / total) * 100).toFixed(1) },
    };
  }, [filteredPatients]);

  // ── AI Report Generation — JSON estructurado idéntico al monolito ──────
  const handleGenerateAIReport = async (_stats, _total, _compName) => {
    if (!callAI) {
      showAlert?.('⚠️ Configure las API keys de IA primero.');
      return;
    }
    const localTotal = _total ?? filteredPatients.length;
    if (localTotal === 0) {
      showAlert?.('⚠️ No hay pacientes para generar el reporte.');
      return;
    }
    const cn = _compName || compName;
    const st = _stats || stats;

    setIsGeneratingReport?.(true);
    try {
      const prompt = `Eres médico especialista en Salud Ocupacional y Medicina del Trabajo. Genera un INFORME EPIDEMIOLÓGICO OCUPACIONAL completo en formato JSON.

EMPRESA: ${cn}
TOTAL EVALUADOS: ${localTotal}
PERÍODO: ${reportStartDate || 'Sin filtro'} a ${reportEndDate || 'Sin filtro'}

DATOS ESTADÍSTICOS:
- Género: ${JSON.stringify(st.genero || st.byGender || {})}
- Rango etario: ${JSON.stringify(st.edad || st.byAge || {})}
- Tipo examen: ${JSON.stringify(st.tipoExamen || st.byTipo || {})}
- Concepto aptitud: ${JSON.stringify(st.conceptoAptitud || st.byConcepto || {})}
- Diagnósticos: ${JSON.stringify(st.diagnosticos || {})}
- Riesgos: ${JSON.stringify(st.riesgos || st.byRiesgos || {})}
- Fumadores: ${st.fumadores || 0} / Alcohol: ${st.alcohol || 0} / Deporte: ${st.deporte || 0}
- Promedio edad: ${st.promedioEdad || st.byAge ? '(calculado)' : 'N/D'}
- Tasa no aptos: ${st.tasaNoAptos || 0}%
- Top diagnósticos: ${JSON.stringify(st.topDx || st.topDiag || [])}
- IMC: ${JSON.stringify(st.imc || st.byIMC || {})}
- Tensión arterial: ${JSON.stringify(st.ta || st.byTension || {})}

Responde ÚNICAMENTE con el siguiente JSON (sin markdown, sin texto adicional):
{
  "resumenEjecutivo": "párrafo ejecutivo 2-3 líneas",
  "conclusiones": "texto completo con análisis epidemiológico detallado (mínimo 200 palabras)",
  "analisisJustificado": "interpretación epidemiológica justificada con referencias normativas colombianas (Res.1843/2025, Res.0312/2019, Dec.1072/2015, GTC-45)",
  "recomendacionesInforme": "acciones correctivas y PVE recomendados numerados",
  "tabla": [{"diagnostico": "Nombre diagnóstico (CIE-10)", "cantidad": 0, "porcentaje": "0%", "relacion": "relación con riesgos laborales"}],
  "matrizLegalNormativa": "análisis de cumplimiento normativo",
  "pveRecomendados": ["Programa 1", "Programa 2"]
}`;

      const raw = await callAI(prompt);
      let parsed;
      try {
        parsed = parseAIJSON(raw);
      } catch {
        // Si falla el parse, crear objeto con el texto como conclusiones
        parsed = { conclusiones: typeof raw === 'string' ? raw : JSON.stringify(raw) };
      }
      setReportAIResult?.(parsed);
      showAlert?.('✅ Informe IA generado correctamente.');
    } catch (err) {
      showAlert?.(`❌ Error generando informe: ${err.message}`);
    } finally {
      setIsGeneratingReport?.(false);
    }
  };

  // ── RIPS Export ─────────────────────────────────────────────────────
  const handleExportRIPS = () => {
    const ripsData = {
      identificacion: {
        codigoPrestador: currentUser?.doctorData?.licencia || '',
        fechaRemision: new Date().toISOString().split('T')[0],
        numFactura: '',
      },
      usuarios: filteredPatients.map(p => ({
        tipoDoc: p.docTipo || 'CC',
        numDoc: p.docNumero || '',
        nombre: p.nombres || '',
        fechaNac: p.fechaNacimiento || '',
        sexo: (p.genero || '').charAt(0) || 'M',
        zona: p.zonaResidencia || 'U',
        codMunicipio: p.ciudadResidencia || '',
      })),
      consultas: filteredPatients.map(p => ({
        numDoc: p.docNumero || '',
        fechaConsulta: p.fechaExamen || '',
        codConsulta: '890201',
        finalidadConsulta: p.tipoExamen === 'INGRESO' ? '01' : '06',
        causaExterna: '13',
        diagPrincipal: p.diagPrincipal || p.cie10Principal || '',
        diagRelacionado: p.diagnostico2 || '',
        tipoDoc: p.docTipo || 'CC',
      })),
    };

    const blob = new Blob([JSON.stringify(ripsData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `RIPS_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showAlert?.('✅ RIPS JSON exportado.');
  };

  // ── FHIR R4 Export ──────────────────────────────────────────────────
  const handleExportFHIR = () => {
    const bundle = {
      resourceType: 'Bundle',
      type: 'collection',
      timestamp: new Date().toISOString(),
      entry: filteredPatients.map(p => ({
        resource: {
          resourceType: 'Encounter',
          id: p.id,
          status: 'finished',
          class: { system: 'http://terminology.hl7.org/CodeSystem/v3-ActCode', code: 'AMB' },
          type: [{
            coding: [{ system: 'http://snomed.info/sct', code: '410620009', display: 'Occupational health assessment' }],
          }],
          subject: {
            reference: `Patient/${p.docNumero || p.id}`,
            display: p.nombres || '',
          },
          period: {
            start: p.fechaExamen || '',
            end: p.fechaExamen || '',
          },
          diagnosis: [
            p.diagPrincipal && {
              condition: { display: p.diagPrincipal },
              use: { coding: [{ code: 'AD', display: 'Admission diagnosis' }] },
            },
          ].filter(Boolean),
        },
      })),
    };

    const blob = new Blob([JSON.stringify(bundle, null, 2)], { type: 'application/fhir+json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `FHIR_R4_Bundle_${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showAlert?.('✅ FHIR R4 Bundle exportado.');
  };

  // ── CSV Export ──────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const headers = 'Documento,Nombres,Fecha Examen,Tipo Examen,Empresa,Concepto,Diagnóstico Principal,Género,Edad\n';
    const rows = filteredPatients.map(p =>
      [
        p.docNumero || '',
        (p.nombres || '').replace(/,/g, ';'),
        p.fechaExamen || '',
        p.tipoExamen || '',
        (p.empresaNombre || '').replace(/,/g, ';'),
        p.conceptoAptitud || p.conceptoOcupacional || '',
        (p.diagPrincipal || p.cie10Principal || '').replace(/,/g, ';'),
        p.genero || '',
        p.edad || '',
      ].join(',')
    ).join('\n');
    const csv = '\uFEFF' + headers + rows;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `reporte_pacientes_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showAlert?.('✅ CSV exportado.');
  };

  // ── Simple bar chart renderer ───────────────────────────────────────
  const renderBarChart = (data, maxWidth = 200, colorClass = 'bg-emerald-500') => {
    const max = Math.max(...Object.values(data), 1);
    return Object.entries(data).map(([label, count]) => (
      <div key={label} className="flex items-center gap-2 text-xs">
        <span className="w-32 text-right text-gray-600 truncate font-bold">{label}</span>
        <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full ${colorClass} rounded-full transition-all`}
            style={{ width: `${(count / max) * 100}%` }} />
        </div>
        <span className="w-10 text-right font-black text-gray-700">{count}</span>
      </div>
    ));
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: ESTADÍSTICAS
  // ═══════════════════════════════════════════════════════════════════════
  const renderEstadisticas = () => {
    // Calcular métricas adicionales
    const total = filteredPatients.length;
    const conHallazgos = filteredPatients.filter(p => 
      (p.conceptoAptitud || '').toLowerCase().includes('no apt') ||
      (p.conceptoAptitud || '').toLowerCase().includes('reubic') ||
      (p.conceptoAptitud || '').toLowerCase().includes('hallazgos')
    ).length;
    const conRestricciones = filteredPatients.filter(p => 
      p.restriccionesLaborales && p.restriccionesLaborales.length > 0
    ).length;
    const conRiesgosActivos = filteredPatients.filter(p => 
      p.riesgos && Object.values(p.riesgos).some(v => v === true)
    ).length;
    const tasaNoAptos = total > 0 ? ((conHallazgos / total) * 100).toFixed(1) : 0;
    const edadPromedio = total > 0
      ? (filteredPatients.reduce((acc, p) => acc + (parseInt(p.edad) || 0), 0) / total).toFixed(0)
      : 0;

    return (
      <div className="space-y-6">
        {/* Warn legal */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
          ⚠️ <strong>Res.1843/2025 Art.19</strong> - Confidencial
        </div>

        {/* Summary cards - métricas clave */}
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="bg-white border border-emerald-200 rounded-xl p-4 text-center">
            <Users className="w-6 h-6 text-emerald-600 mx-auto mb-1" />
            <p className="text-2xl font-black text-emerald-700">{stats.total}</p>
            <p className="text-xs font-bold text-gray-500">Total Evaluados</p>
          </div>
          <div className="bg-white border border-amber-200 rounded-xl p-4 text-center">
            <AlertTriangle className="w-6 h-6 text-amber-600 mx-auto mb-1" />
            <p className="text-2xl font-black text-amber-700">{conHallazgos}</p>
            <p className="text-xs font-bold text-gray-500">Con Hallazgos</p>
          </div>
          <div className="bg-white border border-red-200 rounded-xl p-4 text-center">
            <Shield className="w-6 h-6 text-red-600 mx-auto mb-1" />
            <p className="text-2xl font-black text-red-700">{conRestricciones}</p>
            <p className="text-xs font-bold text-gray-500">Con Restricciones</p>
          </div>
          <div className="bg-white border border-orange-200 rounded-xl p-4 text-center">
            <Activity className="w-6 h-6 text-orange-600 mx-auto mb-1" />
            <p className="text-2xl font-black text-orange-700">{conRiesgosActivos}</p>
            <p className="text-xs font-bold text-gray-500">Con Riesgos</p>
          </div>
          <div className="bg-white border border-purple-200 rounded-xl p-4 text-center">
            <CheckCircle2 className="w-6 h-6 text-purple-600 mx-auto mb-1" />
            <p className="text-2xl font-black text-purple-700">{tasaNoAptos}%</p>
            <p className="text-xs font-bold text-gray-500">Tasa No Aptos</p>
          </div>
          <div className="bg-white border border-blue-200 rounded-xl p-4 text-center">
            <TrendingUp className="w-6 h-6 text-blue-600 mx-auto mb-1" />
            <p className="text-2xl font-black text-blue-700">{edadPromedio}</p>
            <p className="text-xs font-bold text-gray-500">Edad Prom.</p>
          </div>
        </div>

        {/* 1. PERFIL SOCIODEMOGRÁFICO */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-black text-sm text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
            <Users className="w-4 h-4 text-indigo-600" /> 1. Perfil Sociodemográfico y Ocupacional
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* Por Género */}
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1">
                <Users className="w-3 h-3" /> Género
              </p>
              {Object.entries(stats.byGender).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs mb-1">
                  <span>{k}</span>
                  <span className="font-bold">{total > 0 ? ((v / total) * 100).toFixed(0) : 0}%</span>
                </div>
              ))}
            </div>

            {/* Por Grupo Etario */}
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1">
                <TrendingUp className="w-3 h-3" /> Rango Etario
              </p>
              {Object.entries(stats.byAge).filter(([,v]) => v > 0).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs mb-1">
                  <span>{k}</span>
                  <span className="font-bold">{total > 0 ? ((v / total) * 100).toFixed(0) : 0}%</span>
                </div>
              ))}
            </div>

            {/* Por Escolaridad */}
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1">
                <Stethoscope className="w-3 h-3" /> Escolaridad
              </p>
              {Object.entries(stats.byEscolaridad).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs mb-1">
                  <span className="truncate">{k}</span>
                  <span className="font-bold">{total > 0 ? ((v / total) * 100).toFixed(0) : 0}%</span>
                </div>
              ))}
            </div>

            {/* Por Estado Civil */}
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2 flex items-center gap-1">
                <Heart className="w-3 h-3" /> Estado Civil
              </p>
              {Object.entries(stats.byEstadoCivil).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs mb-1">
                  <span>{k}</span>
                  <span className="font-bold">{total > 0 ? ((v / total) * 100).toFixed(0) : 0}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Segunda fila */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
            {/* Por Estrato */}
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">Estrato</p>
              {Object.entries(stats.byEstrato).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs mb-1">
                  <span>{k}</span>
                  <span className="font-bold">{total > 0 ? ((v / total) * 100).toFixed(0) : 0}%</span>
                </div>
              ))}
            </div>

            {/* Por Zona */}
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">Zona Residencia</p>
              {Object.entries(stats.byZona).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs mb-1">
                  <span>{k}</span>
                  <span className="font-bold">{total > 0 ? ((v / total) * 100).toFixed(0) : 0}%</span>
                </div>
              ))}
            </div>

            {/* Por Tipo Contrato */}
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">Tipo Contrato</p>
              {Object.entries(stats.byContrato).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs mb-1">
                  <span>{k}</span>
                  <span className="font-bold">{total > 0 ? ((v / total) * 100).toFixed(0) : 0}%</span>
                </div>
              ))}
            </div>

            {/* Por Turno */}
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">Turno</p>
              {Object.entries(stats.byTurno).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs mb-1">
                  <span>{k}</span>
                  <span className="font-bold">{total > 0 ? ((v / total) * 100).toFixed(0) : 0}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 2. PERFIL CLÍNICO Y DE SALUD */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-black text-sm text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
            <Activity className="w-4 h-4 text-red-600" /> 2. Perfil Clínico y de Salud
          </h3>
          
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {/* IMC */}
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">IMC</p>
              {Object.entries(stats.byIMC).filter(([,v]) => v > 0).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs mb-1">
                  <span>{k}</span>
                  <span className="font-bold">{total > 0 ? ((v / total) * 100).toFixed(0) : 0}%</span>
                </div>
              ))}
              {Object.values(stats.byIMC).every(v => v === 0) && (
                <p className="text-xs text-gray-400">Sin datos</p>
              )}
            </div>

            {/* Tensión Arterial */}
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">Tensión Arterial</p>
              {Object.entries(stats.byTension).filter(([,v]) => v > 0).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs mb-1">
                  <span>{k}</span>
                  <span className="font-bold">{total > 0 ? ((v / total) * 100).toFixed(0) : 0}%</span>
                </div>
              ))}
              {Object.values(stats.byTension).every(v => v === 0) && (
                <p className="text-xs text-gray-400">Sin datos</p>
              )}
            </div>

            {/* Examen Físico Alterado */}
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">Examen Físico Alterado</p>
              {Object.entries(stats.examenFisicoAlterado).filter(([,v]) => v > 0).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs mb-1">
                  <span className="capitalize">{k.toLowerCase()}</span>
                  <span className="font-bold">{v}</span>
                </div>
              ))}
              {Object.values(stats.examenFisicoAlterado).every(v => v === 0) && (
                <p className="text-xs text-gray-400">Sin datos</p>
              )}
            </div>

            {/* Estilos de Vida */}
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">Estilos de Vida</p>
              {Object.entries(stats.byEstilos).filter(([,v]) => v > 0).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs mb-1">
                  <span>{k}</span>
                  <span className="font-bold">{total > 0 ? ((v / total) * 100).toFixed(1) : 0}%</span>
                </div>
              ))}
              {Object.values(stats.byEstilos).every(v => v === 0) && (
                <p className="text-xs text-gray-400">Sin datos</p>
              )}
            </div>
          </div>
        </div>

        {/* 3. CONCEPTOS DE APTITUD */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-black text-sm text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" /> 3. Concepto de Aptitud
          </h3>
          <div className="space-y-2">
            {Object.entries(stats.byConcepto).map(([concepto, count]) => {
              const pct = total > 0 ? ((count / total) * 100).toFixed(1) : 0;
              const isNoApto = (concepto || '').toLowerCase().includes('no apt') || 
                              (concepto || '').toLowerCase().includes('reubic');
              return (
                <div key={concepto} className="flex items-center gap-3">
                  <span className={`w-4 h-4 rounded-full flex-shrink-0 ${isNoApto ? 'bg-red-500' : 'bg-emerald-500'}`} />
                  <span className="flex-1 text-xs text-gray-700 truncate">{concepto}</span>
                  <span className="text-xs font-bold text-gray-500">{count}</span>
                  <div className="w-24 h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full rounded-full ${isNoApto ? 'bg-red-400' : 'bg-emerald-400'}`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="text-xs font-black text-gray-700 w-12 text-right">{pct}%</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* 4. RIESGOS OCUPACIONALES */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-black text-sm text-gray-800 mb-4 flex items-center gap-2 border-b pb-2">
            <Shield className="w-4 h-4 text-orange-600" /> 4. Riesgos Laborales Expuestos
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {Object.entries(stats.byRiesgos).filter(([,v]) => v > 0).map(([k, v]) => {
              const pct = total > 0 ? ((v / total) * 100).toFixed(1) : 0;
              return (
                <div key={k} className="bg-orange-50 rounded-lg p-3">
                  <div className="flex justify-between text-xs mb-1">
                    <span className="font-medium">{k}</span>
                    <span className="font-bold">{pct}%</span>
                  </div>
                  <div className="w-full h-2 bg-orange-200 rounded-full overflow-hidden">
                    <div className="h-full bg-orange-500 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tipo Examen */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-black text-sm text-gray-800 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" /> Distribución por Tipo de Examen
          </h3>
          <div className="space-y-2">
            {renderBarChart(stats.byTipo, 300, 'bg-blue-500')}
            {Object.keys(stats.byTipo).length === 0 && (
              <p className="text-gray-400 text-xs text-center py-4">Sin datos</p>
            )}
          </div>
        </div>

        {/* Top CIE-10 */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-black text-sm text-gray-800 mb-4 flex items-center gap-2">
            <Activity className="w-4 h-4 text-red-600" /> Top 10 Diagnósticos (CIE-10)
          </h3>
          {stats.topDiag.length === 0 ? (
            <p className="text-gray-400 text-xs text-center py-4">Sin diagnósticos registrados</p>
          ) : (
            <div className="space-y-2">
              {stats.topDiag.map(([diag, count], i) => (
                <div key={diag} className="flex items-center gap-3 text-xs">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-white font-black text-[10px] ${
                    i < 3 ? 'bg-red-500' : 'bg-gray-400'
                  }`}>{i + 1}</span>
                  <span className="flex-1 text-gray-700 font-bold truncate">{diag}</span>
                  <span className="font-black text-gray-800">{count}</span>
                  <div className="w-20 h-3 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-full bg-red-400 rounded-full"
                      style={{ width: `${(count / (stats.topDiag[0]?.[1] || 1)) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Analytics panel: Top 5 DX + Tendencia mensual — monolito 24228-24301 ── */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Top 5 DX */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-black text-xs text-gray-700 mb-3 uppercase border-b pb-1">Top 5 Diagnósticos</h3>
            {Object.entries(
              filteredPatients.reduce((acc, p) => {
                const d = (p.diagnosticoPrincipal || p.diagPrincipal || '').split(' - ')[0] || 'Z10.0';
                acc[d] = (acc[d] || 0) + 1; return acc;
              }, {})
            ).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([dx, cnt], i) => (
              <div key={dx} className="flex items-center gap-2 mb-2 text-xs">
                <span className={`w-5 h-5 rounded-full flex items-center justify-center text-white font-black text-[9px] flex-shrink-0 ${i === 0 ? 'bg-red-500' : i < 3 ? 'bg-orange-400' : 'bg-gray-400'}`}>{i + 1}</span>
                <span className="flex-1 text-gray-700 truncate font-bold" title={dx}>{dx}</span>
                <div className="w-16 h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full bg-indigo-500 rounded-full" style={{ width: `${(cnt / (filteredPatients.length || 1)) * 100}%` }} />
                </div>
                <span className="font-black text-gray-700 text-[10px] w-6 text-right">{cnt}</span>
              </div>
            ))}
            {filteredPatients.length === 0 && <p className="text-xs text-gray-400 text-center py-2">Sin datos</p>}
          </div>
          {/* Tendencia mensual */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="font-black text-xs text-gray-700 mb-3 uppercase border-b pb-1">Tendencia Mensual</h3>
            {(() => {
              const monthly = filteredPatients.reduce((acc, p) => {
                const m = (p.fechaExamen || '').substring(0, 7);
                if (m) acc[m] = (acc[m] || 0) + 1; return acc;
              }, {});
              const sorted = Object.entries(monthly).sort(([a], [b]) => a.localeCompare(b)).slice(-12);
              const maxV = Math.max(...sorted.map(([, v]) => v), 1);
              return sorted.length > 0 ? (
                <div className="space-y-1.5">
                  {sorted.map(([m, v]) => (
                    <div key={m} className="flex items-center gap-2 text-xs">
                      <span className="w-14 text-gray-500 font-mono text-[10px] flex-shrink-0">{m}</span>
                      <div className="flex-1 h-4 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${(v / maxV) * 100}%` }} />
                      </div>
                      <span className="font-black text-gray-700 text-[10px] w-5 text-right">{v}</span>
                    </div>
                  ))}
                </div>
              ) : <p className="text-xs text-gray-400 text-center py-2">Sin datos</p>;
            })()}
          </div>
        </div>

        {/* ── Análisis IA integrado en estadísticas ── */}
        {renderAIReport()}

        {/* ── PUNTO 4: Matriz Legal de Condiciones de Salud — monolito 25087-25279 ── */}
        <div className="mt-6 border-t-2 border-gray-200 pt-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="bg-blue-900 text-white w-8 h-8 rounded-full flex items-center justify-center font-black text-sm flex-shrink-0">4</div>
            <div>
              <h2 className="text-base font-black text-blue-900 uppercase">Matriz Legal de Condiciones de Salud y Tabulación</h2>
              <p className="text-xs text-gray-500">Cumplimiento Normativo SST — Res. 1843/2025 · Dec. 1072/2015 · Res. 0312/2019 · Ley 1562/2012</p>
            </div>
          </div>
          <div className="overflow-x-auto border border-gray-200 rounded-xl">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-blue-900 text-white">
                  <th className="p-2 text-left font-bold">ID / Trabajador</th>
                  <th className="p-2 font-bold">Edad</th>
                  <th className="p-2 font-bold text-left">Riesgos Ocupacionales</th>
                  <th className="p-2 font-bold text-left">Diagnóstico (CIE-10)</th>
                  <th className="p-2 font-bold text-left" style={{ minWidth: '200px' }}>Restricciones Laborales</th>
                </tr>
              </thead>
              <tbody>
                {filteredPatients.map((p, i) => {
                  const riesgosActivos = Object.entries(p.riesgos || {}).filter(([, v]) => v).map(([k]) => k.charAt(0).toUpperCase() + k.slice(1)).join(', ');
                  return (
                    <tr key={`${p.id}-${i}`} className={`border-b ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'} hover:bg-blue-50 align-top`}>
                      <td className="p-2">
                        <p className="font-bold text-blue-900">{p.docNumero}</p>
                        <p className="text-gray-600 text-[10px]">{(p.nombres || '').substring(0, 28)}{(p.nombres || '').length > 28 ? '...' : ''}</p>
                      </td>
                      <td className="p-2 text-center">{p.edad || '--'}</td>
                      <td className="p-2" style={{ maxWidth: '130px' }}>
                        <p className="text-gray-700 leading-relaxed">{riesgosActivos || <span className="text-gray-400 italic">No registrados</span>}</p>
                      </td>
                      <td className="p-2" style={{ maxWidth: '140px' }}>
                        <p className="font-bold text-blue-900">{p.diagnosticoPrincipal || p.diagPrincipal || 'Z10.0'}</p>
                        {p.diagnosticoSecundario1 && <p className="text-gray-500 text-[10px] mt-0.5">{p.diagnosticoSecundario1}</p>}
                      </td>
                      <td className="p-2" style={{ minWidth: '200px' }}>
                        {p.analisisRestricciones ? (
                          <div>
                            <p className="text-[9px] font-black text-red-700 uppercase mb-0.5">⚠ Restricciones:</p>
                            <p className="text-red-800 leading-relaxed text-[10px] whitespace-pre-wrap">
                              {Array.isArray(p.analisisRestricciones) ? p.analisisRestricciones.join('\n') : p.analisisRestricciones}
                            </p>
                          </div>
                        ) : <span className="text-gray-400 italic text-[10px]">Sin restricciones</span>}
                      </td>
                    </tr>
                  );
                })}
                {filteredPatients.length === 0 && (
                  <tr><td colSpan="5" className="p-8 text-center text-gray-400 italic">No hay registros para esta empresa en el período seleccionado.</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Normativa SST — monolito 25217-25278 */}
          <div className="mt-4 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <h4 className="font-black text-blue-900 text-xs uppercase mb-3 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Marco Normativo SST Aplicado
            </h4>
            <div className="grid grid-cols-2 gap-2 text-[10px]">
              {[
                { ley: 'Resolución 1843/2025', desc: 'Evaluaciones médicas ocupacionales - Norma vigente (deroga Res. 2346/2007 y 1918/2009)' },
                { ley: 'Decreto 1072/2015 Art. 2.2.4.6', desc: 'Obligaciones del empleador en el Sistema de Gestión SST' },
                { ley: 'Resolución 0312/2019', desc: 'Estándares mínimos del SG-SST -- exámenes de ingreso, periódicos y egreso' },
                { ley: 'Ley 1562/2012 Art. 11', desc: 'Sistema General de Riesgos Laborales -- EPS y ARL' },
                { ley: 'GTC-45:2012', desc: 'Identificación de peligros y valoración de riesgos laborales' },
                { ley: 'Resolución 2404/2019', desc: 'Guías técnicas de vigilancia epidemiológica' },
                { ley: 'GATISO-DME (2015)', desc: 'Desórdenes musculoesqueléticos relacionados con el trabajo' },
                { ley: 'Res. 1995/1999 Art. 15', desc: 'Custodia y retención de historias clínicas - mínimo 20 años' },
                { ley: 'Resolución 1442/2024', desc: 'CIE-11 Colombia - transición gradual desde CIE-10' },
                { ley: 'Res. 2175/2015 CUPS-MSPS', desc: 'Códigos Únicos de Procedimientos en Salud' },
              ].map((n, i) => (
                <div key={i} className="flex gap-2 bg-white p-2 rounded border border-blue-100">
                  <span className="font-bold text-blue-800 min-w-[140px]">{n.ley}</span>
                  <span className="text-gray-600">{n.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: SVE INDICATORS
  // ═══════════════════════════════════════════════════════════════════════
  const renderSVE = () => {
    const programs = [
      {
        name: 'DME (Desórdenes Musculoesqueléticos)',
        icon: Activity,
        color: 'blue',
        data: sveIndicators.dme,
        desc: 'Dolor osteomuscular, patologías M en CIE-10',
      },
      {
        name: 'Cardiovascular',
        icon: Heart,
        color: 'red',
        data: sveIndicators.cardiovascular,
        desc: 'Tensión arterial ≥ 140 mmHg sistólica',
      },
      {
        name: 'Respiratorio',
        icon: Wind,
        color: 'teal',
        data: sveIndicators.respiratorio,
        desc: 'Espirometría anormal, diagnósticos J en CIE-10',
      },
      {
        name: 'Auditivo',
        icon: Ear,
        color: 'amber',
        data: sveIndicators.auditivo,
        desc: 'Audiometría anormal, hipoacusia, códigos H9x',
      },
      {
        name: 'Psicosocial',
        icon: Brain,
        color: 'purple',
        data: sveIndicators.psicosocial,
        desc: 'Riesgo psicosocial alto/muy alto, diagnósticos F en CIE-10',
      },
    ];

    return (
      <div className="space-y-4">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-sm font-bold text-amber-800 flex items-center gap-2">
            <Shield className="w-4 h-4" /> Indicadores de Sistemas de Vigilancia Epidemiológica
          </p>
          <p className="text-xs text-amber-600 mt-1">
            Basados en Res. 0312/2019 y Decreto 1072/2015. Evaluando {filteredPatients.length} pacientes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {programs.map(prog => {
            const Icon = prog.icon;
            const pct = parseFloat(prog.data.pct);
            const riskLevel = pct > 20 ? 'alto' : pct > 10 ? 'medio' : 'bajo';
            const riskColor = riskLevel === 'alto' ? 'text-red-600 bg-red-100'
              : riskLevel === 'medio' ? 'text-amber-600 bg-amber-100'
              : 'text-emerald-600 bg-emerald-100';

            return (
              <div key={prog.name} className="bg-white border border-gray-200 rounded-xl p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={`w-8 h-8 bg-${prog.color}-100 rounded-lg flex items-center justify-center`}>
                      <Icon className={`w-4 h-4 text-${prog.color}-600`} />
                    </div>
                    <h4 className="font-black text-sm text-gray-800">{prog.name}</h4>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${riskColor}`}>
                    {riskLevel.toUpperCase()}
                  </span>
                </div>
                <div className="flex items-end gap-3">
                  <div>
                    <p className="text-3xl font-black text-gray-800">{prog.data.count}</p>
                    <p className="text-xs text-gray-500">casos detectados</p>
                  </div>
                  <div className="flex-1">
                    <div className="w-full h-4 bg-gray-100 rounded-full overflow-hidden">
                      <div className={`h-full bg-${prog.color}-500 rounded-full transition-all`}
                        style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                    <p className="text-right text-xs font-black text-gray-600 mt-0.5">{prog.data.pct}%</p>
                  </div>
                </div>
                <p className="text-[10px] text-gray-400 mt-2">{prog.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: AI REPORT — idéntico al monolito líneas 24967-25085
  // ═══════════════════════════════════════════════════════════════════════
  const renderAIReport = () => {
    const aiObj = reportAIResult && typeof reportAIResult === 'object' ? reportAIResult : null;
    const aiStr = reportAIResult && typeof reportAIResult === 'string' ? reportAIResult : null;
    return (
      <div className="bg-indigo-50 p-4 rounded-xl border border-indigo-100">
        <div className="flex justify-between items-center mb-3">
          <h3 className="font-black text-indigo-900 flex items-center gap-2">
            <BrainCircuit className="w-4 h-4" /> Análisis Inteligente IA
          </h3>
          <button
            onClick={() => handleGenerateAIReport()}
            disabled={isGeneratingReport}
            className="bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex items-center gap-1.5 hover:bg-indigo-700 disabled:opacity-50"
          >
            {isGeneratingReport ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5" />
            )} Generar Análisis IA
          </button>
        </div>

        {/* Resultado estructurado (JSON) */}
        {aiObj ? (
          <div>
            {aiObj.resumenEjecutivo && (
              <div className="bg-white p-3 rounded-lg border border-indigo-200 mb-3 text-xs font-bold text-indigo-900">
                {aiObj.resumenEjecutivo}
              </div>
            )}
            {aiObj.conclusiones && (
              <div className="text-xs text-justify text-gray-700 leading-relaxed whitespace-pre-wrap mb-3">
                {aiObj.conclusiones}
              </div>
            )}
            {/* Análisis Justificado */}
            {aiObj.analisisJustificado && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-3">
                <p className="font-black text-amber-900 text-xs uppercase mb-2 flex items-center gap-1">
                  <FileSearch className="w-3.5 h-3.5" /> Análisis Justificado — Interpretación Epidemiológica
                </p>
                <div className="text-xs text-justify text-amber-900 leading-relaxed whitespace-pre-wrap">
                  {aiObj.analisisJustificado}
                </div>
              </div>
            )}
            {/* Recomendaciones */}
            {aiObj.recomendacionesInforme && (
              <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4 mb-3">
                <p className="font-black text-emerald-900 text-xs uppercase mb-2 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Recomendaciones — Acciones Correctivas y PVE
                </p>
                <div className="text-xs text-justify text-emerald-900 leading-relaxed whitespace-pre-wrap">
                  {aiObj.recomendacionesInforme}
                </div>
              </div>
            )}
            {/* Tabla de morbilidad */}
            {aiObj.tabla?.length > 0 && (
              <div className="overflow-x-auto mb-4">
                <p className="font-black text-gray-700 text-xs uppercase mb-2">📊 Morbilidad Prevalente</p>
                <table className="w-full text-xs border border-gray-300">
                  <thead>
                    <tr className="bg-slate-800 text-white">
                      <th className="py-2.5 px-3 text-left font-bold">Diagnóstico (CIE-10)</th>
                      <th className="py-2.5 px-3 text-center font-bold w-20">Casos</th>
                      <th className="py-2.5 px-3 text-center font-bold w-20">%</th>
                      <th className="py-2.5 px-3 text-left font-bold w-32">Relación</th>
                    </tr>
                  </thead>
                  <tbody>
                    {aiObj.tabla.map((r, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        <td className="py-2 px-3 border-b border-gray-200 font-semibold">{r.diagnostico}</td>
                        <td className="py-2 px-3 border-b border-gray-200 text-center font-bold">{r.cantidad}</td>
                        <td className="py-2 px-3 border-b border-gray-200 text-center font-bold text-indigo-700">{r.porcentaje}</td>
                        <td className="py-2 px-3 border-b border-gray-200 text-gray-600">{r.relacion || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {/* Cumplimiento normativo */}
            {aiObj.matrizLegalNormativa && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-900">
                <p className="font-black mb-2 flex items-center gap-1 uppercase text-blue-800">
                  <ShieldCheck className="w-3.5 h-3.5" /> Cumplimiento Normativo
                </p>
                <p className="text-justify leading-relaxed">{aiObj.matrizLegalNormativa}</p>
              </div>
            )}
            {/* PVE Recomendados */}
            {aiObj.pveRecomendados?.length > 0 && (
              <div className="mt-4 bg-teal-50 border border-teal-200 rounded-lg p-4 text-xs">
                <p className="font-black text-teal-900 uppercase mb-2 flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5" /> Programas de Vigilancia Epidemiológica Recomendados
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {aiObj.pveRecomendados.map((pve, i) => (
                    <div key={i} className="flex items-center gap-2 bg-white border border-teal-100 rounded-lg px-3 py-2">
                      <span className="text-teal-600 font-bold">✓</span>
                      <span className="text-teal-900 font-semibold">{pve}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {/* Acciones sobre el resultado */}
            <div className="flex gap-2 mt-4 pt-3 border-t border-indigo-100">
              <button onClick={() => {
                const txt = JSON.stringify(aiObj, null, 2);
                navigator.clipboard?.writeText(txt);
                showAlert?.('📋 Copiado al portapapeles.');
              }} className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200">
                <Copy className="w-3 h-3" /> Copiar
              </button>
              <button onClick={() => {
                // Guardar informe en localStorage
                const savedKey = `siso_informes_${currentUser?.user || 'shared'}`;
                const saved = JSON.parse(localStorage.getItem(savedKey) || '[]');
                saved.unshift({
                  id: Date.now().toString(),
                  fecha: new Date().toISOString().split('T')[0],
                  empresaNombre: compName,
                  empresaId: selectedCompanyReport,
                  total: filteredPatients.length,
                  resultado: aiObj,
                });
                localStorage.setItem(savedKey, JSON.stringify(saved.slice(0, 50)));
                showAlert?.('✅ Informe guardado.');
              }} className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-200">
                <Save className="w-3 h-3" /> Guardar Informe
              </button>
            </div>
          </div>
        ) : aiStr ? (
          /* Resultado plano (texto) */
          <div>
            <div className="text-xs text-justify text-gray-700 leading-relaxed whitespace-pre-wrap mb-3">{aiStr}</div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => { navigator.clipboard?.writeText(aiStr); showAlert?.('📋 Copiado.'); }}
                className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200">
                <Copy className="w-3 h-3" /> Copiar
              </button>
            </div>
          </div>
        ) : (
          <p className="text-center text-gray-400 text-xs py-4 italic">
            Haga clic en "Generar Análisis IA" para obtener el diagnóstico poblacional completo.
          </p>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: EXPORTACIÓN PDF DE TABLA
  // ═══════════════════════════════════════════════════════════════════════
  const handlePrintTable = () => {
    const printContent = document.getElementById('tabla-trabajadores-print');
    if (!printContent) {
      showAlert?.('⚠️ No hay contenido para imprimir');
      return;
    }
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Reporte de Trabajadores - ${new Date().toLocaleDateString('es-CO')}</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 10px; }
            table { width: 100%; border-collapse: collapse; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: left; }
            th { background: #333; color: white; }
            .bg-amber-50 { background: #fffbeb; }
            .text-red-600 { color: #dc2626; }
            .text-emerald-600 { color: #059669; }
            @media print {
              body { margin: 0; }
              table { page-break-inside: auto; }
              tr { page-break-inside: avoid; page-break-after: auto; }
            }
          </style>
        </head>
        <body>
          <h1>Reporte de Trabajadores</h1>
          <p>Empresa: ${companies.find(c => c.id === selectedCompanyReport)?.nombre || 'Todas'}</p>
          <p>Fecha: ${new Date().toLocaleDateString('es-CO')}</p>
          <p>Total trabajadores: ${filteredPatients.length}</p>
          ${printContent.innerHTML}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: RESUMEN EJECUTIVO AUTOMÁTICO
  // ═══════════════════════════════════════════════════════════════════════
  const renderResumenEjecutivo = () => {
    // Calcular métricas clave
    const total = filteredPatients.length;
    const conHallazgos = filteredPatients.filter(p => 
      (p.conceptoAptitud || '').toLowerCase().includes('no apt') ||
      (p.conceptoAptitud || '').toLowerCase().includes('reubic') ||
      (p.conceptoAptitud || '').toLowerCase().includes('hallazgos')
    ).length;
    const conRestricciones = filteredPatients.filter(p => 
      p.restriccionesLaborales && p.restriccionesLaborales.length > 0
    ).length;
    const conRiesgosActivos = filteredPatients.filter(p => 
      p.riesgos && Object.values(p.riesgos).some(v => v === true)
    ).length;
    const tasaNoAptos = total > 0 ? ((conHallazgos / total) * 100).toFixed(1) : 0;
    
    // Calcular edad promedio
    const edadPromedio = filteredPatients.length > 0
      ? (filteredPatients.reduce((acc, p) => acc + (parseInt(p.edad) || 0), 0) / filteredPatients.length).toFixed(0)
      : 0;

    // Por género
    const generoStats = { 'Masculino': 0, 'Femenino': 0 };
    filteredPatients.forEach(p => {
      if ((p.genero || '').toLowerCase().includes('masc')) generoStats['Masculino']++;
      else if ((p.genero || '').toLowerCase().includes('fem')) generoStats['Femenino']++;
    });

    // Rango etario
    const rangoEtario = { '<18': 0, '18-27': 0, '28-37': 0, '38-47': 0, '48-57': 0, '58+': 0 };
    filteredPatients.forEach(p => {
      const edad = parseInt(p.edad) || 0;
      if (edad < 18) rangoEtario['<18']++;
      else if (edad < 28) rangoEtario['18-27']++;
      else if (edad < 38) rangoEtario['28-37']++;
      else if (edad < 48) rangoEtario['38-47']++;
      else if (edad < 58) rangoEtario['48-57']++;
      else rangoEtario['58+']++;
    });

    // Escolaridad
    const escolaridadStats = {};
    filteredPatients.forEach(p => {
      const esc = p.escolaridad || 'No registrada';
      escolaridadStats[esc] = (escolaridadStats[esc] || 0) + 1;
    });

    // Estado civil
    const estadoCivilStats = {};
    filteredPatients.forEach(p => {
      const ec = p.estadoCivil || 'No registrado';
      estadoCivilStats[ec] = (estadoCivilStats[ec] || 0) + 1;
    });

    // Estrato
    const estratoStats = {};
    filteredPatients.forEach(p => {
      const est = p.estrato || 'No registrado';
      estratoStats[est] = (estratoStats[est] || 0) + 1;
    });

    // Zona
    const zonaStats = { 'Urbana': 0, 'Rural': 0 };
    filteredPatients.forEach(p => {
      const zona = (p.zonaResidencia || '').toLowerCase();
      if (zona.includes('urb')) zonaStats['Urbana']++;
      else if (zona.includes('rur')) zonaStats['Rural']++;
    });

    // Cargo
    const cargoStats = {};
    filteredPatients.forEach(p => {
      const cargo = p.cargo || 'No registrado';
      cargoStats[cargo] = (cargoStats[cargo] || 0) + 1;
    });
    const topCargos = Object.entries(cargoStats).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Tipo contrato
    const contratoStats = {};
    filteredPatients.forEach(p => {
      const tc = p.tipoContrato || 'No registrado';
      contratoStats[tc] = (contratoStats[tc] || 0) + 1;
    });

    // Turno
    const turnoStats = {};
    filteredPatients.forEach(p => {
      const turno = p.turnoTrabajo || 'No registrado';
      turnoStats[turno] = (turnoStats[turno] || 0) + 1;
    });

    // Tipo examen
    const tipoExamStats = {};
    filteredPatients.forEach(p => {
      const te = p.tipoExamen || 'No registrado';
      tipoExamStats[te] = (tipoExamStats[te] || 0) + 1;
    });

    // Hallazgos físicos anormales
    const hallazgosFisicos = { 'Extremidades': 0, 'Columna': 0, 'Neurológico': 0, 'Cardiovascular': 0, 'Respiratorio': 0 };
    filteredPatients.forEach(p => {
      if ((p.examenFisicoExtremidades || '').toLowerCase().includes('alter')) hallazgosFisicos['Extremidades']++;
      if ((p.examenFisicoColumna || '').toLowerCase().includes('alter')) hallazgosFisicos['Columna']++;
      if ((p.examenFisicoNeurologico || '').toLowerCase().includes('alter')) hallazgosFisicos['Neurológico']++;
      if ((p.examenFisicoCardiovascular || '').toLowerCase().includes('alter')) hallazgosFisicos['Cardiovascular']++;
      if ((p.examenFisicoRespiratorio || '').toLowerCase().includes('alter')) hallazgosFisicos['Respiratorio']++;
    });

    // Estilos de vida
    const estilosVida = { 'Fumadores': 0, 'Alcohol': 0, 'Deporte': 0 };
    filteredPatients.forEach(p => {
      if ((p.habitos?.fuma || p.fuma || '').toLowerCase().includes('si')) estilosVida['Fumadores']++;
      if ((p.habitos?.alcohol || p.alcohol || '').toLowerCase().includes('si')) estilosVida['Alcohol']++;
      if ((p.habitos?.deporte || p.deporte || '').toLowerCase().includes('si')) estilosVida['Deporte']++;
    });

    // Riesgos ocupacionales
    const riesgosExpuestos = { 'Físicos': 0, 'Mecánicos': 0, 'Biomecánicos': 0, 'Locativos': 0, 'Químicos': 0, 'Biológicos': 0, 'Psicosocial': 0 };
    filteredPatients.forEach(p => {
      const riesgos = p.riesgos || {};
      if (riesgos.fisicos) riesgosExpuestos['Físicos']++;
      if (riesgos.mecanicos) riesgosExpuestos['Mecánicos']++;
      if (riesgos.biomecanicos) riesgosExpuestos['Biomecánicos']++;
      if (riesgos.locativos) riesgosExpuestos['Locativos']++;
      if (riesgos.quimicos) riesgosExpuestos['Químicos']++;
      if (riesgos.biologicos) riesgosExpuestos['Biológicos']++;
      if (riesgos.psicosocial) riesgosExpuestos['Psicosocial']++;
    });

    // Recomendaciones
    const recomendaciones = [];
    if (sveIndicators.dme.pct > 10) {
      recomendaciones.push('⚠️ Implementar programa de vigilancia ergonómica');
    }
    if (sveIndicators.cardiovascular.pct > 10) {
      recomendaciones.push('⚠️ Programa de control de factores de riesgo cardiovascular');
    }
    if (sveIndicators.psicosocial.pct > 10) {
      recomendaciones.push('⚠️ Intervención en factores de riesgo psicosocial');
    }
    recomendaciones.push('✓ Continuar con el programa de exámenes ocupacionales');

    // Función auxiliar para mostrar percentage
    const pct = (count) => total > 0 ? ((count / total) * 100).toFixed(0) : 0;

    return (
      <div className="space-y-6">
        {/* Header con warn legal */}
        <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-xl p-4 text-white">
          <p className="font-black flex items-center gap-2">
            <FileText className="w-4 h-4" /> Resumen Ejecutivo Automático
          </p>
          <p className="text-xs text-indigo-100 mt-1">
            Análisis instantáneo sin necesidad de IA
          </p>
        </div>

        {/* Warn legal */}
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
          ⚠️ <strong>Res.1843/2025 Art.19</strong> - Confidencial
        </div>

        {/* Métricas clave */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-blue-600">{total}</p>
            <p className="text-xs font-bold text-gray-500">Total Evaluados</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-amber-600">{conHallazgos}</p>
            <p className="text-xs font-bold text-gray-500">Con Hallazgos</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-red-600">{conRestricciones}</p>
            <p className="text-xs font-bold text-gray-500">Con Restricciones</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-orange-600">{conRiesgosActivos}</p>
            <p className="text-xs font-bold text-gray-500">Con Riesgos Activos</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <p className="text-2xl font-black text-purple-600">{tasaNoAptos}%</p>
            <p className="text-xs font-bold text-gray-500">Tasa No Aptos</p>
          </div>
        </div>

        {/* Segunda fila métricas */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <p className="text-xl font-black text-gray-700">{edadPromedio}</p>
            <p className="text-xs font-bold text-gray-500">Edad prom. (años)</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-3 text-center">
            <p className="text-xl font-black text-gray-700">{(precioPorPaciente || 0).toLocaleString('es-CO')}</p>
            <p className="text-xs font-bold text-gray-500">Precio por paciente ($)</p>
          </div>
        </div>

        {/* 1. PERFIL SOCIODEMOGRÁFICO */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-black text-sm text-gray-800 mb-4 border-b pb-2">1. Perfil Sociodemográfico y Ocupacional</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* Género */}
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">Género</p>
              {Object.entries(generoStats).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs mb-1">
                  <span>{k}</span>
                  <span className="font-bold">{pct(v)}%</span>
                </div>
              ))}
            </div>

            {/* Rango Etario */}
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">Rango Etario</p>
              {Object.entries(rangoEtario).filter(([,v]) => v > 0).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs mb-1">
                  <span>{k}</span>
                  <span className="font-bold">{pct(v)}%</span>
                </div>
              ))}
            </div>

            {/* Escolaridad */}
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">Escolaridad</p>
              {Object.entries(escolaridadStats).sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs mb-1">
                  <span className="truncate">{k}</span>
                  <span className="font-bold">{pct(v)}%</span>
                </div>
              ))}
            </div>

            {/* Estado Civil */}
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">Estado Civil</p>
              {Object.entries(estadoCivilStats).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs mb-1">
                  <span>{k}</span>
                  <span className="font-bold">{pct(v)}%</span>
                </div>
              ))}
            </div>

            {/* Estrato */}
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">Estrato</p>
              {Object.entries(estratoStats).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs mb-1">
                  <span>{k}</span>
                  <span className="font-bold">{pct(v)}%</span>
                </div>
              ))}
            </div>

            {/* Zona */}
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">Zona Residencia</p>
              {Object.entries(zonaStats).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs mb-1">
                  <span>{k}</span>
                  <span className="font-bold">{pct(v)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Cargo */}
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-500 mb-2">Cargo/Puesto (Top 5)</p>
            {topCargos.map(([cargo, count]) => (
              <div key={cargo} className="flex justify-between text-xs mb-1">
                <span className="truncate">{cargo}</span>
                <span className="font-bold">{pct(count)}%</span>
              </div>
            ))}
          </div>

          {/* Tipo contrato y Turno */}
          <div className="grid grid-cols-2 gap-4 mt-4">
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">Tipo Contrato</p>
              {Object.entries(contratoStats).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs mb-1">
                  <span>{k}</span>
                  <span className="font-bold">{pct(v)}%</span>
                </div>
              ))}
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">Turno</p>
              {Object.entries(turnoStats).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs mb-1">
                  <span>{k}</span>
                  <span className="font-bold">{pct(v)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Tipo examen */}
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-500 mb-2">Tipo Examen</p>
            {Object.entries(tipoExamStats).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs mb-1">
                <span>{k}</span>
                <span className="font-bold">{pct(v)}%</span>
              </div>
            ))}
          </div>
        </div>

        {/* 2. PERFIL CLÍNICO */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-black text-sm text-gray-800 mb-4 border-b pb-2">2. Perfil Clínico y de Salud</h3>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {/* IMC */}
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">IMC</p>
              {Object.entries(stats.byIMC).filter(([,v]) => v > 0).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs mb-1">
                  <span>{k}</span>
                  <span className="font-bold">{pct(v)}%</span>
                </div>
              ))}
            </div>

            {/* Tensión Arterial */}
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">Tensión Arterial</p>
              {Object.entries(stats.byTension).filter(([,v]) => v > 0).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs mb-1">
                  <span>{k}</span>
                  <span className="font-bold">{pct(v)}%</span>
                </div>
              ))}
            </div>

            {/* Concepto Aptitud */}
            <div>
              <p className="text-xs font-bold text-gray-500 mb-2">Concepto Aptitud</p>
              {Object.entries(stats.byConcepto).slice(0, 5).map(([k, v]) => (
                <div key={k} className="flex justify-between text-xs mb-1">
                  <span className="truncate">{k.substring(0, 30)}</span>
                  <span className="font-bold">{pct(v)}%</span>
                </div>
              ))}
            </div>
          </div>

          {/* Diagnóstico CIE-10 */}
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-500 mb-2">Diagnóstico CIE-10</p>
            {stats.topDiag.slice(0, 5).map(([diag, count]) => (
              <div key={diag} className="flex justify-between text-xs mb-1">
                <span className="truncate">{diag}</span>
                <span className="font-bold">{pct(count)}%</span>
              </div>
            ))}
          </div>

          {/* Hallazgos Físicos Anormales */}
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-500 mb-2">Hallazgos Físicos Anormales</p>
            {Object.entries(hallazgosFisicos).filter(([,v]) => v > 0).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs mb-1">
                <span className="capitalize">{k.toLowerCase()}</span>
                <span className="font-bold">{v} ({pct(v)}%)</span>
              </div>
            ))}
            {Object.values(hallazgosFisicos).every(v => v === 0) && (
              <p className="text-xs text-gray-400">Sin hallazgos anormales</p>
            )}
          </div>

          {/* Riesgos Laborales Expuestos */}
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-500 mb-2">Riesgos Laborales Expuestos</p>
            {Object.entries(riesgosExpuestos).filter(([,v]) => v > 0).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs mb-1">
                <span>{k}</span>
                <span className="font-bold">{((v / total) * 100).toFixed(1)}%</span>
              </div>
            ))}
          </div>

          {/* Estilos de Vida */}
          <div className="mt-4">
            <p className="text-xs font-bold text-gray-500 mb-2">Estilos de Vida y Hábitos</p>
            {Object.entries(estilosVida).filter(([,v]) => v > 0).map(([k, v]) => (
              <div key={k} className="flex justify-between text-xs mb-1">
                <span>{k}</span>
                <span className="font-bold">{((v / total) * 100).toFixed(1)}%</span>
              </div>
            ))}
            {Object.values(estilosVida).every(v => v === 0) && (
              <p className="text-xs text-gray-400">Sin datos registrados</p>
            )}
          </div>
        </div>

        {/* Recomendaciones */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-black text-sm text-gray-800 mb-4">💡 Recomendaciones</h3>
          <ul className="space-y-2 text-sm text-gray-700">
            {recomendaciones.map((r, i) => (
              <li key={i} className="bg-emerald-50 p-2 rounded">{r}</li>
            ))}
          </ul>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: ENVÍO INTEGRAL A EMPRESAS
  // ═══════════════════════════════════════════════════════════════════════
  const renderEnvioIntegral = () => {
    const empresa = companies.find(c => c.id === selectedCompanyReport);
    const totalPacientes = filteredPatients.length;
    
    return (
      <div className="space-y-6">
        <div className="bg-gradient-to-r from-green-500 to-emerald-500 rounded-xl p-4 text-white">
          <p className="font-black flex items-center gap-2">
            <Send className="w-4 h-4" /> Envío Integral a Empresa
          </p>
          <p className="text-xs text-green-100 mt-1">
            Genera y envía todos los documentos a la empresa
          </p>
        </div>

        {!selectedCompanyReport ? (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-6 text-center">
            <AlertTriangle className="w-10 h-10 text-amber-500 mx-auto mb-3" />
            <p className="font-bold text-amber-800">Selecciona una empresa</p>
            <p className="text-xs text-amber-600 mt-1">Elige una empresa del filtro para continuar</p>
          </div>
        ) : (
          <>
            {/* Checklist de completitud */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-black text-sm text-gray-800 mb-4">✅ Checklist de Documentos</h3>
              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked className="w-5 h-5 text-emerald-600 rounded" readOnly />
                  <span className="text-sm text-gray-700">Informe Epidemiológico</span>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked={totalPacientes > 0} className="w-5 h-5 text-emerald-600 rounded" readOnly />
                  <span className="text-sm text-gray-700">Certificados ({totalPacientes} exámenes)</span>
                </div>
                <div className="flex items-center gap-3">
                  <input type="checkbox" checked className="w-5 h-5 text-emerald-600 rounded" readOnly />
                  <span className="text-sm text-gray-700">Cuenta de Cobro</span>
                </div>
              </div>
            </div>

            {/* Datos de la empresa */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="font-black text-sm text-gray-800 mb-4">🏢 Datos de la Empresa</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-gray-500">Nombre:</p>
                  <p className="font-bold">{empresa?.nombre || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">NIT:</p>
                  <p className="font-bold">{empresa?.nit || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Email:</p>
                  <p className="font-bold">{empresa?.email || empresa?.emailContacto || '—'}</p>
                </div>
                <div>
                  <p className="text-gray-500">Total Pacientes:</p>
                  <p className="font-bold">{totalPacientes}</p>
                </div>
              </div>
            </div>

            {/* Botón de envío */}
            <button 
              onClick={() => showAlert?.('📧 Funcionalidad de envío por email - Configure servidor SMTP')}
              className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-green-600 text-white rounded-xl font-bold text-lg hover:bg-green-700 shadow-lg"
            >
              <Send className="w-5 h-5" /> Enviar Todo a la Empresa
            </button>
          </>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: HISTORIAL DE REPORTES GUARDADOS
  // ═══════════════════════════════════════════════════════════════════════
  const renderHistorial = () => {
    return (
      <div className="space-y-6">
        {/* Resumen */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <p className="font-black text-blue-800 flex items-center gap-2">
            <FileText className="w-4 h-4" /> Historial de Informes Guardados
          </p>
          <p className="text-xs text-blue-600 mt-1">
            Visualiza los informes epidemiológicos guardados anteriormente
          </p>
        </div>

        {/* Lista de reportes guardados */}
        {savedReports && savedReports.length > 0 ? (
          <div className="space-y-3">
            {savedReports.map((report, idx) => (
              <div key={idx} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-gray-800">{report.nombre || `Informe ${idx + 1}`}</p>
                    <p className="text-xs text-gray-500">
                      {report.empresaNombre || 'Empresa'} · {report.fecha || new Date().toLocaleDateString('es-CO')}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => showAlert?.('📋 Copiando contenido...')}
                      className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-200 flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Ver
                    </button>
                    <button 
                      onClick={() => showAlert?.('🗑️ Eliminado')}
                      className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200 flex items-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-10 text-center">
            <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-bold">No hay informes guardados</p>
            <p className="text-gray-400 text-xs mt-1">Genera un informe IA y guárdalo para verlo aquí</p>
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: TABLA TRABAJADORES CON RESTRICCIONES
  // ═══════════════════════════════════════════════════════════════════════
  const renderTablaWorkers = () => {
    // Pacientes con restricciones
    const pacientesConRestricciones = filteredPatients.filter(p => 
      p.restriccionesLaborales && p.restriccionesLaborales.length > 0
    );
    
    // Todos los pacientes para la tabla
    const todosPacientes = filteredPatients;
    
    return (
      <div className="space-y-6">
        {/* Resumen de restricciones */}
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-black text-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" /> Trabajadores con Restricciones Laborales
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Listado de trabajadores que requieren adaptaciones o restricciones en su labor
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-amber-600">{pacientesConRestricciones.length}</p>
              <p className="text-xs text-amber-500">de {todosPacientes.length} evaluados</p>
            </div>
          </div>
        </div>

        {/* Tabla completa de trabajadores */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-800 text-white">
                  <th className="p-3 text-left font-bold">#</th>
                  <th className="p-3 text-left font-bold">Trabajador</th>
                  <th className="p-3 text-left font-bold">Documento</th>
                  <th className="p-3 text-left font-bold">Cargo / Área</th>
                  <th className="p-3 text-left font-bold">Fecha Exam</th>
                  <th className="p-3 text-left font-bold">Dx Principal (CIE-10)</th>
                  <th className="p-3 text-left font-bold">Restricciones</th>
                  <th className="p-3 text-left font-bold">Base Normativa</th>
                  <th className="p-3 text-left font-bold">Concepto</th>
                </tr>
              </thead>
              <tbody>
                {todosPacientes.map((p, idx) => {
                  const restricciones = p.restriccionesLaborales || [];
                  const tieneRestricciones = restricciones.length > 0;
                  
                  return (
                    <tr key={p.id} className={`border-b hover:bg-gray-50 ${tieneRestricciones ? 'bg-amber-50' : ''}`}>
                      <td className="p-2 text-center font-bold text-gray-500">{idx + 1}</td>
                      <td className="p-2 font-bold text-gray-800">{p.nombres || '—'}</td>
                      <td className="p-2 text-gray-600">{p.docNumero || '—'}</td>
                      <td className="p-2">
                        <div className="text-gray-800 font-medium">{p.cargo || '—'}</div>
                        <div className="text-gray-400 text-[10px]">{p.area || '—'}</div>
                      </td>
                      <td className="p-2 text-gray-600">{p.fechaExamen || '—'}</td>
                      <td className="p-2">
                        <div className="text-gray-800 font-medium">{p.diagPrincipal || '—'}</div>
                        <div className="text-gray-400 text-[10px]">{p.cie10Principal || '—'}</div>
                      </td>
                      <td className="p-2">
                        {tieneRestricciones ? (
                          <div className="space-y-1">
                            {restricciones.map((r, i) => (
                              <div key={i} className="text-red-600 font-medium bg-red-50 px-2 py-1 rounded text-[10px]">
                                {r}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-emerald-600 font-medium">Sin restricciones</span>
                        )}
                      </td>
                      <td className="p-2">
                        {p.baseNormativa && p.baseNormativa.length > 0 ? (
                          <div className="space-y-1">
                            {p.baseNormativa.map((n, i) => (
                              <div key={i} className="text-blue-600 bg-blue-50 px-2 py-1 rounded text-[10px]">
                                {n}
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-gray-400 text-[10px]">—</span>
                        )}
                      </td>
                      <td className="p-2">
                        <span className={`px-2 py-1 text-[10px] font-bold rounded-md ${
                          (p.conceptoAptitud || '').toLowerCase().includes('apto')
                            ? 'bg-emerald-100 text-emerald-700'
                            : (p.conceptoAptitud || '').toLowerCase().includes('restric')
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-red-100 text-red-700'
                        }`}>
                          {p.conceptoAptitud || p.conceptoOcupacional || '—'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
                {todosPacientes.length === 0 && (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-gray-400">
                      No hay trabajadores para mostrar
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
        
        {todosPacientes.length > 0 && (
          <div className="flex justify-between items-center text-xs text-gray-500">
            <p>Total: {todosPacientes.length} trabajadores</p>
            <p>Con restricciones: {pacientesConRestricciones.length}</p>
          </div>
        )}
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: CERTIFICADOS — idéntico al monolito líneas 25289-25653
  // ═══════════════════════════════════════════════════════════════════════
  const renderCertificados = () => {
    const selectedList = filteredPatients.filter(p => certSelected?.[p.id]);
    const allIds = filteredPatients.map(p => p.id);
    const allChecked = allIds.length > 0 && allIds.every(id => certSelected?.[id]);
    const someChecked = allIds.some(id => certSelected?.[id]);

    return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl shadow-sm border border-blue-100 p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h3 className="font-black text-blue-900 text-base flex items-center gap-2">
              📄 Certificados de Aptitud - {compName}
            </h3>
            <p className="text-xs text-gray-400 mt-0.5">
              {filteredPatients.length} trabajador{filteredPatients.length !== 1 ? 'es' : ''} en el período
              {selectedList.length > 0 && (
                <span className="ml-2 font-black text-blue-700">
                  · {selectedList.length} seleccionado{selectedList.length !== 1 ? 's' : ''}
                </span>
              )}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {/* Seleccionar todos */}
            <button
              onClick={() => {
                const newSel = {};
                if (!allChecked) filteredPatients.forEach(p => { newSel[p.id] = true; });
                setCertSelected?.(newSel);
              }}
              className={`px-4 py-2 rounded-xl text-xs font-black border-2 transition flex items-center gap-1.5 ${
                allChecked
                  ? 'bg-blue-600 border-blue-600 text-white'
                  : 'bg-white border-blue-300 text-blue-700 hover:bg-blue-50'
              }`}
            >
              {allChecked ? '☑ Deseleccionar todos' : '☐ Seleccionar todos'}
            </button>
            {/* Imprimir seleccionados */}
            <button
              onClick={() => {
                if (selectedList.length === 0) { showAlert?.('Seleccione al menos un trabajador.'); return; }
                showAlert?.(`🖨️ Imprimiendo ${selectedList.length} certificado(s)...`);
              }}
              disabled={selectedList.length === 0}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 text-white text-xs font-black rounded-xl flex items-center gap-1.5 transition"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir ({selectedList.length})
            </button>
            {/* Email a empresa */}
            <button
              onClick={() => {
                if (selectedList.length === 0) { showAlert?.('Seleccione al menos un trabajador.'); return; }
                const empresa = companies.find(c => c.id === selectedCompanyReport);
                const emailEmp = empresa?.emailContacto || empresa?.email || '';
                const body = encodeURIComponent(
                  `Estimado equipo de ${compName},\n\nAdjunto encontrará los certificados de aptitud médica ocupacional de ${selectedList.length} trabajador(es) evaluado(s).\n\nTrabajadores:\n${selectedList.map((p, i) => `${i + 1}. ${p.nombres} - ${p.docTipo || 'CC'}: ${p.docNumero} - ${p.conceptoAptitud || 'Sin concepto'}`).join('\n')}\n\nCordialmente,\nSISO - Salud Ocupacional`
                );
                if (emailEmp) {
                  window.open(`mailto:${emailEmp}?subject=${encodeURIComponent('Certificados Médicos Ocupacionales - ' + compName)}&body=${body}`, '_blank');
                } else {
                  showAlert?.('⚠️ Esta empresa no tiene email registrado.');
                }
              }}
              disabled={selectedList.length === 0}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white text-xs font-black rounded-xl flex items-center gap-1.5"
            >
              🏢 Email Empresa
            </button>
            {/* Email individual */}
            <button
              onClick={() => {
                if (selectedList.length === 0) { showAlert?.('Seleccione al menos un trabajador.'); return; }
                const conEmail = selectedList.filter(p => p.email);
                const sinEmail = selectedList.filter(p => !p.email);
                if (conEmail.length === 0) { showAlert?.('Ningún trabajador seleccionado tiene email registrado.'); return; }
                // Abrir ventana con lista para envío individual
                const w = window.open('', '_blank', 'width=700,height=500');
                if (!w) { showAlert?.('Permita ventanas emergentes.'); return; }
                const rows = conEmail.map((p, i) => {
                  const subject = encodeURIComponent(`Certificado Médico Ocupacional - ${p.nombres}`);
                  const body = encodeURIComponent(`Estimado/a ${p.nombres},\n\nSu certificado de aptitud médica ocupacional ha sido emitido.\n\nConcepto: ${p.conceptoAptitud || 'Sin concepto'}\nFecha: ${p.fechaExamen || 'N/A'}\n\nCordialmente,\nSISO - Salud Ocupacional`);
                  return `<tr><td style="padding:4px 8px">${i + 1}</td><td style="padding:4px 8px;font-weight:bold">${p.nombres || ''}</td><td style="padding:4px 8px">${p.email}</td><td style="padding:4px 8px"><a href="mailto:${p.email}?subject=${subject}&body=${body}" style="background:#3b82f6;color:white;padding:4px 12px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:11px">📧 Enviar</a></td></tr>`;
                }).join('');
                w.document.write(`<!DOCTYPE html><html><head><title>Envío Individual</title><style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse}th{background:#1e40af;color:white;padding:8px;text-align:left}td{border-bottom:1px solid #eee}h2{color:#1e40af}</style></head><body><h2>📧 Enviar Certificados Individual</h2><p>${conEmail.length} con email · ${sinEmail.length > 0 ? `<span style="color:red">${sinEmail.length} sin email</span>` : '✅ Todos con email'}</p><table><thead><tr><th>#</th><th>Nombre</th><th>Email</th><th>Acción</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
                w.document.close();
              }}
              disabled={selectedList.length === 0}
              className="px-3 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white text-xs font-black rounded-xl flex items-center gap-1.5"
            >
              📧 Individual ({selectedList.filter(p => p.email).length}/{selectedList.length})
            </button>
            {/* WhatsApp */}
            <button
              onClick={() => {
                if (selectedList.length === 0) { showAlert?.('Seleccione al menos un trabajador.'); return; }
                const conTel = selectedList.filter(p => (p.celular || p.telefono || '').replace(/\D/g, '').length >= 10);
                const sinTel = selectedList.filter(p => (p.celular || p.telefono || '').replace(/\D/g, '').length < 10);
                if (conTel.length === 0) { showAlert?.('Ninguno tiene celular registrado.'); return; }
                const w = window.open('', '_blank', 'width=700,height=500');
                if (!w) { showAlert?.('Permita ventanas emergentes.'); return; }
                const rows = conTel.map((p, i) => {
                  const tel = (p.celular || p.telefono || '').replace(/\D/g, '');
                  const telFull = tel.startsWith('57') ? tel : '57' + tel;
                  const msg = encodeURIComponent(`Estimado/a ${p.nombres || ''}, su certificado de aptitud médica ocupacional está listo. Concepto: ${p.conceptoAptitud || 'Sin concepto'}. Documento: ${p.docNumero || ''}. SISO Salud Ocupacional`);
                  return `<tr><td style="padding:4px 8px">${i + 1}</td><td style="padding:4px 8px;font-weight:bold">${p.nombres || ''}</td><td style="padding:4px 8px">${p.celular || p.telefono || ''}</td><td style="padding:4px 8px"><a href="https://wa.me/${telFull}?text=${msg}" target="_blank" style="background:#25d366;color:white;padding:4px 12px;border-radius:6px;text-decoration:none;font-weight:bold;font-size:11px">📱 Enviar</a></td></tr>`;
                }).join('');
                w.document.write(`<!DOCTYPE html><html><head><title>WhatsApp</title><style>body{font-family:Arial;padding:20px}table{width:100%;border-collapse:collapse}th{background:#075e54;color:white;padding:8px;text-align:left}td{border-bottom:1px solid #eee}h2{color:#075e54}</style></head><body><h2>📱 Enviar por WhatsApp</h2><p>${conTel.length} con celular · ${sinTel.length > 0 ? `<span style="color:red">${sinTel.length} sin celular</span>` : '✅ Todos con celular'}</p><table><thead><tr><th>#</th><th>Nombre</th><th>Celular</th><th>Acción</th></tr></thead><tbody>${rows}</tbody></table></body></html>`);
                w.document.close();
              }}
              disabled={selectedList.length === 0}
              className="px-3 py-2 bg-green-600 hover:bg-green-700 disabled:opacity-40 text-white text-xs font-black rounded-xl flex items-center gap-1.5"
            >
              📱 WhatsApp ({selectedList.filter(p => (p.celular || p.telefono || '').replace(/\D/g, '').length >= 10).length})
            </button>
          </div>
        </div>
      </div>

      {filteredPatients.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <p className="text-sm">No hay trabajadores en el período seleccionado.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-200 flex items-center gap-3">
            <input
              type="checkbox"
              checked={allChecked}
              ref={el => { if (el) el.indeterminate = someChecked && !allChecked; }}
              onChange={() => {
                const n = {};
                if (!allChecked) filteredPatients.forEach(p => { n[p.id] = true; });
                setCertSelected?.(n);
              }}
              className="w-4 h-4 accent-blue-600 cursor-pointer"
            />
            <span className="text-[10px] font-black text-gray-500 uppercase tracking-wide">Seleccionar todo</span>
            <span className="ml-auto text-[10px] text-gray-400">{filteredPatients.length} certificados disponibles</span>
          </div>
          <div className="divide-y divide-gray-100">
            {filteredPatients.map((p, idx) => {
              const isChecked = !!certSelected?.[p.id];
              const conceptoLower = (p.conceptoAptitud || '').toLowerCase();
              const esApto = conceptoLower.includes('apto') && !conceptoLower.includes('no apto');
              const esNoApto = conceptoLower.includes('no apto');
              return (
                <div key={p.id || idx}
                  className={`flex items-center gap-3 px-4 py-3 transition ${isChecked ? 'bg-blue-50' : 'hover:bg-gray-50'}`}
                >
                  <input type="checkbox" checked={isChecked}
                    onChange={() => setCertSelected?.(prev => ({ ...prev, [p.id]: !prev?.[p.id] }))}
                    className="w-4 h-4 accent-blue-600 shrink-0 cursor-pointer"
                  />
                  <div className="w-7 h-7 rounded-full bg-gray-200 text-gray-600 font-black text-[10px] flex items-center justify-center shrink-0">
                    {String(idx + 1).padStart(2, '0')}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-gray-900 text-sm truncate">{p.nombres || '--'}</p>
                    <p className="text-[10px] text-gray-500">
                      {p.docTipo || 'CC'}: {p.docNumero || '--'} &nbsp;·&nbsp; {p.cargo || '--'} &nbsp;·&nbsp; {p.tipoExamen || '--'}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-black ${
                      esApto ? 'bg-emerald-100 text-emerald-700'
                        : esNoApto ? 'bg-red-100 text-red-700'
                        : 'bg-gray-100 text-gray-500'
                    }`}>
                      {p.conceptoAptitud ? p.conceptoAptitud.split(' ').slice(0, 3).join(' ') : 'Sin concepto'}
                    </span>
                    <p className="text-[9px] text-gray-400 mt-0.5">{p.fechaExamen || '--'}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: MÓDULO FINANCIERO
  // ═══════════════════════════════════════════════════════════════════════
  const renderFinanciero = () => {
    const totalPacientes = filteredPatients.length;
    const precioUnitario = precioPorPaciente || 35000;
    const totalAPagar = totalPacientes * precioUnitario;
    
    // Generar cuenta de cobro
    const generarCuentaCobro = () => {
      const empresa = companies.find(c => c.id === selectedCompanyReport);
      const cuenta = {
        numero: `CC-${Date.now()}`,
        fecha: new Date().toISOString().split('T')[0],
        empresa: empresa?.nombre || 'Varias empresas',
        nit: empresa?.nit || 'N/A',
        cantidad: totalPacientes,
        precioUnitario: precioUnitario,
        total: totalAPagar,
        concepto: 'Servicios de Medicina Ocupacional - Exámenes Ocupacionales',
        periodo: `${reportStartDate || '...'} a ${reportEndDate || '...'}`,
      };
      return cuenta;
    };

    const cuenta = generarCuentaCobro();

    return (
      <div className="space-y-6">
        {/* Resumen financiero */}
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="font-black text-orange-800 flex items-center gap-2">
            <DollarSign className="w-4 h-4" /> Módulo Financiero - Cuenta de Cobro
          </p>
          <p className="text-xs text-orange-600 mt-1">
            Cálculo automático basado en pacientes evaluados en el período seleccionado
          </p>
        </div>

        {/* Cards de cálculo */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5 text-center">
            <Users className="w-8 h-8 text-blue-600 mx-auto mb-2" />
            <p className="text-3xl font-black text-gray-800">{totalPacientes}</p>
            <p className="text-xs font-bold text-gray-500">Pacientes Evaluados</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5 text-center">
            <FileText className="w-8 h-8 text-emerald-600 mx-auto mb-2" />
            <p className="text-3xl font-black text-gray-800">${precioUnitario.toLocaleString('es-CO')}</p>
            <p className="text-xs font-bold text-gray-500">Precio por Paciente</p>
          </div>
          <div className="bg-white border border-orange-200 rounded-xl p-5 text-center">
            <DollarSign className="w-8 h-8 text-orange-600 mx-auto mb-2" />
            <p className="text-3xl font-black text-orange-600">${totalAPagar.toLocaleString('es-CO')}</p>
            <p className="text-xs font-bold text-orange-500">Total a Cobrar</p>
          </div>
        </div>

        {/* Precio por paciente - editable */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <label className="text-sm font-bold text-gray-700 block mb-2">
            💰 Precio por paciente ($):
          </label>
          <input 
            type="number" 
            value={precioPorPaciente || 35000}
            onChange={e => setPrecioPorPaciente?.(parseInt(e.target.value) || 0)}
            className="w-full p-3 border border-gray-200 rounded-lg text-sm font-bold"
            placeholder="35000"
          />
          <p className="text-xs text-gray-400 mt-2">
            Valor por defecto: $35,000 por examen ocupacional
          </p>
        </div>

        {/* Vista previa de cuenta de cobro */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-black text-sm text-gray-800 mb-4 flex items-center gap-2">
            <FileText className="w-4 h-4 text-gray-600" /> Vista Previa - Cuenta de Cobro
          </h3>
          
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-6 font-mono text-xs">
            <div className="border-b border-gray-300 pb-2 mb-2">
              <p className="font-black text-lg">CUENTA DE COBRO</p>
              <p className="text-gray-500">No. {cuenta.numero}</p>
            </div>
            
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Fecha:</span>
                <span className="font-bold">{cuenta.fecha}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Empresa:</span>
                <span className="font-bold">{cuenta.empresa}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">NIT:</span>
                <span className="font-bold">{cuenta.nit}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Período:</span>
                <span className="font-bold">{cuenta.periodo}</span>
              </div>
              <div className="border-t border-gray-300 pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">Cantidad de exámenes:</span>
                  <span className="font-bold">{cuenta.cantidad}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Valor unitario:</span>
                  <span className="font-bold">${cuenta.precioUnitario.toLocaleString('es-CO')}</span>
                </div>
                <div className="flex justify-between border-t border-gray-300 pt-2 mt-2">
                  <span className="font-black text-gray-800">TOTAL A COBRAR:</span>
                  <span className="font-black text-orange-600 text-lg">${cuenta.total.toLocaleString('es-CO')}</span>
                </div>
              </div>
              <div className="border-t border-gray-300 pt-2 mt-2">
                <p className="text-gray-600">Concepto:</p>
                <p className="font-bold">{cuenta.concepto}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 mt-4">
            <button 
              onClick={() => {
                const contenido = `
CUENTA DE COBRO No. ${cuenta.numero}
Fecha: ${cuenta.fecha}

Empresa: ${cuenta.empresa}
NIT: ${cuenta.nit}
Período: ${cuenta.periodo}

Cantidad de exámenes: ${cuenta.cantidad}
Valor unitario: $${cuenta.precioUnitario.toLocaleString('es-CO')}

TOTAL A COBRAR: $${cuenta.total.toLocaleString('es-CO')}

Concepto: ${cuenta.concepto}
                `.trim();
                const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `cuenta_cobro_${cuenta.numero}.txt`;
                a.click();
                URL.revokeObjectURL(url);
                showAlert?.('✅ Cuenta de cobro exportada.');
              }}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-100 text-blue-700 rounded-xl font-bold text-sm hover:bg-blue-200"
            >
              <Download className="w-4 h-4" /> Descargar Cuenta de Cobro
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════
  // SECRETARY GATE — idéntico al monolito líneas 23773-23807
  // ═══════════════════════════════════════════════════════════════════════
  const _canAccessReport = () => {
    if (currentUser?.role !== 'secretaria') return true;
    const secUser = usersList?.find(u => u.user === currentUser.user);
    return !!(secUser?.permisos?.reporte);
  };
  if (currentUser?.role === 'secretaria' && !_canAccessReport()) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-8 space-y-3">
          <div className="text-5xl">🔐</div>
          <p className="font-black text-amber-800 text-xl">Módulo restringido</p>
          <p className="text-amber-700 text-sm font-bold">Reportes Epidemiológicos</p>
          <p className="text-amber-600 text-xs leading-relaxed">
            Este módulo requiere autorización explícita del administrador.<br />
            Solicita que habilite el permiso <strong>"Reportes Epidemiológicos"</strong> en tu perfil.<br />
            (Usuarios → tu nombre → 🔐 Permisos de secretaria)
          </p>
        </div>
      </div>
    );
  }

  // ── IPS: auto-select empresa — monolito línea 23808-23812 ──────────────
  if (currentUser?.empresaId && !selectedCompanyReport) {
    setTimeout(() => setSelectedCompanyReport?.(currentUser.empresaId), 0);
  }
  // ── Secretaria: sólo médicos asignados ─────────────────────────────────
  const _secMedVisibles = (() => {
    if (currentUser?.role !== 'secretaria') return null;
    const secU = usersList?.find(u => u.user === currentUser.user);
    const asig = secU?.medicosAsignados || [];
    return asig.length > 0 ? asig : null;
  })();

  // ── compName helper ─────────────────────────────────────────────────────
  const compName = selectedCompanyReport
    ? (companies.find(c => c.id === selectedCompanyReport)?.nombre || 'Empresa')
    : 'Todas las empresas';

  // ═══════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
        <h2 className="text-xl font-black flex items-center gap-2">
          <BarChart3 className="w-6 h-6" /> Reportes y Estadísticas
        </h2>
        <p className="text-indigo-100 text-sm mt-1">
          {stats.total} pacientes evaluados · {companies.length} empresas
        </p>
      </div>

      {/* Filters — idéntico al monolito líneas 23981-24132 */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="text-xs font-bold text-gray-600 block mb-1">
              <Building2 className="w-3 h-3 inline mr-1" /> Empresa
            </label>
            <select value={selectedCompanyReport || ''}
              onChange={e => { setSelectedCompanyReport?.(e.target.value); setReportAIResult?.(null); }}
              className="w-full p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
              <option value="">Seleccione empresa...</option>
              {(currentUser?.empresaId
                ? companies.filter(c => c.id === currentUser.empresaId)
                : companies
              ).map(c => (
                <option key={c.id || c.nit} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          {/* Filtro médico — igual al monolito */}
          {(currentUser?.role === 'secretaria' || currentUser?.role === 'admin' || currentUser?.role === 'superadmin') && (
            <div className="min-w-[160px]">
              <label className="text-xs font-bold text-gray-600 block mb-1">👨‍⚕️ Médico</label>
              <select
                className="border-2 border-indigo-200 rounded-lg p-2 text-sm bg-indigo-50 text-indigo-800 font-bold w-full"
                value={selectedMedicoReport || ''}
                onChange={e => { setSelectedMedicoReport?.(e.target.value); setReportAIResult?.(null); }}
              >
                <option value="">Todos los médicos</option>
                {usersList.filter(u => u.role === 'medico' || u.role === 'admin')
                  .filter(u => _secMedVisibles ? _secMedVisibles.includes(u.user) : true)
                  .map(u => (
                    <option key={u.user} value={u.user}>{u.nombre || u.user}</option>
                  ))}
              </select>
            </div>
          )}
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">
              <Calendar className="w-3 h-3 inline mr-1" /> Desde
            </label>
            <input type="date" value={reportStartDate || ''}
              onChange={e => setReportStartDate?.(e.target.value)}
              className="p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Hasta</label>
            <input type="date" value={reportEndDate || ''}
              onChange={e => setReportEndDate?.(e.target.value)}
              className="p-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
          </div>
          {/* Botones de acción globales */}
          <div className="flex flex-wrap gap-2 items-end">
            {/* Imprimir Informe Completo */}
            <button
              onClick={() => {
                if (!selectedCompanyReport) { showAlert?.('Seleccione una empresa primero.'); return; }
                const empresa = companies.find(c => c.id === selectedCompanyReport);
                const w = window.open('', '_blank');
                if (!w) { showAlert?.('Permita las ventanas emergentes.'); return; }
                const totalP = filteredPatients.length;
                const aiHtml = reportAIResult && typeof reportAIResult === 'object'
                  ? `<div style="margin-top:16px"><b style="font-size:12px;color:#1e40af">ANÁLISIS IA:</b><p style="font-size:10px;color:#374151;white-space:pre-wrap">${reportAIResult.resumenEjecutivo || ''}\n${reportAIResult.conclusiones || ''}</p></div>`
                  : '';
                w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Informe Epidemiológico - ${empresa?.nombre || ''}</title><style>
body{font-family:Arial,sans-serif;font-size:10px;margin:20px;color:#1e293b}
h1{font-size:16px;color:#1e293b;margin:0 0 4px}h2{font-size:12px;color:#374151;margin:12px 0 4px;border-bottom:1px solid #e5e7eb;padding-bottom:2px}
.header{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #059669;padding-bottom:10px;margin-bottom:12px}
.badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:9px;font-weight:700}
.apto{background:#d1fae5;color:#065f46}.noapto{background:#fee2e2;color:#991b1b}
table{width:100%;border-collapse:collapse;font-size:9px;margin-bottom:12px}
th{background:#1e293b;color:white;padding:5px 6px;text-align:left}td{padding:4px 6px;border-bottom:1px solid #e5e7eb}tr:nth-child(even){background:#f8fafc}
.stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px}
.stat-card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:6px;padding:8px}
.stat-val{font-size:22px;font-weight:900;color:#1e293b}.stat-lbl{font-size:9px;color:#64748b}
.footer{margin-top:16px;font-size:8px;color:#94a3b8;text-align:center;border-top:1px solid #e5e7eb;padding-top:8px}
.warn{background:#fffbeb;border:1px solid #fcd34d;border-radius:6px;padding:6px 10px;font-size:9px;color:#92400e;margin-bottom:12px}
@media print{body{margin:0}button{display:none}}</style></head><body>
<div class="header"><div>
<h1>INFORME EPIDEMIOLÓGICO OCUPACIONAL</h1>
<div style="font-size:9px;color:#64748b"><b>Empresa:</b> ${empresa?.nombre || ''} &nbsp;·&nbsp; <b>NIT:</b> ${empresa?.nit || 'N/A'}${empresa?.dv ? '-' + empresa.dv : ''}
<br/><b>Total evaluados:</b> ${totalP} &nbsp;·&nbsp; <b>Fecha:</b> ${new Date().toLocaleDateString('es-CO')}
${reportStartDate || reportEndDate ? '<br/><b>Período:</b> ' + (reportStartDate || '...') + ' al ' + (reportEndDate || '...') : ''}</div>
</div></div>
<div class="warn">⚠ Confidencial — Res.1843/2025 Art.19 - Información Reservada</div>
<div class="stat-grid">
<div class="stat-card"><div class="stat-val">${totalP}</div><div class="stat-lbl">Total Evaluados</div></div>
<div class="stat-card"><div class="stat-val">${filteredPatients.filter(p => (p.conceptoAptitud || '').toLowerCase().includes('no apto')).length}</div><div class="stat-lbl">No Aptos</div></div>
<div class="stat-card"><div class="stat-val">${stats.tasaNoAptos || 0}%</div><div class="stat-lbl">Tasa No Aptos</div></div>
</div>
${aiHtml}
<div class="footer">SISO · Generado: ${new Date().toLocaleString('es-CO')} · Confidencial - Res.1843/2025</div>
<br/><button onclick="window.print()" style="background:#1e293b;color:white;padding:6px 16px;border:none;border-radius:6px;cursor:pointer;font-size:11px">🖨️ Imprimir / Guardar PDF</button>
</body></html>`);
                w.document.close();
              }}
              className="flex items-center gap-1 px-3 py-2 bg-slate-700 text-white rounded-lg text-xs font-bold hover:bg-slate-800"
            >
              <Printer className="w-3.5 h-3.5" /> Imprimir Informe
            </button>
            {/* Guardar Informe */}
            <button
              onClick={() => {
                if (!selectedCompanyReport) { showAlert?.('Seleccione una empresa.'); return; }
                const savedKey = `siso_informes_${currentUser?.user || 'shared'}`;
                const saved = JSON.parse(localStorage.getItem(savedKey) || '[]');
                saved.unshift({
                  id: Date.now().toString(),
                  fecha: new Date().toISOString().split('T')[0],
                  empresaNombre: compName,
                  empresaId: selectedCompanyReport,
                  total: filteredPatients.length,
                  resultado: reportAIResult,
                  stats,
                });
                localStorage.setItem(savedKey, JSON.stringify(saved.slice(0, 50)));
                showAlert?.('✅ Informe guardado correctamente.');
              }}
              className="flex items-center gap-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-xs font-bold hover:bg-emerald-700"
            >
              <Save className="w-3.5 h-3.5" /> Guardar Informe
            </button>
            {/* Enviar TODO a Empresa */}
            <button
              onClick={() => {
                if (!selectedCompanyReport) { showAlert?.('Seleccione una empresa.'); return; }
                const empresa = companies.find(c => c.id === selectedCompanyReport);
                const emailEmp = empresa?.emailContacto || empresa?.email || '';
                const resumen = `RESUMEN EPIDEMIOLÓGICO\nEmpresa: ${compName}\nTotal evaluados: ${filteredPatients.length}\nFecha: ${new Date().toLocaleDateString('es-CO')}\nTasa no aptos: ${stats.tasaNoAptos || 0}%\n\nGenerado por SISO - Sistema de Información de Salud Ocupacional`;
                if (emailEmp) {
                  window.open(`mailto:${emailEmp}?subject=${encodeURIComponent('Informe Epidemiológico - ' + compName)}&body=${encodeURIComponent(resumen)}`, '_blank');
                } else {
                  showAlert?.('⚠️ Esta empresa no tiene email registrado. Agrégalo en el módulo de Empresas.');
                }
              }}
              className="flex items-center gap-1 px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700"
            >
              <Send className="w-3.5 h-3.5" /> Enviar TODO a Empresa
            </button>
            {/* Exportaciones */}
            <button onClick={handleExportCSV}
              className="flex items-center gap-1 px-3 py-2 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-200">
              <HardDrive className="w-3 h-3" /> CSV
            </button>
            <button onClick={handleExportRIPS}
              className="flex items-center gap-1 px-3 py-2 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200">
              <FileText className="w-3 h-3" /> RIPS
            </button>
            <button onClick={handleExportFHIR}
              className="flex items-center gap-1 px-3 py-2 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-200">
              <FileText className="w-3 h-3" /> FHIR R4
            </button>
          </div>
        </div>
        <p className="text-[10px] text-gray-400 mt-2 text-right italic">⚠ Res.1843/2025 Art.19 - Confidencial</p>
      </div>

      {/* Tab bar */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'resumen', label: 'Resumen', icon: ClipboardList },
          { id: 'estadisticas', label: 'Estadísticas', icon: BarChart3 },
          { id: 'trabajadores', label: 'Trabajadores', icon: Users },
          { id: 'sve', label: 'Indicadores SVE', icon: Shield },
          { id: 'ia', label: 'Informe IA', icon: Brain },
          { id: 'certificados', label: 'Certificados', icon: FileCheck },
          { id: 'financiero', label: 'Financiero', icon: DollarSign },
          { id: 'envio', label: 'Envío', icon: Send },
          { id: 'historial', label: 'Historial', icon: FileText },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition ${
              activeTab === tab.id
                ? 'bg-indigo-600 text-white shadow'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'resumen' && renderResumenEjecutivo()}
      {activeTab === 'estadisticas' && renderEstadisticas()}
      {activeTab === 'trabajadores' && renderTablaWorkers()}
      {activeTab === 'sve' && (
        <SVEPrograms
          patients={patientsList}
          companies={companies}
          aiConfig={aiConfig}
          callAI={callAI}
          showAlert={showAlert}
          usersList={usersList}
        />
      )}
      {activeTab === 'ia' && renderAIReport()}
      {activeTab === 'certificados' && renderCertificados()}
      {activeTab === 'financiero' && renderFinanciero()}
      {activeTab === 'envio' && renderEnvioIntegral()}
      {activeTab === 'historial' && renderHistorial()}
    </div>
  );
}
