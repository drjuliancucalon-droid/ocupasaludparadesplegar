/**
 * AccidentInvestigation.jsx
 * Reporte e Investigación de Accidentes de Trabajo y Enfermedades Laborales
 * Resolución 1401/2007, Decreto 1072/2015
 * FURAT y FUREP digitales
 */

import React, { useState, useMemo } from 'react';
import {
  Activity, Plus, Edit3, Trash2, Search, Filter, X, Save,
  AlertTriangle, FileText, Calendar, Clock, Users, BarChart3,
  ChevronDown, ChevronUp, Printer, Info, Shield, Target,
  TrendingUp, TrendingDown, AlertCircle, CheckCircle2, Eye
} from 'lucide-react';
import { accidentesCRUD, calcularIndicadores, getCompanyConfig } from '../services/sgsstService';

const CLASIFICACION = {
  'Mortal': { color: 'bg-black text-white', desc: 'Accidente que causa la muerte del trabajador' },
  'Grave': { color: 'bg-red-600 text-white', desc: 'Amputación, pérdida de capacidad funcional, hospitalization >24h, fractura de huesos largos' },
  'Leve': { color: 'bg-yellow-500 text-white', desc: 'Accidente con incapacidad temporal' },
  'Incidente': { color: 'bg-blue-500 text-white', desc: 'Evento sin lesión (near-miss) que pudo causar daño' },
};

const TIPO_VINCULACION = ['Planta', 'Contratista', 'Misión', 'Cooperado', 'Independiente', 'Estudiante'];
const PARTES_CUERPO = ['Cabeza', 'Ojos', 'Cuello', 'Tronco/Espalda', 'Miembros superiores', 'Manos/Dedos', 'Miembros inferiores', 'Pies', 'Múltiples partes', 'Órganos internos'];
const TIPO_LESION = ['Fractura', 'Luxación', 'Herida', 'Contusión', 'Quemadura', 'Amputación', 'Intoxicación', 'Asfixia', 'Efecto eléctrico', 'Múltiple', 'Otro'];
const AGENTE_CAUSANTE = ['Máquinas/equipos', 'Herramientas', 'Materiales/sustancias', 'Medio ambiente', 'Vehículos de transporte', 'Instalaciones/superficie', 'Otros agentes'];
const MECANISMO = ['Caída de personas', 'Caída de objetos', 'Pisadas/choques/golpes', 'Atrapamiento', 'Sobreesfuerzo', 'Contacto con sustancia', 'Exposición', 'Accidente de tránsito', 'Agresión', 'Otro'];

