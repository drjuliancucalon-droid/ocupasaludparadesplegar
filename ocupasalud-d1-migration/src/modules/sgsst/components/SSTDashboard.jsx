/**
 * SSTDashboard.jsx
 * Dashboard principal del Sistema de Gestión de Seguridad y Salud en el Trabajo
 * Decreto 1072 de 2015, Resolución 0312 de 2019
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  BarChart3, Shield, AlertTriangle, Users, FileText, ClipboardCheck,
  TrendingUp, Calendar, ChevronRight, Activity, Target, Bell,
  Settings, RefreshCw, Award, Zap, BookOpen, Search, HardHat,
  Building2, CheckCircle2, XCircle, Clock, ArrowUpRight, ArrowDownRight,
  AlertCircle, Info
} from 'lucide-react';
import {
  calcularCumplimiento,
  calcularIndicadores,
  riesgosCRUD,
  capacitacionesCRUD,
  accidentesCRUD,
  inspeccionesCRUD,
  documentosCRUD,
  actividadesCRUD,
  getCompanyConfig,
  setCompanyConfig,
  determinarTipoEmpresa,
  ESTANDARES_MINIMOS,
  toggleCumplimientoEstandar,
} from '../services/sgsstService';

const SSTDashboard = ({ onNavigate }) => {
  const [companyConfig, setCompanyConfigState] = useState(getCompanyConfig());
  const [cumplimiento, setCumplimiento] = useState(null);
  const [estadisticas, setEstadisticas] = useState(null);
  const [indicadores, setIndicadores] = useState(null);
  const [alertas, setAlertas] = useState([]);
  const [showConfig, setShowConfig] = useState(false);
  const [configForm, setConfigForm] = useState(companyConfig);
  const [showEstandares, setShowEstandares] = useState(false);

  const cargarDatos = useCallback(() => {
    const config = getCompanyConfig();
    setCompanyConfigState(config);

    const cumpl = calcularCumplimiento(config.tipoEmpresa);
    setCumplimiento(cumpl);

    const riesgos = riesgosCRUD.getAll();
    const capacitaciones = capacitacionesCRUD.getAll();
    const accidentes = accidentesCRUD.getAll();
    const inspecciones = inspeccionesCRUD.getAll();
    const documentos = documentosCRUD.getAll();
    const actividades = actividadesCRUD.getAll();

    const indicadoresCalc = calcularIndicadores(accidentes, config.numTrabajadores || 1, null);
    setIndicadores(indicadoresCalc);

    const hoy = new Date();
    const riesgosAltos = riesgos.filter(r => r.nivelRiesgo === 'I' || r.nivelRiesgo === 'II');
    const capCompletadas = capacitaciones.filter(c => c.estado === 'Completado');
    const accionesAbiertas = actividades.filter(a => a.estado !== 'Completado');
    const inspeccionesPendientes = inspecciones.filter(i => i.estado !== 'Completado');
    const docsVigentes = documentos.filter(d => d.estado === 'Vigente' || d.estado === 'Aprobado');

    setEstadisticas({
      totalRiesgos: riesgos.length,
      riesgosAltos: riesgosAltos.length,
      riesgosMedios: riesgos.filter(r => r.nivelRiesgo === 'III').length,
      riesgosBajos: riesgos.filter(r => r.nivelRiesgo === 'IV').length,
      accionesAbiertas: accionesAbiertas.length,
      totalCapacitaciones: capacitaciones.length,
      capCompletadas: capCompletadas.length,
      tasaCapacitacion: capacitaciones.length > 0 ? Math.round((capCompletadas.length / capacitaciones.length) * 100) : 0,
      totalAccidentes: accidentes.length,
      accidentesAnio: accidentes.filter(a => new Date(a.fecha).getFullYear() === hoy.getFullYear()).length,
      inspeccionesPendientes: inspeccionesPendientes.length,
      totalInspecciones: inspecciones.length,
      documentosCompletos: docsVigentes.length,
    });

    // Calcular alertas
    const nuevasAlertas = [];
    actividades.forEach(act => {
      if (act.fechaLimite && new Date(act.fechaLimite) < hoy && act.estado !== 'Completado') {
        nuevasAlertas.push({ tipo: 'vencido', mensaje: `Actividad vencida: ${act.nombre || act.descripcion}`, fecha: act.fechaLimite, prioridad: 'alta', icono: 'alert' });
      }
    });
    inspecciones.forEach(insp => {
      if (insp.proximaFecha && new Date(insp.proximaFecha) < hoy && insp.estado !== 'Completado') {
        nuevasAlertas.push({ tipo: 'vencido', mensaje: `Inspección vencida: ${insp.nombre || insp.area}`, fecha: insp.proximaFecha, prioridad: 'alta', icono: 'clipboard' });
      }
    });
    const en15dias = new Date(hoy.getTime() + 15 * 24 * 60 * 60 * 1000);
    capacitaciones.forEach(cap => {
      if (cap.fecha && new Date(cap.fecha) >= hoy && new Date(cap.fecha) <= en15dias && cap.estado !== 'Completado') {
        nuevasAlertas.push({ tipo: 'proximo', mensaje: `Capacitación próxima: ${cap.nombre || cap.tema}`, fecha: cap.fecha, prioridad: 'media', icono: 'book' });
      }
    });
    if (riesgosAltos.length > 0) {
      nuevasAlertas.push({ tipo: 'riesgo', mensaje: `${riesgosAltos.length} riesgo(s) en nivel No Aceptable requieren intervención`, prioridad: 'alta', icono: 'alert' });
    }
    if (cumpl.porcentaje < 60) {
      nuevasAlertas.push({ tipo: 'cumplimiento', mensaje: `Cumplimiento SG-SST en nivel Crítico (${cumpl.porcentaje}%). Se requiere plan de mejoramiento inmediato.`, prioridad: 'alta', icono: 'target' });
    }
    setAlertas(nuevasAlertas.sort((a, b) => (a.prioridad === 'alta' ? -1 : 1)));
  }, []);

  useEffect(() => { cargarDatos(); }, [cargarDatos]);

  const guardarConfig = () => {
    const tipo = determinarTipoEmpresa(configForm.numTrabajadores, configForm.nivelRiesgo);
    const newConfig = { ...configForm, tipoEmpresa: tipo };
    setCompanyConfig(newConfig);
    setCompanyConfigState(newConfig);
    setShowConfig(false);
    cargarDatos();
  };

  const handleNav = (section) => {
    if (onNavigate) onNavigate(section);
  };

  // Barra de progreso circular
  const CircularProgress = ({ percentage, size = 120, strokeWidth = 10, color }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const offset = circumference - (percentage / 100) * circumference;
    return (
      <div className="relative inline-flex items-center justify-center">
        <svg width={size} height={size} className="transform -rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} stroke="#e5e7eb" strokeWidth={strokeWidth} fill="none" />
          <circle cx={size / 2} cy={size / 2} r={radius} stroke={color || '#3b82f6'} strokeWidth={strokeWidth} fill="none"
            strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-1000" />
        </svg>
        <div className="absolute flex flex-col items-center">
          <span className="text-2xl font-bold text-gray-800">{percentage}%</span>
          <span className="text-xs text-gray-500">cumplimiento</span>
        </div>
      </div>
    );
  };

  const ProgressBar = ({ label, value, max = 100, color = 'bg-blue-500' }) => (
    <div className="mb-3">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-600 font-medium">{label}</span>
        <span className="text-gray-800 font-semibold">{value}%</span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2.5">
        <div className={`${color} h-2.5 rounded-full transition-all duration-700`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );

  const tipoLabels = { A: 'Tipo A (≤10 trabajadores, Riesgo I-III)', B: 'Tipo B (11-50 trabajadores, Riesgo I-III)', C: 'Tipo C (51+ trabajadores o Riesgo IV-V)' };

  if (!cumplimiento || !estadisticas) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-blue-500" />
        <span className="ml-3 text-gray-600">Cargando datos del SG-SST...</span>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 flex items-center gap-2">
            <Shield className="w-8 h-8 text-blue-600" />
            SG-SST Dashboard
          </h1>
          <p className="text-gray-500 mt-1">
            Sistema de Gestión de Seguridad y Salud en el Trabajo
            {companyConfig.nombre && <span className="font-medium text-gray-700"> — {companyConfig.nombre}</span>}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {tipoLabels[companyConfig.tipoEmpresa] || 'Configurar empresa'} | Res. 0312/2019
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowConfig(true)} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 text-sm font-medium transition-colors">
            <Settings className="w-4 h-4" /> Configurar Empresa
          </button>
          <button onClick={() => setShowEstandares(true)} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors">
            <Target className="w-4 h-4" /> Evaluar Estándares
          </button>
          <button onClick={cargarDatos} className="flex items-center gap-2 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 text-sm transition-colors">
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Alertas */}
      {alertas.length > 0 && (
        <div className="space-y-2">
          {alertas.slice(0, 5).map((alerta, i) => (
            <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${alerta.prioridad === 'alta' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-yellow-50 border-yellow-200 text-yellow-800'}`}>
              {alerta.prioridad === 'alta' ? <AlertTriangle className="w-5 h-5 flex-shrink-0" /> : <Bell className="w-5 h-5 flex-shrink-0" />}
              <span className="text-sm flex-1">{alerta.mensaje}</span>
              {alerta.fecha && <span className="text-xs opacity-75">{new Date(alerta.fecha).toLocaleDateString('es-CO')}</span>}
            </div>
          ))}
          {alertas.length > 5 && (
            <p className="text-xs text-gray-500 text-center">...y {alertas.length - 5} alertas más</p>
          )}
        </div>
      )}

      {/* Sección de cumplimiento PHVA */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cumplimiento general */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex flex-col items-center">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Cumplimiento General</h2>
          <CircularProgress percentage={cumplimiento.porcentaje} color={cumplimiento.valoracion.color} />
          <div className={`mt-4 px-4 py-1.5 rounded-full text-sm font-semibold text-white`} style={{ backgroundColor: cumplimiento.valoracion.color }}>
            {cumplimiento.valoracion.nivel}
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">{cumplimiento.valoracion.accion}</p>
          <p className="text-xs text-gray-400 mt-1">
            {cumplimiento.totalPesoObtenido} / {cumplimiento.totalPesoPosible} puntos
          </p>
        </div>

        {/* Ciclo PHVA */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 lg:col-span-2">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-blue-500" />
            Ciclo PHVA — Resolución 0312/2019
          </h2>
          <ProgressBar label="📋 Planear" value={cumplimiento.fases.Planear} color="bg-blue-500" />
          <ProgressBar label="⚙️ Hacer" value={cumplimiento.fases.Hacer} color="bg-green-500" />
          <ProgressBar label="🔍 Verificar" value={cumplimiento.fases.Verificar} color="bg-yellow-500" />
          <ProgressBar label="🔄 Actuar" value={cumplimiento.fases.Actuar} color="bg-purple-500" />
          <div className="mt-3 p-3 bg-gray-50 rounded-lg">
            <p className="text-xs text-gray-500">
              <Info className="w-3 h-3 inline mr-1" />
              Basado en los estándares mínimos para empresa {tipoLabels[companyConfig.tipoEmpresa]}
            </p>
          </div>
        </div>
      </div>

      {/* Tarjetas de estadísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleNav('riesgos')}>
          <div className="flex items-center justify-between mb-2">
            <AlertTriangle className="w-8 h-8 text-orange-500" />
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${estadisticas.riesgosAltos > 0 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
              {estadisticas.riesgosAltos > 0 ? `${estadisticas.riesgosAltos} altos` : 'Controlado'}
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-800">{estadisticas.totalRiesgos}</p>
          <p className="text-sm text-gray-500">Riesgos Identificados</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleNav('actividades')}>
          <div className="flex items-center justify-between mb-2">
            <ClipboardCheck className="w-8 h-8 text-blue-500" />
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${estadisticas.accionesAbiertas > 5 ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}`}>
              {estadisticas.accionesAbiertas} abiertas
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-800">{estadisticas.accionesAbiertas}</p>
          <p className="text-sm text-gray-500">Acciones Pendientes</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleNav('capacitaciones')}>
          <div className="flex items-center justify-between mb-2">
            <BookOpen className="w-8 h-8 text-green-500" />
            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${estadisticas.tasaCapacitacion >= 80 ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'}`}>
              {estadisticas.tasaCapacitacion}%
            </span>
          </div>
          <p className="text-3xl font-bold text-gray-800">{estadisticas.capCompletadas}/{estadisticas.totalCapacitaciones}</p>
          <p className="text-sm text-gray-500">Capacitaciones</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow cursor-pointer" onClick={() => handleNav('accidentes')}>
          <div className="flex items-center justify-between mb-2">
            <Activity className="w-8 h-8 text-red-500" />
            {indicadores && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${indicadores.tasaAccidentalidad > 5 ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
                TA: {indicadores.tasaAccidentalidad}%
              </span>
            )}
          </div>
          <p className="text-3xl font-bold text-gray-800">{estadisticas.accidentesAnio}</p>
          <p className="text-sm text-gray-500">Accidentes ({new Date().getFullYear()})</p>
        </div>
      </div>

      {/* Indicadores de accidentalidad + Acciones rápidas */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Indicadores */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-blue-500" />
            Indicadores de Accidentalidad
          </h2>
          {indicadores ? (
            <div className="grid grid-cols-2 gap-4">
              <div className="p-3 bg-blue-50 rounded-lg">
                <p className="text-xs text-blue-600 font-medium">IF (Frecuencia)</p>
                <p className="text-2xl font-bold text-blue-800">{indicadores.IF}</p>
                <p className="text-xs text-blue-500">por 240.000 HHT</p>
              </div>
              <div className="p-3 bg-purple-50 rounded-lg">
                <p className="text-xs text-purple-600 font-medium">IS (Severidad)</p>
                <p className="text-2xl font-bold text-purple-800">{indicadores.IS}</p>
                <p className="text-xs text-purple-500">por 240.000 HHT</p>
              </div>
              <div className="p-3 bg-orange-50 rounded-lg">
                <p className="text-xs text-orange-600 font-medium">ILI (Lesión Incapacitante)</p>
                <p className="text-2xl font-bold text-orange-800">{indicadores.ILI}</p>
                <p className="text-xs text-orange-500">(IF × IS) / 1000</p>
              </div>
              <div className="p-3 bg-red-50 rounded-lg">
                <p className="text-xs text-red-600 font-medium">Tasa Accidentalidad</p>
                <p className="text-2xl font-bold text-red-800">{indicadores.tasaAccidentalidad}%</p>
                <p className="text-xs text-red-500">{indicadores.totalAccidentes} AT / {companyConfig.numTrabajadores || '?'} trab.</p>
              </div>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Sin datos de accidentalidad registrados</p>
          )}
          <p className="text-xs text-gray-400 mt-3">Res. 1401/2007, Dec. 1072/2015 Art. 2.2.4.6.21</p>
        </div>

        {/* Acciones rápidas */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Zap className="w-5 h-5 text-yellow-500" />
            Acciones Rápidas
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {[
              { label: 'Crear Política SST', icon: FileText, color: 'text-blue-600 bg-blue-50 hover:bg-blue-100', section: 'politica' },
              { label: 'Actualizar Matriz IPEVR', icon: AlertTriangle, color: 'text-orange-600 bg-orange-50 hover:bg-orange-100', section: 'riesgos' },
              { label: 'Programar Capacitación', icon: BookOpen, color: 'text-green-600 bg-green-50 hover:bg-green-100', section: 'capacitaciones' },
              { label: 'Ejecutar Inspección', icon: ClipboardCheck, color: 'text-purple-600 bg-purple-50 hover:bg-purple-100', section: 'inspecciones' },
              { label: 'Reportar Accidente', icon: Activity, color: 'text-red-600 bg-red-50 hover:bg-red-100', section: 'accidentes' },
              { label: 'Gestionar Documentos', icon: FileText, color: 'text-teal-600 bg-teal-50 hover:bg-teal-100', section: 'documentos' },
            ].map(({ label, icon: Icon, color, section }) => (
              <button key={section} onClick={() => handleNav(section)} className={`flex items-center gap-3 p-3 rounded-lg ${color} transition-colors text-left`}>
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="text-sm font-medium">{label}</span>
                <ChevronRight className="w-4 h-4 ml-auto opacity-50" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Resumen de documentos y estado de inspecciones */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <FileText className="w-5 h-5 text-teal-500" />
            Documentos Obligatorios
          </h2>
          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1">
              <div className="flex justify-between text-sm mb-1">
                <span className="text-gray-600">Completados</span>
                <span className="font-semibold">{estadisticas.documentosCompletos}/21</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-3">
                <div className="bg-teal-500 h-3 rounded-full transition-all duration-700"
                  style={{ width: `${Math.round((estadisticas.documentosCompletos / 21) * 100)}%` }} />
              </div>
            </div>
            <span className="text-2xl font-bold text-teal-600">
              {Math.round((estadisticas.documentosCompletos / 21) * 100)}%
            </span>
          </div>
          <button onClick={() => handleNav('documentos')}
            className="w-full text-center text-sm text-teal-600 hover:text-teal-700 font-medium py-2 rounded-lg hover:bg-teal-50 transition-colors">
            Ver repositorio de documentos →
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4 flex items-center gap-2">
            <Search className="w-5 h-5 text-purple-500" />
            Inspecciones
          </h2>
          <div className="space-y-2">
            <div className="flex justify-between items-center p-2 bg-gray-50 rounded">
              <span className="text-sm text-gray-600">Total realizadas</span>
              <span className="font-semibold text-gray-800">{estadisticas.totalInspecciones}</span>
            </div>
            <div className="flex justify-between items-center p-2 bg-yellow-50 rounded">
              <span className="text-sm text-yellow-700">Pendientes</span>
              <span className="font-semibold text-yellow-800">{estadisticas.inspeccionesPendientes}</span>
            </div>
          </div>
          <button onClick={() => handleNav('inspecciones')}
            className="w-full text-center text-sm text-purple-600 hover:text-purple-700 font-medium py-2 mt-3 rounded-lg hover:bg-purple-50 transition-colors">
            Gestionar inspecciones →
          </button>
        </div>
      </div>

      {/* Modal Configuración de Empresa */}
      {showConfig && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowConfig(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Building2 className="w-6 h-6 text-blue-600" />
                Configuración de Empresa
              </h2>
              <div className="space-y-3">
                {[
                  { key: 'nombre', label: 'Razón Social', type: 'text' },
                  { key: 'nit', label: 'NIT', type: 'text' },
                  { key: 'sector', label: 'Sector/Actividad Económica', type: 'text' },
                  { key: 'numTrabajadores', label: 'Número de Trabajadores', type: 'number' },
                  { key: 'direccion', label: 'Dirección', type: 'text' },
                  { key: 'ciudad', label: 'Ciudad', type: 'text' },
                  { key: 'arl', label: 'ARL', type: 'text' },
                  { key: 'representanteLegal', label: 'Representante Legal', type: 'text' },
                  { key: 'responsableSST', label: 'Responsable del SG-SST', type: 'text' },
                ].map(({ key, label, type }) => (
                  <div key={key}>
                    <label className="text-sm font-medium text-gray-700">{label}</label>
                    <input type={type} value={configForm[key] || ''} onChange={e => setConfigForm(prev => ({ ...prev, [key]: type === 'number' ? parseInt(e.target.value) || 0 : e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                  </div>
                ))}
                <div>
                  <label className="text-sm font-medium text-gray-700">Nivel de Riesgo</label>
                  <select value={configForm.nivelRiesgo || 'I'} onChange={e => setConfigForm(prev => ({ ...prev, nivelRiesgo: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500">
                    {['I', 'II', 'III', 'IV', 'V'].map(n => <option key={n} value={n}>Riesgo {n}</option>)}
                  </select>
                </div>
                <div className="p-3 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-700">
                    <Info className="w-4 h-4 inline mr-1" />
                    Tipo de empresa calculado: <strong>{determinarTipoEmpresa(configForm.numTrabajadores, configForm.nivelRiesgo)}</strong>
                    {' '}({tipoLabels[determinarTipoEmpresa(configForm.numTrabajadores, configForm.nivelRiesgo)]})
                  </p>
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => setShowConfig(false)} className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium">Cancelar</button>
                <button onClick={guardarConfig} className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">Guardar</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Evaluación de Estándares Mínimos */}
      {showEstandares && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowEstandares(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-2 flex items-center gap-2">
                <Target className="w-6 h-6 text-blue-600" />
                Evaluación de Estándares Mínimos
              </h2>
              <p className="text-sm text-gray-500 mb-4">
                Resolución 0312 de 2019 — Empresa {tipoLabels[companyConfig.tipoEmpresa]}
              </p>
              <div className="mb-4 p-3 rounded-lg" style={{ backgroundColor: `${cumplimiento.valoracion.color}20` }}>
                <div className="flex items-center justify-between">
                  <span className="font-semibold" style={{ color: cumplimiento.valoracion.color }}>
                    {cumplimiento.valoracion.nivel}: {cumplimiento.porcentaje}%
                  </span>
                  <span className="text-sm text-gray-600">{cumplimiento.totalPesoObtenido}/{cumplimiento.totalPesoPosible} pts</span>
                </div>
              </div>

              {['Planear', 'Hacer', 'Verificar', 'Actuar'].map(fase => {
                const itemsFase = cumplimiento.estandares.filter(e => e.fase === fase);
                if (itemsFase.length === 0) return null;
                return (
                  <div key={fase} className="mb-4">
                    <h3 className="font-semibold text-gray-700 mb-2 flex items-center gap-2">
                      {fase === 'Planear' && '📋'}
                      {fase === 'Hacer' && '⚙️'}
                      {fase === 'Verificar' && '🔍'}
                      {fase === 'Actuar' && '🔄'}
                      {fase} ({cumplimiento.fases[fase]}%)
                    </h3>
                    <div className="space-y-1">
                      {itemsFase.map(item => (
                        <label key={item.id} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50 cursor-pointer">
                          <input type="checkbox" checked={item.cumplido}
                            onChange={() => {
                              toggleCumplimientoEstandar(item.id);
                              setCumplimiento(calcularCumplimiento(companyConfig.tipoEmpresa));
                            }}
                            className="w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500" />
                          <span className={`text-sm flex-1 ${item.cumplido ? 'text-green-700' : 'text-gray-700'}`}>
                            {item.nombre}
                          </span>
                          <span className="text-xs text-gray-400">{item.peso} pts</span>
                        </label>
                      ))}
                    </div>
                  </div>
                );
              })}

              <div className="flex justify-end mt-4">
                <button onClick={() => { setShowEstandares(false); cargarDatos(); }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Footer regulatorio */}
      <div className="text-center text-xs text-gray-400 py-4 border-t border-gray-100">
        SG-SST conforme al Decreto 1072 de 2015 (Libro 2, Parte 2, Título 4, Capítulo 6) y Resolución 0312 de 2019
      </div>
    </div>
  );
};

export default SSTDashboard;
