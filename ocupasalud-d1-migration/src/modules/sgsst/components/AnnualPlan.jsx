/**
 * AnnualPlan.jsx
 * Plan de Trabajo Anual del SG-SST
 * Decreto 1072/2015 Art. 2.2.4.6.17
 */

import React, { useState, useMemo } from 'react';
import {
  Calendar, Plus, Edit3, Trash2, ChevronLeft, ChevronRight, Filter,
  CheckCircle2, Clock, AlertTriangle, X, Save, Printer, Download,
  Users, Target, Info, BarChart3, AlertCircle
} from 'lucide-react';
import { actividadesCRUD } from '../services/sgsstService';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESES_FULL = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

const CATEGORIAS = [
  { id: 'capacitaciones', label: 'Capacitaciones', color: 'bg-blue-500', textColor: 'text-blue-700', bgLight: 'bg-blue-50' },
  { id: 'inspecciones', label: 'Inspecciones', color: 'bg-purple-500', textColor: 'text-purple-700', bgLight: 'bg-purple-50' },
  { id: 'evaluaciones', label: 'Evaluaciones médicas', color: 'bg-green-500', textColor: 'text-green-700', bgLight: 'bg-green-50' },
  { id: 'simulacros', label: 'Simulacros', color: 'bg-red-500', textColor: 'text-red-700', bgLight: 'bg-red-50' },
  { id: 'mediciones', label: 'Mediciones', color: 'bg-yellow-500', textColor: 'text-yellow-700', bgLight: 'bg-yellow-50' },
  { id: 'auditorias', label: 'Auditorías', color: 'bg-teal-500', textColor: 'text-teal-700', bgLight: 'bg-teal-50' },
  { id: 'otros', label: 'Otros', color: 'bg-gray-500', textColor: 'text-gray-700', bgLight: 'bg-gray-50' },
];