const AccidentInvestigation = () => {
  const [accidentes, setAccidentes] = useState(accidentesCRUD.getAll());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [activeTab, setActiveTab] = useState('registros'); // registros | indicadores | investigacion
  const [expandedId, setExpandedId] = useState(null);
  const [filterClasificacion, setFilterClasificacion] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showInvestigation, setShowInvestigation] = useState(null);

  const companyConfig = getCompanyConfig();

  const emptyForm = {
    // Datos del evento
    tipoReporte: 'FURAT', // FURAT o FUREP
    fecha: '',
    hora: '',
    clasificacion: 'Leve',
    lugarAccidente: '',
    areaAccidente: '',
    descripcion: '',
    // Datos del trabajador
    nombreTrabajador: '',
    documento: '',
    cargo: '',
    tipoVinculacion: 'Planta',
    antiguedad: '',
    // Datos de la lesión
    parteCuerpoAfectada: '',
    tipoLesion: '',
    agenteCausante: '',
    mecanismo: '',
    // Incapacidad
    diasPerdidos: 0,
    fechaInicioIncapacidad: '',
    fechaFinIncapacidad: '',
    // Investigación
    causasInmediatas: '',
    causasBasicas: '',
    porques: ['', '', '', '', ''], // 5 Por qués
    arbolCausas: '',
    // Acciones correctivas
    accionesCorrectivas: [],
    nuevaAccion: '',
    leccionesAprendidas: '',
    testigos: '',
    investigadoPor: '',
    fechaInvestigacion: '',
  };
  const [form, setForm] = useState({ ...emptyForm });

  const refresh = () => setAccidentes(accidentesCRUD.getAll());

  const indicadores = useMemo(() => {
    return calcularIndicadores(accidentes, companyConfig.numTrabajadores || 1, null);
  }, [accidentes, companyConfig.numTrabajadores]);

  const filteredAccidentes = useMemo(() => {
    return accidentes.filter(a => {
      if (filterClasificacion && a.clasificacion !== filterClasificacion) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (a.nombreTrabajador || '').toLowerCase().includes(term) ||
          (a.descripcion || '').toLowerCase().includes(term) ||
          (a.areaAccidente || '').toLowerCase().includes(term);
      }
      return true;
    }).sort((a, b) => new Date(b.fecha || b.createdAt) - new Date(a.fecha || a.createdAt));
  }, [accidentes, filterClasificacion, searchTerm]);

  // Estadísticas por año
  const statsAnio = useMemo(() => {
    const anioActual = new Date().getFullYear();
    const anioAnterior = anioActual - 1;
    const accAnio = accidentes.filter(a => new Date(a.fecha).getFullYear() === anioActual);
    const accAnterior = accidentes.filter(a => new Date(a.fecha).getFullYear() === anioAnterior);
    return {
      anioActual: { total: accAnio.length, mortales: accAnio.filter(a => a.clasificacion === 'Mortal').length, graves: accAnio.filter(a => a.clasificacion === 'Grave').length, leves: accAnio.filter(a => a.clasificacion === 'Leve').length, incidentes: accAnio.filter(a => a.clasificacion === 'Incidente').length },
      anioAnterior: { total: accAnterior.length },
      tendencia: accAnio.length <= accAnterior.length ? 'baja' : 'alza',
    };
  }, [accidentes]);

  const handleSave = () => {
    if (!form.fecha || !form.clasificacion) { alert('La fecha y clasificación son obligatorias'); return; }
    const data = { ...form };
    delete data.nuevaAccion;
    if (editingId) {
      accidentesCRUD.update(editingId, data);
    } else {
      accidentesCRUD.create(data);
    }
    refresh();
    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm });
  };

  const handleEdit = (acc) => {
    setForm({ ...emptyForm, ...acc, porques: acc.porques || ['', '', '', '', ''] });
    setEditingId(acc.id);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Eliminar este reporte de accidente?')) { accidentesCRUD.remove(id); refresh(); }
  };

  const addAccionCorrectiva = () => {
    if (form.nuevaAccion?.trim()) {
      setForm(prev => ({
        ...prev,
        accionesCorrectivas: [...(prev.accionesCorrectivas || []), { descripcion: prev.nuevaAccion.trim(), responsable: '', fechaLimite: '', estado: 'Pendiente' }],
        nuevaAccion: '',
      }));
    }
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Activity className="w-7 h-7 text-red-500" />
            Investigación de Accidentes
          </h1>
          <p className="text-sm text-gray-500">FURAT / FUREP — Resolución 1401/2007, Decreto 1072/2015</p>
        </div>
        <button onClick={() => { setForm({ ...emptyForm }); setEditingId(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Reportar Accidente/Incidente
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {[
          { id: 'registros', label: 'Registros', icon: FileText },
          { id: 'indicadores', label: 'Indicadores', icon: BarChart3 },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 ${activeTab === tab.id ? 'border-red-600 text-red-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Registros */}
      {activeTab === 'registros' && (
        <div className="space-y-4">
          {/* Stats cards */}
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold text-gray-800">{statsAnio.anioActual.total}</p>
              <p className="text-xs text-gray-500">Total {new Date().getFullYear()}</p>
            </div>
            <div className="bg-white rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold text-black">{statsAnio.anioActual.mortales}</p>
              <p className="text-xs text-gray-500">Mortales</p>
            </div>
            <div className="bg-white rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold text-red-600">{statsAnio.anioActual.graves}</p>
              <p className="text-xs text-gray-500">Graves</p>
            </div>
            <div className="bg-white rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold text-yellow-600">{statsAnio.anioActual.leves}</p>
              <p className="text-xs text-gray-500">Leves</p>
            </div>
            <div className="bg-white rounded-lg border p-3 text-center">
              <p className="text-2xl font-bold text-blue-600">{statsAnio.anioActual.incidentes}</p>
              <p className="text-xs text-gray-500">Incidentes</p>
            </div>
          </div>

          {/* Filtros */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar por trabajador, descripción..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" />
            </div>
            <select value={filterClasificacion} onChange={e => setFilterClasificacion(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
              <option value="">Todas las clasificaciones</option>
              {Object.keys(CLASIFICACION).map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Lista de accidentes */}
          {filteredAccidentes.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center">
              <Shield className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No hay accidentes registrados</p>
              <p className="text-sm text-gray-400 mt-1">También se registran incidentes (near-miss) para la prevención</p>
            </div>
          ) : (
            filteredAccidentes.map(acc => (
              <div key={acc.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-4 cursor-pointer hover:bg-gray-50" onClick={() => setExpandedId(expandedId === acc.id ? null : acc.id)}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${CLASIFICACION[acc.clasificacion]?.color || 'bg-gray-200'}`}>
                          {acc.clasificacion}
                        </span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{acc.tipoReporte || 'FURAT'}</span>
                        {acc.fecha && <span className="text-xs text-gray-400">{new Date(acc.fecha).toLocaleDateString('es-CO')}</span>}
                      </div>
                      <h3 className="font-semibold text-gray-800">{acc.nombreTrabajador || 'Sin nombre'} — {acc.cargo || 'Sin cargo'}</h3>
                      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{acc.descripcion || 'Sin descripción'}</p>
                      <div className="flex flex-wrap gap-3 mt-2 text-xs text-gray-500">
                        {acc.areaAccidente && <span>📍 {acc.areaAccidente}</span>}
                        {acc.diasPerdidos > 0 && <span className="text-red-600 font-medium">⏱ {acc.diasPerdidos} días perdidos</span>}
                        {acc.parteCuerpoAfectada && <span>🦴 {acc.parteCuerpoAfectada}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={e => { e.stopPropagation(); handleEdit(acc); }} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={e => { e.stopPropagation(); handleDelete(acc.id); }} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                      {expandedId === acc.id ? <ChevronUp className="w-4 h-4 text-gray-400 mt-2" /> : <ChevronDown className="w-4 h-4 text-gray-400 mt-2" />}
                    </div>
                  </div>
                </div>
                {expandedId === acc.id && (
                  <div className="px-4 pb-4 border-t bg-gray-50 space-y-3">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 py-3">
                      <div><p className="text-xs text-gray-500">Documento</p><p className="text-sm font-medium">{acc.documento || '-'}</p></div>
                      <div><p className="text-xs text-gray-500">Vinculación</p><p className="text-sm font-medium">{acc.tipoVinculacion || '-'}</p></div>
                      <div><p className="text-xs text-gray-500">Tipo de Lesión</p><p className="text-sm font-medium">{acc.tipoLesion || '-'}</p></div>
                      <div><p className="text-xs text-gray-500">Mecanismo</p><p className="text-sm font-medium">{acc.mecanismo || '-'}</p></div>
                      <div><p className="text-xs text-gray-500">Agente Causante</p><p className="text-sm font-medium">{acc.agenteCausante || '-'}</p></div>
                      <div><p className="text-xs text-gray-500">Hora del accidente</p><p className="text-sm font-medium">{acc.hora || '-'}</p></div>
                      <div><p className="text-xs text-gray-500">Lugar</p><p className="text-sm font-medium">{acc.lugarAccidente || '-'}</p></div>
                      <div><p className="text-xs text-gray-500">Antigüedad</p><p className="text-sm font-medium">{acc.antiguedad || '-'}</p></div>
                    </div>
                    {/* Investigación */}
                    {(acc.causasInmediatas || acc.causasBasicas || acc.porques?.some(p => p)) && (
                      <div className="py-3 border-t space-y-2">
                        <h4 className="font-semibold text-gray-700">Investigación (Res. 1401/2007)</h4>
                        {acc.causasInmediatas && <div><p className="text-xs text-gray-500 font-medium">Causas Inmediatas:</p><p className="text-sm text-gray-700">{acc.causasInmediatas}</p></div>}
                        {acc.causasBasicas && <div><p className="text-xs text-gray-500 font-medium">Causas Básicas:</p><p className="text-sm text-gray-700">{acc.causasBasicas}</p></div>}
                        {acc.porques?.some(p => p) && (
                          <div>
                            <p className="text-xs text-gray-500 font-medium mb-1">5 Por qués:</p>
                            {acc.porques.map((p, i) => p && (
                              <p key={i} className="text-sm text-gray-700 ml-2">
                                <span className="font-medium text-red-600">¿Por qué {i + 1}?</span> {p}
                              </p>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                    {/* Acciones correctivas */}
                    {acc.accionesCorrectivas?.length > 0 && (
                      <div className="py-3 border-t">
                        <h4 className="font-semibold text-gray-700 mb-2">Acciones Correctivas</h4>
                        {acc.accionesCorrectivas.map((accion, i) => (
                          <div key={i} className="flex items-center gap-2 p-2 bg-white rounded border mb-1">
                            <CheckCircle2 className={`w-4 h-4 ${accion.estado === 'Completado' ? 'text-green-500' : 'text-gray-300'}`} />
                            <span className="text-sm flex-1">{accion.descripcion}</span>
                            <span className="text-xs text-gray-400">{accion.responsable}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Indicadores */}
      {activeTab === 'indicadores' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
              <p className="text-xs text-blue-600 font-medium mb-1">IF — Índice de Frecuencia</p>
              <p className="text-4xl font-bold text-blue-800">{indicadores.IF}</p>
              <p className="text-xs text-gray-500 mt-1">(AT con incapacidad × 240.000) / HHT</p>
              <p className="text-xs text-gray-400 mt-2">{indicadores.accidentesConIncapacidad} AT / {indicadores.hht.toLocaleString()} HHT</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
              <p className="text-xs text-purple-600 font-medium mb-1">IS — Índice de Severidad</p>
              <p className="text-4xl font-bold text-purple-800">{indicadores.IS}</p>
              <p className="text-xs text-gray-500 mt-1">(Días perdidos × 240.000) / HHT</p>
              <p className="text-xs text-gray-400 mt-2">{indicadores.totalDiasPerdidos} días perdidos</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
              <p className="text-xs text-orange-600 font-medium mb-1">ILI — Lesión Incapacitante</p>
              <p className="text-4xl font-bold text-orange-800">{indicadores.ILI}</p>
              <p className="text-xs text-gray-500 mt-1">(IF × IS) / 1.000</p>
            </div>
            <div className="bg-white rounded-xl shadow-sm border p-6 text-center">
              <p className="text-xs text-red-600 font-medium mb-1">Tasa de Accidentalidad</p>
              <p className="text-4xl font-bold text-red-800">{indicadores.tasaAccidentalidad}%</p>
              <p className="text-xs text-gray-500 mt-1">(Total AT × 100) / Trabajadores</p>
              <p className="text-xs text-gray-400 mt-2">{indicadores.totalAccidentes} AT / {companyConfig.numTrabajadores || '?'} trabajadores</p>
            </div>
          </div>

          {/* Timeline */}
          <div className="bg-white rounded-xl shadow-sm border p-6">
            <h3 className="font-semibold text-gray-700 mb-4">Línea de Tiempo de Eventos</h3>
            {accidentes.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No hay eventos registrados</p>
            ) : (
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {[...accidentes].sort((a, b) => new Date(b.fecha || b.createdAt) - new Date(a.fecha || a.createdAt)).map(acc => (
                  <div key={acc.id} className="flex items-start gap-3">
                    <div className={`w-3 h-3 rounded-full mt-1 flex-shrink-0 ${
                      acc.clasificacion === 'Mortal' ? 'bg-black' :
                      acc.clasificacion === 'Grave' ? 'bg-red-500' :
                      acc.clasificacion === 'Leve' ? 'bg-yellow-500' : 'bg-blue-500'
                    }`} />
                    <div className="flex-1 border-b pb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800">{acc.clasificacion}</span>
                        <span className="text-xs text-gray-400">{acc.fecha ? new Date(acc.fecha).toLocaleDateString('es-CO') : '—'}</span>
                      </div>
                      <p className="text-sm text-gray-600">{acc.nombreTrabajador} — {acc.descripcion?.slice(0, 100) || 'Sin descripción'}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="p-3 bg-gray-50 border rounded-lg">
            <p className="text-xs text-gray-500">
              <Info className="w-3 h-3 inline mr-1" />
              Indicadores calculados conforme al Dec. 1072/2015 Art. 2.2.4.6.21 y Res. 1401/2007.
              HHT = Horas Hombre Trabajadas estimadas ({companyConfig.numTrabajadores || 1} × 48h/sem × 50 sem).
              Constante: 240.000 (equivalente a 100 trabajadores × 48h × 50 sem).
            </p>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Activity className="w-6 h-6 text-red-500" />
                {editingId ? 'Editar Reporte' : 'Nuevo Reporte de Accidente / Incidente'}
              </h2>
              <div className="space-y-4">
                {/* Tipo de reporte */}
                <div className="flex gap-4 p-3 bg-gray-50 rounded-lg">
                  {['FURAT', 'FUREP'].map(tipo => (
                    <label key={tipo} className={`flex items-center gap-2 px-4 py-2 rounded-lg cursor-pointer border ${form.tipoReporte === tipo ? 'bg-red-50 border-red-300 text-red-700' : 'bg-white border-gray-200'}`}>
                      <input type="radio" name="tipoReporte" value={tipo} checked={form.tipoReporte === tipo}
                        onChange={e => setForm(p => ({ ...p, tipoReporte: e.target.value }))} className="text-red-600" />
                      <span className="text-sm font-medium">{tipo === 'FURAT' ? 'FURAT (Accidente)' : 'FUREP (Enfermedad)'}</span>
                    </label>
                  ))}
                </div>

                {/* Datos del evento */}
                <div className="p-4 bg-red-50 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-3">Datos del Evento</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Fecha *</label>
                      <input type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Hora</label>
                      <input type="time" value={form.hora} onChange={e => setForm(p => ({ ...p, hora: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Clasificación *</label>
                      <select value={form.clasificacion} onChange={e => setForm(p => ({ ...p, clasificacion: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                        {Object.keys(CLASIFICACION).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Lugar</label>
                      <input type="text" value={form.lugarAccidente} onChange={e => setForm(p => ({ ...p, lugarAccidente: e.target.value }))}
                        placeholder="Ej: Dentro de la empresa, en tránsito..." className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Área</label>
                      <input type="text" value={form.areaAccidente} onChange={e => setForm(p => ({ ...p, areaAccidente: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="text-sm font-medium text-gray-700">Descripción del evento</label>
                    <textarea value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                      placeholder="Describa detalladamente cómo ocurrió el accidente o incidente..."
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm h-20 resize-none" />
                  </div>
                </div>

                {/* Datos del trabajador */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-3">Datos del Trabajador</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Nombre completo</label>
                      <input type="text" value={form.nombreTrabajador} onChange={e => setForm(p => ({ ...p, nombreTrabajador: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Documento</label>
                      <input type="text" value={form.documento} onChange={e => setForm(p => ({ ...p, documento: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Cargo</label>
                      <input type="text" value={form.cargo} onChange={e => setForm(p => ({ ...p, cargo: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Vinculación</label>
                      <select value={form.tipoVinculacion} onChange={e => setForm(p => ({ ...p, tipoVinculacion: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                        {TIPO_VINCULACION.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Antigüedad</label>
                      <input type="text" value={form.antiguedad} onChange={e => setForm(p => ({ ...p, antiguedad: e.target.value }))}
                        placeholder="Ej: 2 años" className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                    </div>
                  </div>
                </div>

                {/* Datos de la lesión */}
                <div className="p-4 bg-yellow-50 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-3">Datos de la Lesión</h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Parte del cuerpo</label>
                      <select value={form.parteCuerpoAfectada} onChange={e => setForm(p => ({ ...p, parteCuerpoAfectada: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                        <option value="">Seleccione...</option>
                        {PARTES_CUERPO.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Tipo de lesión</label>
                      <select value={form.tipoLesion} onChange={e => setForm(p => ({ ...p, tipoLesion: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                        <option value="">Seleccione...</option>
                        {TIPO_LESION.map(t => <option key={t} value={t}>{t}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Agente causante</label>
                      <select value={form.agenteCausante} onChange={e => setForm(p => ({ ...p, agenteCausante: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                        <option value="">Seleccione...</option>
                        {AGENTE_CAUSANTE.map(a => <option key={a} value={a}>{a}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Mecanismo</label>
                      <select value={form.mecanismo} onChange={e => setForm(p => ({ ...p, mecanismo: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                        <option value="">Seleccione...</option>
                        {MECANISMO.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Días de incapacidad</label>
                      <input type="number" value={form.diasPerdidos} onChange={e => setForm(p => ({ ...p, diasPerdidos: parseInt(e.target.value) || 0 }))}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                    </div>
                  </div>
                </div>

                {/* Investigación — 5 Por qués */}
                <div className="p-4 bg-purple-50 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-3">Investigación — Metodología 5 Por qués</h3>
                  <div className="space-y-2">
                    {(form.porques || ['', '', '', '', '']).map((pq, i) => (
                      <div key={i}>
                        <label className="text-sm font-medium text-purple-700">¿Por qué {i + 1}?</label>
                        <input type="text" value={pq}
                          onChange={e => { const newPQ = [...(form.porques || ['', '', '', '', ''])]; newPQ[i] = e.target.value; setForm(p => ({ ...p, porques: newPQ })); }}
                          placeholder={i === 0 ? '¿Por qué ocurrió el accidente?' : '¿Por qué ocurrió lo anterior?'}
                          className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Causas Inmediatas</label>
                      <textarea value={form.causasInmediatas} onChange={e => setForm(p => ({ ...p, causasInmediatas: e.target.value }))}
                        placeholder="Actos inseguros, condiciones inseguras..." className="w-full mt-1 px-3 py-2 border rounded-lg text-sm h-16 resize-none" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Causas Básicas</label>
                      <textarea value={form.causasBasicas} onChange={e => setForm(p => ({ ...p, causasBasicas: e.target.value }))}
                        placeholder="Factores personales, factores del trabajo..." className="w-full mt-1 px-3 py-2 border rounded-lg text-sm h-16 resize-none" />
                    </div>
                  </div>
                </div>

                {/* Acciones correctivas */}
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-3">Plan de Acción Correctiva</h3>
                  <div className="flex gap-2 mb-2">
                    <input type="text" value={form.nuevaAccion || ''} onChange={e => setForm(p => ({ ...p, nuevaAccion: e.target.value }))}
                      placeholder="Descripción de la acción correctiva..."
                      onKeyDown={e => e.key === 'Enter' && addAccionCorrectiva()}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                    <button onClick={addAccionCorrectiva} className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /></button>
                  </div>
                  {(form.accionesCorrectivas || []).map((accion, i) => (
                    <div key={i} className="flex items-center gap-2 p-2 bg-white rounded border mb-1">
                      <span className="text-sm flex-1">{accion.descripcion}</span>
                      <button onClick={() => setForm(p => ({ ...p, accionesCorrectivas: p.accionesCorrectivas.filter((_, idx) => idx !== i) }))}
                        className="text-red-400"><X className="w-3 h-3" /></button>
                    </div>
                  ))}
                  <div className="grid grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Investigado por</label>
                      <input type="text" value={form.investigadoPor} onChange={e => setForm(p => ({ ...p, investigadoPor: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Fecha investigación</label>
                      <input type="date" value={form.fechaInvestigacion} onChange={e => setForm(p => ({ ...p, fechaInvestigacion: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="text-sm font-medium text-gray-700">Lecciones Aprendidas</label>
                    <textarea value={form.leccionesAprendidas} onChange={e => setForm(p => ({ ...p, leccionesAprendidas: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm h-16 resize-none" />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium">Cancelar</button>
                <button onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 text-sm font-medium flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> {editingId ? 'Actualizar' : 'Guardar'} Reporte
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="text-center text-xs text-gray-400 py-2">
        Investigación de accidentes conforme a Resolución 1401/2007 y Decreto 1072/2015
      </div>
    </div>
  );
};

export default AccidentInvestigation;
