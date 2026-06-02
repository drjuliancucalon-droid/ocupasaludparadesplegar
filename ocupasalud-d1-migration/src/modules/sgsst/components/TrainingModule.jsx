/**
 * TrainingModule.jsx
 * Módulo de Gestión de Capacitaciones del SG-SST
 * Res. 4927/2016, Decreto 1072/2015 Art. 2.2.4.6.11
 */

import React, { useState, useMemo } from 'react';
import {
  BookOpen, Plus, Edit3, Trash2, Users, Calendar, Clock,
  CheckCircle2, Award, Printer, Search, Filter, X, Save,
  FileText, ClipboardCheck, ChevronDown, ChevronUp, Star,
  UserCheck, AlertTriangle, Info, BarChart3, Eye
} from 'lucide-react';
import { capacitacionesCRUD, CATALOGO_CAPACITACIONES } from '../services/sgsstService';

const TrainingModule = () => {
  const [capacitaciones, setCapacitaciones] = useState(capacitacionesCRUD.getAll());
  const [activeTab, setActiveTab] = useState('programadas'); // programadas | catalogo | certificados
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showAttendance, setShowAttendance] = useState(null);
  const [showQuiz, setShowQuiz] = useState(null);
  const [showCertificate, setShowCertificate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('');

  const emptyForm = {
    nombre: '',
    tema: '',
    descripcion: '',
    instructor: '',
    institucion: '',
    fecha: '',
    horaInicio: '',
    horaFin: '',
    duracionHoras: 2,
    lugar: '',
    estado: 'Programada',
    asistentes: [],
    nuevoAsistente: '',
    evaluacionPre: [],
    evaluacionPost: [],
    normaReferencia: '',
    materialEntregado: '',
    observaciones: '',
  };
  const [form, setForm] = useState({ ...emptyForm });

  // Quiz state
  const [quizForm, setQuizForm] = useState({
    preguntas: [
      { pregunta: '', opciones: ['', '', '', ''], respuestaCorrecta: 0 },
    ],
  });

  const refresh = () => setCapacitaciones(capacitacionesCRUD.getAll());

  const filteredCaps = useMemo(() => {
    return capacitaciones.filter(c => {
      if (filterEstado && c.estado !== filterEstado) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (c.nombre || '').toLowerCase().includes(term) ||
          (c.tema || '').toLowerCase().includes(term) ||
          (c.instructor || '').toLowerCase().includes(term);
      }
      return true;
    });
  }, [capacitaciones, filterEstado, searchTerm]);

  const stats = useMemo(() => {
    const total = capacitaciones.length;
    const completadas = capacitaciones.filter(c => c.estado === 'Completado').length;
    const programadas = capacitaciones.filter(c => c.estado === 'Programada').length;
    const totalAsistentes = capacitaciones.reduce((sum, c) => sum + (c.asistentes?.length || 0), 0);
    const totalHoras = capacitaciones.filter(c => c.estado === 'Completado').reduce((sum, c) => sum + (c.duracionHoras || 0), 0);
    return { total, completadas, programadas, totalAsistentes, totalHoras, porcentaje: total > 0 ? Math.round((completadas / total) * 100) : 0 };
  }, [capacitaciones]);

  const handleSave = () => {
    if (!form.nombre && !form.tema) { alert('El nombre o tema de la capacitación es obligatorio'); return; }
    const data = { ...form };
    delete data.nuevoAsistente;
    if (editingId) {
      capacitacionesCRUD.update(editingId, data);
    } else {
      capacitacionesCRUD.create(data);
    }
    refresh();
    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm });
  };

  const handleEdit = (cap) => {
    setForm({ ...emptyForm, ...cap });
    setEditingId(cap.id);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Eliminar esta capacitación?')) {
      capacitacionesCRUD.remove(id);
      refresh();
    }
  };

  const addAsistente = () => {
    if (form.nuevoAsistente?.trim()) {
      setForm(prev => ({
        ...prev,
        asistentes: [...(prev.asistentes || []), { nombre: prev.nuevoAsistente.trim(), firma: false, calificacionPre: null, calificacionPost: null }],
        nuevoAsistente: '',
      }));
    }
  };

  const toggleFirma = (capId, asistenteIdx) => {
    const cap = capacitaciones.find(c => c.id === capId);
    if (!cap) return;
    const asistentes = [...(cap.asistentes || [])];
    asistentes[asistenteIdx] = { ...asistentes[asistenteIdx], firma: !asistentes[asistenteIdx].firma, horaFirma: new Date().toISOString() };
    capacitacionesCRUD.update(capId, { asistentes });
    refresh();
  };

  const scheduleFromCatalog = (catalogItem) => {
    setForm({
      ...emptyForm,
      nombre: catalogItem.nombre,
      duracionHoras: catalogItem.duracionHoras,
      normaReferencia: catalogItem.norma,
    });
    setEditingId(null);
    setShowForm(true);
  };

  const printCertificate = (cap, asistente) => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Certificado de Capacitación</title>
      <style>
        body { font-family: 'Georgia', serif; text-align: center; padding: 60px; color: #333; }
        .border-frame { border: 3px double #1e40af; padding: 50px; margin: 20px; }
        h1 { font-size: 28pt; color: #1e40af; margin-bottom: 10px; font-weight: normal; }
        h2 { font-size: 14pt; color: #666; font-weight: normal; margin-bottom: 30px; }
        .name { font-size: 24pt; font-weight: bold; color: #111; margin: 20px 0; border-bottom: 2px solid #1e40af; display: inline-block; padding: 0 30px 5px; }
        .topic { font-size: 16pt; margin: 20px 0; }
        .details { font-size: 11pt; color: #555; margin: 5px 0; }
        .signatures { display: flex; justify-content: space-around; margin-top: 60px; }
        .sig { text-align: center; }
        .sig-line { border-top: 1px solid #333; width: 200px; margin: 0 auto; padding-top: 5px; font-size: 10pt; }
        .footer { margin-top: 30px; font-size: 9pt; color: #999; }
        @media print { @page { size: landscape; margin: 0; } body { padding: 30px; } }
      </style></head><body>
        <div class="border-frame">
          <h1>CERTIFICADO DE CAPACITACIÓN</h1>
          <h2>Sistema de Gestión de Seguridad y Salud en el Trabajo</h2>
          <p class="details">Se certifica que</p>
          <p class="name">${asistente.nombre}</p>
          <p class="details">completó satisfactoriamente la capacitación en</p>
          <p class="topic"><strong>${cap.nombre || cap.tema}</strong></p>
          <p class="details">con una intensidad de <strong>${cap.duracionHoras || '—'} horas</strong></p>
          <p class="details">realizada el <strong>${cap.fecha ? new Date(cap.fecha).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' }) : '—'}</strong></p>
          ${cap.instructor ? `<p class="details">Instructor: <strong>${cap.instructor}</strong></p>` : ''}
          ${cap.institucion ? `<p class="details">Institución: <strong>${cap.institucion}</strong></p>` : ''}
          <div class="signatures">
            <div class="sig"><div class="sig-line">Instructor</div></div>
            <div class="sig"><div class="sig-line">Responsable SST</div></div>
            <div class="sig"><div class="sig-line">Representante Legal</div></div>
          </div>
          <p class="footer">
            ${cap.normaReferencia ? `Ref. Normativa: ${cap.normaReferencia} | ` : ''}
            Decreto 1072/2015 Art. 2.2.4.6.11
          </p>
        </div>
        <script>window.print();</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const estadoColors = {
    'Programada': 'bg-blue-100 text-blue-700',
    'En curso': 'bg-yellow-100 text-yellow-700',
    'Completado': 'bg-green-100 text-green-700',
    'Cancelada': 'bg-red-100 text-red-700',
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-green-600" />
            Gestión de Capacitaciones
          </h1>
          <p className="text-sm text-gray-500">Res. 4927/2016, Decreto 1072/2015 Art. 2.2.4.6.11</p>
        </div>
        <button onClick={() => { setForm({ ...emptyForm }); setEditingId(null); setShowForm(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Programar Capacitación
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Programadas', value: stats.programadas, color: 'text-blue-600' },
          { label: 'Completadas', value: stats.completadas, color: 'text-green-600' },
          { label: 'Cumplimiento', value: `${stats.porcentaje}%`, color: stats.porcentaje >= 80 ? 'text-green-600' : 'text-yellow-600' },
          { label: 'Total Asistentes', value: stats.totalAsistentes, color: 'text-purple-600' },
          { label: 'Horas Formación', value: stats.totalHoras, color: 'text-teal-600' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-lg border p-3 text-center">
            <p className={`text-2xl font-bold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-500">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex border-b">
        {[
          { id: 'programadas', label: 'Capacitaciones', icon: Calendar },
          { id: 'catalogo', label: 'Catálogo Normativo', icon: BookOpen },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
              activeTab === tab.id ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Capacitaciones */}
      {activeTab === 'programadas' && (
        <div className="space-y-4">
          {/* Filtros */}
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar capacitaciones..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" />
            </div>
            <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
              <option value="">Todos los estados</option>
              {Object.keys(estadoColors).map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          {/* Lista */}
          {filteredCaps.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center">
              <BookOpen className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No hay capacitaciones registradas</p>
              <p className="text-sm text-gray-400 mt-1">Use el catálogo normativo para programar capacitaciones obligatorias</p>
            </div>
          ) : (
            filteredCaps.map(cap => (
              <div key={cap.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${estadoColors[cap.estado] || 'bg-gray-100 text-gray-700'}`}>
                          {cap.estado}
                        </span>
                        {cap.normaReferencia && (
                          <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 text-blue-600">{cap.normaReferencia}</span>
                        )}
                      </div>
                      <h3 className="font-semibold text-gray-800">{cap.nombre || cap.tema}</h3>
                      {cap.descripcion && <p className="text-sm text-gray-500 mt-1">{cap.descripcion}</p>}
                      <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                        {cap.fecha && <span><Calendar className="w-3 h-3 inline mr-1" />{new Date(cap.fecha).toLocaleDateString('es-CO')}</span>}
                        {cap.instructor && <span><UserCheck className="w-3 h-3 inline mr-1" />{cap.instructor}</span>}
                        <span><Clock className="w-3 h-3 inline mr-1" />{cap.duracionHoras}h</span>
                        <span><Users className="w-3 h-3 inline mr-1" />{cap.asistentes?.length || 0} asistentes</span>
                      </div>
                    </div>
                    <div className="flex gap-1 flex-shrink-0">
                      <button onClick={() => setShowAttendance(showAttendance === cap.id ? null : cap.id)}
                        className="p-2 text-purple-500 hover:bg-purple-50 rounded-lg" title="Asistencia">
                        <ClipboardCheck className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleEdit(cap)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button onClick={() => handleDelete(cap.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Asistencia */}
                  {showAttendance === cap.id && (
                    <div className="mt-4 pt-4 border-t">
                      <h4 className="font-semibold text-gray-700 mb-3 flex items-center gap-2">
                        <ClipboardCheck className="w-4 h-4 text-purple-500" /> Control de Asistencia
                      </h4>
                      {(cap.asistentes || []).length === 0 ? (
                        <p className="text-sm text-gray-400">No hay asistentes registrados</p>
                      ) : (
                        <div className="space-y-2 max-h-60 overflow-y-auto">
                          {cap.asistentes.map((asistente, idx) => (
                            <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                              <div className="flex items-center gap-3">
                                <button onClick={() => toggleFirma(cap.id, idx)}
                                  className={`w-6 h-6 rounded-full flex items-center justify-center ${asistente.firma ? 'bg-green-500 text-white' : 'bg-gray-200 text-gray-400'}`}>
                                  {asistente.firma && <CheckCircle2 className="w-4 h-4" />}
                                </button>
                                <span className="text-sm text-gray-700">{asistente.nombre}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                {asistente.firma && <span className="text-xs text-green-600">Firmó</span>}
                                <button onClick={() => printCertificate(cap, asistente)}
                                  className="p-1 text-blue-500 hover:bg-blue-50 rounded" title="Generar certificado">
                                  <Award className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                      <p className="text-xs text-gray-400 mt-2">
                        {(cap.asistentes || []).filter(a => a.firma).length} de {(cap.asistentes || []).length} asistentes firmaron
                      </p>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Tab: Catálogo */}
      {activeTab === 'catalogo' && (
        <div className="space-y-3">
          <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
            <p className="text-sm text-blue-700">
              <Info className="w-4 h-4 inline mr-1" />
              Catálogo de capacitaciones obligatorias según Res. 0312/2019, Res. 4927/2016 y normatividad vigente.
              Haga clic en "Programar" para agregar al plan.
            </p>
          </div>
          {CATALOGO_CAPACITACIONES.map(item => (
            <div key={item.id} className="bg-white rounded-xl shadow-sm border p-4 flex items-center gap-4">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${item.obligatoria ? 'bg-red-100' : 'bg-gray-100'}`}>
                <BookOpen className={`w-5 h-5 ${item.obligatoria ? 'text-red-600' : 'text-gray-500'}`} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold text-gray-800">{item.nombre}</h3>
                  {item.obligatoria && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">Obligatoria</span>}
                </div>
                <div className="flex flex-wrap gap-3 mt-1 text-xs text-gray-500">
                  <span><Clock className="w-3 h-3 inline mr-1" />{item.duracionHoras}h</span>
                  <span><Calendar className="w-3 h-3 inline mr-1" />{item.frecuencia}</span>
                  <span><FileText className="w-3 h-3 inline mr-1" />{item.norma}</span>
                  {item.requiereRiesgo && <span className="text-orange-600"><AlertTriangle className="w-3 h-3 inline mr-1" />Req: {item.requiereRiesgo.join(', ')}</span>}
                </div>
              </div>
              <button onClick={() => scheduleFromCatalog(item)}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium flex items-center gap-1 flex-shrink-0">
                <Plus className="w-4 h-4" /> Programar
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <BookOpen className="w-6 h-6 text-green-600" />
                {editingId ? 'Editar Capacitación' : 'Programar Capacitación'}
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Nombre / Tema *</label>
                  <input type="text" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                    placeholder="Ej: Inducción en SST" className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Descripción</label>
                  <textarea value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm h-16 resize-none" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Instructor</label>
                    <input type="text" value={form.instructor} onChange={e => setForm(p => ({ ...p, instructor: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Institución</label>
                    <input type="text" value={form.institucion} onChange={e => setForm(p => ({ ...p, institucion: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Fecha</label>
                    <input type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Duración (horas)</label>
                    <input type="number" value={form.duracionHoras} onChange={e => setForm(p => ({ ...p, duracionHoras: parseInt(e.target.value) || 0 }))}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Estado</label>
                    <select value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                      {Object.keys(estadoColors).map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Lugar</label>
                  <input type="text" value={form.lugar} onChange={e => setForm(p => ({ ...p, lugar: e.target.value }))}
                    placeholder="Ej: Sala de reuniones, Virtual (Teams)" className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Referencia Normativa</label>
                  <input type="text" value={form.normaReferencia} onChange={e => setForm(p => ({ ...p, normaReferencia: e.target.value }))}
                    placeholder="Ej: Dec. 1072/2015 Art. 2.2.4.6.11" className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                </div>

                {/* Asistentes */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-2">Asistentes</h3>
                  <div className="flex gap-2 mb-2">
                    <input type="text" value={form.nuevoAsistente || ''} onChange={e => setForm(p => ({ ...p, nuevoAsistente: e.target.value }))}
                      placeholder="Nombre del asistente" onKeyDown={e => e.key === 'Enter' && addAsistente()}
                      className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                    <button onClick={addAsistente} className="px-3 py-2 bg-green-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /></button>
                  </div>
                  <div className="space-y-1 max-h-32 overflow-y-auto">
                    {(form.asistentes || []).map((a, i) => (
                      <div key={i} className="flex items-center justify-between p-2 bg-white rounded">
                        <span className="text-sm">{a.nombre || a}</span>
                        <button onClick={() => setForm(p => ({ ...p, asistentes: p.asistentes.filter((_, idx) => idx !== i) }))}
                          className="text-red-400 hover:text-red-600"><X className="w-3 h-3" /></button>
                      </div>
                    ))}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">{(form.asistentes || []).length} asistente(s)</p>
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
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> {editingId ? 'Actualizar' : 'Guardar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="text-center text-xs text-gray-400 py-2">
        Gestión de capacitaciones conforme a Res. 4927/2016 y Decreto 1072/2015 Art. 2.2.4.6.11
      </div>
    </div>
  );
};

export default TrainingModule;