const ESTADOS = {
  'Pendiente': { color: 'bg-gray-200 text-gray-700', icon: Clock },
  'En progreso': { color: 'bg-blue-100 text-blue-700', icon: BarChart3 },
  'Completado': { color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  'Atrasado': { color: 'bg-red-100 text-red-700', icon: AlertTriangle },
};

const AnnualPlan = () => {
  const [actividades, setActividades] = useState(actividadesCRUD.getAll());
  const [anio, setAnio] = useState(new Date().getFullYear());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [viewMode, setViewMode] = useState('gantt'); // gantt | list

  const emptyForm = {
    nombre: '',
    descripcion: '',
    categoria: 'capacitaciones',
    responsable: '',
    mesInicio: 0,
    mesFin: 0,
    fechaLimite: '',
    estado: 'Pendiente',
    observaciones: '',
    recurso: '',
    indicador: '',
  };
  const [form, setForm] = useState({ ...emptyForm });

  const refresh = () => setActividades(actividadesCRUD.getAll());

  const actividadesAnio = useMemo(() => {
    return actividades.filter(a => {
      if (a.anio && a.anio === anio) return true;
      if (a.fechaLimite) {
        const fecha = new Date(a.fechaLimite);
        return fecha.getFullYear() === anio;
      }
      if (a.mesInicio !== undefined) return true; // stored with month indices
      return true;
    });
  }, [actividades, anio]);

  const filteredActs = useMemo(() => {
    return actividadesAnio.filter(a => {
      if (filterCategoria && a.categoria !== filterCategoria) return false;
      if (filterEstado && a.estado !== filterEstado) return false;
      return true;
    });
  }, [actividadesAnio, filterCategoria, filterEstado]);

  // Auto-detect overdue
  const actividadesConEstado = useMemo(() => {
    const hoy = new Date();
    return filteredActs.map(a => {
      if (a.estado !== 'Completado' && a.fechaLimite && new Date(a.fechaLimite) < hoy) {
        return { ...a, estado: 'Atrasado' };
      }
      return a;
    });
  }, [filteredActs]);

  const stats = useMemo(() => {
    const total = actividadesAnio.length;
    const completados = actividadesAnio.filter(a => a.estado === 'Completado').length;
    const atrasados = actividadesAnio.filter(a => {
      if (a.estado === 'Completado') return false;
      if (a.fechaLimite && new Date(a.fechaLimite) < new Date()) return true;
      return false;
    }).length;
    const enProgreso = actividadesAnio.filter(a => a.estado === 'En progreso').length;
    const porcentaje = total > 0 ? Math.round((completados / total) * 100) : 0;
    return { total, completados, atrasados, enProgreso, porcentaje };
  }, [actividadesAnio]);

  const handleSave = () => {
    if (!form.nombre) { alert('El nombre de la actividad es obligatorio'); return; }
    const data = { ...form, anio };
    if (editingId) {
      actividadesCRUD.update(editingId, data);
    } else {
      actividadesCRUD.create(data);
    }
    refresh();
    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm });
  };

  const handleEdit = (act) => {
    setForm({ ...act });
    setEditingId(act.id);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Eliminar esta actividad del plan anual?')) {
      actividadesCRUD.remove(id);
      refresh();
    }
  };

  const toggleEstado = (act) => {
    const estados = ['Pendiente', 'En progreso', 'Completado'];
    const currentIdx = estados.indexOf(act.estado);
    const nextEstado = estados[(currentIdx + 1) % estados.length];
    actividadesCRUD.update(act.id, { estado: nextEstado });
    refresh();
  };

  const getCatInfo = (catId) => CATEGORIAS.find(c => c.id === catId) || CATEGORIAS[CATEGORIAS.length - 1];

  const handlePrint = () => {
    const rows = actividadesConEstado.map(a => {
      const cat = getCatInfo(a.categoria);
      const months = MESES.map((_, i) => {
        const inRange = i >= (a.mesInicio || 0) && i <= (a.mesFin || a.mesInicio || 0);
        return `<td style="text-align:center;${inRange ? 'background-color:#3b82f6;color:white;' : ''}">${inRange ? '●' : ''}</td>`;
      }).join('');
      return `<tr><td>${a.nombre}</td><td>${cat.label}</td><td>${a.responsable || '-'}</td><td>${a.estado}</td>${months}</tr>`;
    }).join('');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Plan Anual SST ${anio}</title>
      <style>
        body { font-family: Arial; padding: 20px; font-size: 9pt; }
        h1 { font-size: 14pt; text-align: center; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #999; padding: 3px 5px; }
        th { background: #1e40af; color: white; font-size: 8pt; }
        @media print { @page { size: landscape; margin: 1cm; } }
      </style></head><body>
        <h1>PLAN DE TRABAJO ANUAL SG-SST — ${anio}</h1>
        <p style="text-align:center;">Decreto 1072/2015 Art. 2.2.4.6.17 | Cumplimiento: ${stats.porcentaje}%</p>
        <table><thead><tr>
          <th>Actividad</th><th>Categoría</th><th>Responsable</th><th>Estado</th>
          ${MESES.map(m => `<th>${m}</th>`).join('')}
        </tr></thead><tbody>${rows}</tbody></table>
        <script>window.print();</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <Calendar className="w-7 h-7 text-blue-600" />
            Plan de Trabajo Anual
          </h1>
          <p className="text-sm text-gray-500">Decreto 1072/2015 Art. 2.2.4.6.17</p>
        </div>
        <div className="flex gap-2 flex-wrap items-center">
          <button onClick={() => setAnio(anio - 1)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"><ChevronLeft className="w-4 h-4" /></button>
          <span className="text-lg font-bold text-gray-800 px-2">{anio}</span>
          <button onClick={() => setAnio(anio + 1)} className="p-2 bg-gray-100 hover:bg-gray-200 rounded-lg"><ChevronRight className="w-4 h-4" /></button>
          <div className="flex bg-gray-100 rounded-lg p-0.5 ml-2">
            <button onClick={() => setViewMode('gantt')} className={`px-3 py-1.5 rounded text-sm font-medium ${viewMode === 'gantt' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}>Gantt</button>
            <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded text-sm font-medium ${viewMode === 'list' ? 'bg-white shadow text-blue-600' : 'text-gray-600'}`}>Lista</button>
          </div>
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 text-sm font-medium">
            <Printer className="w-4 h-4" />
          </button>
          <button onClick={() => { setForm({ ...emptyForm }); setEditingId(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Nueva Actividad
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <div className="bg-white rounded-lg border p-3 text-center">
          <p className="text-2xl font-bold text-gray-800">{stats.total}</p>
          <p className="text-xs text-gray-500">Total actividades</p>
        </div>
        <div className="bg-white rounded-lg border p-3 text-center">
          <p className="text-2xl font-bold text-green-600">{stats.completados}</p>
          <p className="text-xs text-gray-500">Completadas</p>
        </div>
        <div className="bg-white rounded-lg border p-3 text-center">
          <p className="text-2xl font-bold text-blue-600">{stats.enProgreso}</p>
          <p className="text-xs text-gray-500">En progreso</p>
        </div>
        <div className="bg-white rounded-lg border p-3 text-center">
          <p className="text-2xl font-bold text-red-600">{stats.atrasados}</p>
          <p className="text-xs text-gray-500">Atrasadas</p>
        </div>
        <div className="bg-white rounded-lg border p-3 text-center">
          <div className="flex items-center justify-center gap-2">
            <p className="text-2xl font-bold" style={{ color: stats.porcentaje >= 80 ? '#22c55e' : stats.porcentaje >= 50 ? '#eab308' : '#ef4444' }}>{stats.porcentaje}%</p>
          </div>
          <p className="text-xs text-gray-500">Cumplimiento</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center bg-white rounded-lg border p-3">
        <Filter className="w-4 h-4 text-gray-500" />
        <select value={filterCategoria} onChange={e => setFilterCategoria(e.target.value)} className="px-3 py-1.5 border rounded-lg text-sm">
          <option value="">Todas las categorías</option>
          {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
        </select>
        <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} className="px-3 py-1.5 border rounded-lg text-sm">
          <option value="">Todos los estados</option>
          {Object.keys(ESTADOS).map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        {(filterCategoria || filterEstado) && (
          <button onClick={() => { setFilterCategoria(''); setFilterEstado(''); }} className="text-xs text-red-600 flex items-center gap-1"><X className="w-3 h-3" /> Limpiar</button>
        )}
      </div>

      {/* Gantt View */}
      {viewMode === 'gantt' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-x-auto">
          <table className="w-full min-w-[900px]">
            <thead>
              <tr className="border-b">
                <th className="text-left p-3 text-sm font-semibold text-gray-700 min-w-[250px] sticky left-0 bg-white z-10">Actividad</th>
                {MESES.map((m, i) => (
                  <th key={i} className="text-center p-2 text-xs font-medium text-gray-500 min-w-[60px]">{m}</th>
                ))}
                <th className="text-center p-2 text-xs font-medium text-gray-500 min-w-[80px]">Estado</th>
              </tr>
            </thead>
            <tbody>
              {actividadesConEstado.length === 0 ? (
                <tr>
                  <td colSpan={14} className="text-center py-12 text-gray-400">
                    <Calendar className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No hay actividades programadas para {anio}</p>
                  </td>
                </tr>
              ) : (
                actividadesConEstado.map(act => {
                  const cat = getCatInfo(act.categoria);
                  const EstadoIcon = ESTADOS[act.estado]?.icon || Clock;
                  return (
                    <tr key={act.id} className="border-b hover:bg-gray-50 group">
                      <td className="p-3 sticky left-0 bg-white group-hover:bg-gray-50 z-10">
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${cat.color} flex-shrink-0`} />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">{act.nombre}</p>
                            <p className="text-xs text-gray-400">{cat.label} • {act.responsable || 'Sin asignar'}</p>
                          </div>
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity ml-auto flex-shrink-0">
                            <button onClick={() => handleEdit(act)} className="p-1 text-gray-400 hover:text-blue-600"><Edit3 className="w-3 h-3" /></button>
                            <button onClick={() => handleDelete(act.id)} className="p-1 text-gray-400 hover:text-red-600"><Trash2 className="w-3 h-3" /></button>
                          </div>
                        </div>
                      </td>
                      {MESES.map((_, i) => {
                        const inRange = i >= (act.mesInicio || 0) && i <= (act.mesFin || act.mesInicio || 0);
                        const isStart = i === (act.mesInicio || 0);
                        const isEnd = i === (act.mesFin || act.mesInicio || 0);
                        return (
                          <td key={i} className="p-1">
                            {inRange && (
                              <div className={`h-6 ${cat.color} opacity-80 ${isStart ? 'rounded-l-full ml-1' : ''} ${isEnd ? 'rounded-r-full mr-1' : ''} ${act.estado === 'Completado' ? 'opacity-100' : ''} ${act.estado === 'Atrasado' ? 'animate-pulse' : ''}`}
                                title={`${act.nombre}: ${MESES_FULL[i]}`} />
                            )}
                          </td>
                        );
                      })}
                      <td className="p-2 text-center">
                        <button onClick={() => toggleEstado(act)} className={`inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${ESTADOS[act.estado]?.color || 'bg-gray-100'}`}
                          title="Clic para cambiar estado">
                          <EstadoIcon className="w-3 h-3" />
                          <span className="hidden sm:inline">{act.estado}</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* List View */}
      {viewMode === 'list' && (
        <div className="space-y-3">
          {actividadesConEstado.length === 0 ? (
            <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
              <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No hay actividades programadas para {anio}</p>
            </div>
          ) : (
            actividadesConEstado.map(act => {
              const cat = getCatInfo(act.categoria);
              const EstadoIcon = ESTADOS[act.estado]?.icon || Clock;
              return (
                <div key={act.id} className="bg-white rounded-xl shadow-sm border p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.bgLight} ${cat.textColor}`}>{cat.label}</span>
                        <button onClick={() => toggleEstado(act)} className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${ESTADOS[act.estado]?.color}`}>
                          <EstadoIcon className="w-3 h-3" /> {act.estado}
                        </button>
                      </div>
                      <h3 className="font-semibold text-gray-800">{act.nombre}</h3>
                      {act.descripcion && <p className="text-sm text-gray-500 mt-1">{act.descripcion}</p>}
                      <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                        <span><Users className="w-3 h-3 inline mr-1" />{act.responsable || 'Sin asignar'}</span>
                        <span><Calendar className="w-3 h-3 inline mr-1" />{MESES_FULL[act.mesInicio || 0]}{act.mesFin !== undefined && act.mesFin !== act.mesInicio ? ` → ${MESES_FULL[act.mesFin]}` : ''}</span>
                        {act.fechaLimite && <span><Clock className="w-3 h-3 inline mr-1" />Límite: {new Date(act.fechaLimite).toLocaleDateString('es-CO')}</span>}
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => handleEdit(act)} className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg"><Edit3 className="w-4 h-4" /></button>
                      <button onClick={() => handleDelete(act.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Progress Bar */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Cumplimiento del Plan Anual {anio}</span>
          <span className="text-sm font-bold" style={{ color: stats.porcentaje >= 80 ? '#22c55e' : stats.porcentaje >= 50 ? '#eab308' : '#ef4444' }}>
            {stats.porcentaje}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div className="h-3 rounded-full transition-all duration-700"
            style={{ width: `${stats.porcentaje}%`, backgroundColor: stats.porcentaje >= 80 ? '#22c55e' : stats.porcentaje >= 50 ? '#eab308' : '#ef4444' }} />
        </div>
        <p className="text-xs text-gray-400 mt-2">
          {stats.completados} de {stats.total} actividades completadas
          {stats.atrasados > 0 && <span className="text-red-500 font-medium"> • {stats.atrasados} atrasada(s)</span>}
        </p>
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <Calendar className="w-6 h-6 text-blue-600" />
                {editingId ? 'Editar Actividad' : 'Nueva Actividad del Plan'}
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Nombre de la Actividad *</label>
                  <input type="text" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                    placeholder="Ej: Capacitación en Primeros Auxilios"
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Descripción</label>
                  <textarea value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm h-16 resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Categoría</label>
                    <select value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                      {CATEGORIAS.map(c => <option key={c.id} value={c.id}>{c.label}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Estado</label>
                    <select value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                      {Object.keys(ESTADOS).map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Mes Inicio</label>
                    <select value={form.mesInicio} onChange={e => setForm(p => ({ ...p, mesInicio: parseInt(e.target.value) }))}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                      {MESES_FULL.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Mes Fin</label>
                    <select value={form.mesFin} onChange={e => setForm(p => ({ ...p, mesFin: parseInt(e.target.value) }))}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                      {MESES_FULL.map((m, i) => <option key={i} value={i}>{m}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Responsable</label>
                    <input type="text" value={form.responsable} onChange={e => setForm(p => ({ ...p, responsable: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Fecha Límite</label>
                    <input type="date" value={form.fechaLimite} onChange={e => setForm(p => ({ ...p, fechaLimite: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Recurso Necesario</label>
                  <input type="text" value={form.recurso} onChange={e => setForm(p => ({ ...p, recurso: e.target.value }))}
                    placeholder="Ej: Salón, instructor externo, material..."
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Indicador de Cumplimiento</label>
                  <input type="text" value={form.indicador} onChange={e => setForm(p => ({ ...p, indicador: e.target.value }))}
                    placeholder="Ej: % de trabajadores capacitados"
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Observaciones</label>
                  <textarea value={form.observaciones} onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm h-16 resize-none" />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium">Cancelar</button>
                <button onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> {editingId ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="text-center text-xs text-gray-400 py-2">
        Plan de Trabajo Anual conforme al Decreto 1072/2015 Art. 2.2.4.6.17
      </div>
    </div>
  );
};

export default AnnualPlan;
