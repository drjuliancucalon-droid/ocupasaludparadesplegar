/**
 * InspectionChecklist.jsx
 * Sistema Digital de Inspecciones de Seguridad
 * Decreto 1072/2015 Art. 2.2.4.6.31
 */

import React, { useState, useMemo } from 'react';
import {
  ClipboardCheck, Plus, Edit3, Trash2, Search, Filter, X, Save,
  CheckCircle2, XCircle, MinusCircle, Calendar, Clock, Users,
  AlertTriangle, Printer, ChevronDown, ChevronUp, Eye, Camera,
  FileText, Info, MapPin, RefreshCw, BarChart3
} from 'lucide-react';
import { inspeccionesCRUD, PLANTILLAS_INSPECCION } from '../services/sgsstService';

const PRIORIDAD_COLORS = {
  'Crítico': 'bg-red-100 text-red-800 border-red-200',
  'Mayor': 'bg-orange-100 text-orange-800 border-orange-200',
  'Menor': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'Observación': 'bg-blue-100 text-blue-800 border-blue-200',
};

const ESTADOS = {
  'Pendiente': 'bg-gray-100 text-gray-700',
  'En progreso': 'bg-blue-100 text-blue-700',
  'Completado': 'bg-green-100 text-green-700',
};

const InspectionChecklist = () => {
  const [inspecciones, setInspecciones] = useState(inspeccionesCRUD.getAll());
  const [activeTab, setActiveTab] = useState('inspecciones'); // inspecciones | plantillas | nueva
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [selectedPlantilla, setSelectedPlantilla] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [showExecute, setShowExecute] = useState(null);

  const emptyForm = {
    nombre: '',
    area: '',
    tipoArea: '',
    inspector: '',
    fecha: new Date().toISOString().split('T')[0],
    estado: 'Pendiente',
    items: [],
    observacionesGenerales: '',
    accionesCorrectivas: [],
    nuevaAccion: '',
    frecuencia: 'Mensual',
    proximaFecha: '',
  };
  const [form, setForm] = useState({ ...emptyForm });

  const refresh = () => setInspecciones(inspeccionesCRUD.getAll());

  const filteredInspecciones = useMemo(() => {
    return inspecciones.filter(i => {
      if (filterEstado && i.estado !== filterEstado) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (i.nombre || '').toLowerCase().includes(term) ||
          (i.area || '').toLowerCase().includes(term) ||
          (i.inspector || '').toLowerCase().includes(term);
      }
      return true;
    }).sort((a, b) => new Date(b.fecha || b.createdAt) - new Date(a.fecha || a.createdAt));
  }, [inspecciones, filterEstado, searchTerm]);

  const stats = useMemo(() => {
    const total = inspecciones.length;
    const completadas = inspecciones.filter(i => i.estado === 'Completado').length;
    const totalItems = inspecciones.reduce((sum, i) => sum + (i.items?.length || 0), 0);
    const hallazgos = inspecciones.reduce((sum, i) => sum + (i.items?.filter(it => it.resultado === 'fail').length || 0), 0);
    const criticos = inspecciones.reduce((sum, i) => sum + (i.items?.filter(it => it.resultado === 'fail' && it.prioridad === 'Crítico').length || 0), 0);
    return { total, completadas, totalItems, hallazgos, criticos };
  }, [inspecciones]);

  const loadPlantilla = (tipoArea) => {
    const plantillaItems = PLANTILLAS_INSPECCION[tipoArea] || [];
    const items = plantillaItems.map(p => ({
      ...p,
      resultado: null, // null | 'check' | 'fail' | 'na'
      observacion: '',
      fotoRef: '',
    }));
    setForm(prev => ({
      ...prev,
      tipoArea,
      nombre: `Inspección de ${tipoArea}`,
      items,
    }));
    setSelectedPlantilla(tipoArea);
    setActiveTab('nueva');
  };

  const addCustomItem = () => {
    setForm(prev => ({
      ...prev,
      items: [...prev.items, { id: `custom_${Date.now()}`, item: '', prioridad: 'Menor', resultado: null, observacion: '', fotoRef: '' }],
    }));
  };

  const updateItem = (idx, field, value) => {
    setForm(prev => {
      const items = [...prev.items];
      items[idx] = { ...items[idx], [field]: value };
      return { ...prev, items };
    });
  };

  const removeItem = (idx) => {
    setForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== idx),
    }));
  };

  const handleSave = () => {
    if (!form.nombre) { alert('El nombre de la inspección es obligatorio'); return; }
    const data = { ...form };
    delete data.nuevaAccion;

    // Determine estado
    const allChecked = data.items.length > 0 && data.items.every(i => i.resultado !== null);
    if (allChecked && data.estado === 'Pendiente') data.estado = 'Completado';

    if (editingId) {
      inspeccionesCRUD.update(editingId, data);
    } else {
      inspeccionesCRUD.create(data);
    }
    refresh();
    setShowForm(false);
    setActiveTab('inspecciones');
    setEditingId(null);
    setForm({ ...emptyForm });
  };

  const handleEdit = (insp) => {
    setForm({ ...emptyForm, ...insp });
    setEditingId(insp.id);
    setActiveTab('nueva');
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Eliminar esta inspección?')) { inspeccionesCRUD.remove(id); refresh(); }
  };

  const executeInspection = (insp) => {
    setForm({ ...emptyForm, ...insp });
    setEditingId(insp.id);
    setActiveTab('nueva');
  };

  const addAccionCorrectiva = () => {
    if (form.nuevaAccion?.trim()) {
      setForm(prev => ({
        ...prev,
        accionesCorrectivas: [...(prev.accionesCorrectivas || []), {
          descripcion: prev.nuevaAccion.trim(),
          responsable: '',
          fechaLimite: '',
          estado: 'Pendiente',
          prioridad: 'Mayor',
        }],
        nuevaAccion: '',
      }));
    }
  };

  const handlePrintReport = (insp) => {
    const checksOk = insp.items?.filter(i => i.resultado === 'check').length || 0;
    const fails = insp.items?.filter(i => i.resultado === 'fail') || [];
    const na = insp.items?.filter(i => i.resultado === 'na').length || 0;
    const total = insp.items?.length || 0;

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Reporte de Inspección - ${insp.nombre}</title>
      <style>
        body { font-family: Arial; padding: 30px; font-size: 10pt; }
        h1 { font-size: 14pt; text-align: center; }
        h2 { font-size: 12pt; border-bottom: 1px solid #ccc; padding-bottom: 5px; }
        table { width: 100%; border-collapse: collapse; margin: 10px 0; }
        th, td { border: 1px solid #999; padding: 4px 6px; text-align: left; }
        th { background: #1e40af; color: white; font-size: 9pt; }
        .ok { color: green; font-weight: bold; }
        .fail { color: red; font-weight: bold; }
        .na { color: gray; }
        .summary { display: flex; gap: 20px; margin: 10px 0; }
        .summary-item { padding: 10px; background: #f3f4f6; border-radius: 8px; text-align: center; flex: 1; }
        @media print { @page { margin: 1.5cm; } }
      </style></head><body>
        <h1>INFORME DE INSPECCIÓN DE SEGURIDAD</h1>
        <p style="text-align:center;">Decreto 1072/2015 Art. 2.2.4.6.31</p>
        <table>
          <tr><td><strong>Inspección:</strong> ${insp.nombre}</td><td><strong>Fecha:</strong> ${insp.fecha ? new Date(insp.fecha).toLocaleDateString('es-CO') : '—'}</td></tr>
          <tr><td><strong>Área:</strong> ${insp.area || insp.tipoArea || '—'}</td><td><strong>Inspector:</strong> ${insp.inspector || '—'}</td></tr>
        </table>
        <div class="summary">
          <div class="summary-item"><strong>${checksOk}</strong><br>Conforme</div>
          <div class="summary-item"><strong style="color:red">${fails.length}</strong><br>No Conforme</div>
          <div class="summary-item"><strong>${na}</strong><br>N/A</div>
          <div class="summary-item"><strong>${total > 0 ? Math.round((checksOk / (total - na || 1)) * 100) : 0}%</strong><br>Cumplimiento</div>
        </div>
        <h2>Detalle de la Inspección</h2>
        <table>
          <thead><tr><th>#</th><th>Ítem</th><th>Prioridad</th><th>Resultado</th><th>Observación</th></tr></thead>
          <tbody>${(insp.items || []).map((item, i) => `
            <tr>
              <td>${i + 1}</td>
              <td>${item.item}</td>
              <td>${item.prioridad}</td>
              <td class="${item.resultado === 'check' ? 'ok' : item.resultado === 'fail' ? 'fail' : 'na'}">
                ${item.resultado === 'check' ? '✓ Conforme' : item.resultado === 'fail' ? '✗ No Conforme' : 'N/A'}
              </td>
              <td>${item.observacion || '-'}</td>
            </tr>
          `).join('')}</tbody>
        </table>
        ${fails.length > 0 ? `
          <h2>Hallazgos No Conformes</h2>
          <table>
            <thead><tr><th>Hallazgo</th><th>Prioridad</th><th>Observación</th></tr></thead>
            <tbody>${fails.map(f => `
              <tr><td>${f.item}</td><td>${f.prioridad}</td><td>${f.observacion || '-'}</td></tr>
            `).join('')}</tbody>
          </table>
        ` : ''}
        ${insp.observacionesGenerales ? `<h2>Observaciones Generales</h2><p>${insp.observacionesGenerales}</p>` : ''}
        <script>window.print();</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  const resultIcons = { check: CheckCircle2, fail: XCircle, na: MinusCircle };
  const resultColors = { check: 'text-green-600', fail: 'text-red-600', na: 'text-gray-400' };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <ClipboardCheck className="w-7 h-7 text-purple-600" />
            Inspecciones de Seguridad
          </h1>
          <p className="text-sm text-gray-500">Decreto 1072/2015 Art. 2.2.4.6.31</p>
        </div>
        <button onClick={() => { setForm({ ...emptyForm }); setEditingId(null); setActiveTab('plantillas'); }}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium">
          <Plus className="w-4 h-4" /> Nueva Inspección
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        {[
          { label: 'Total', value: stats.total, color: 'text-gray-800' },
          { label: 'Completadas', value: stats.completadas, color: 'text-green-600' },
          { label: 'Ítems evaluados', value: stats.totalItems, color: 'text-blue-600' },
          { label: 'Hallazgos', value: stats.hallazgos, color: 'text-orange-600' },
          { label: 'Críticos', value: stats.criticos, color: 'text-red-600' },
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
          { id: 'inspecciones', label: 'Inspecciones', icon: ClipboardCheck },
          { id: 'plantillas', label: 'Plantillas', icon: FileText },
          { id: 'nueva', label: selectedPlantilla ? `Ejecutar: ${selectedPlantilla}` : (editingId ? 'Editar' : 'Nueva'), icon: Edit3 },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 text-sm font-medium border-b-2 ${
              activeTab === tab.id ? 'border-purple-600 text-purple-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: Inspecciones */}
      {activeTab === 'inspecciones' && (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-3 items-center">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
                placeholder="Buscar inspecciones..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" />
            </div>
            <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
              <option value="">Todos los estados</option>
              {Object.keys(ESTADOS).map(e => <option key={e} value={e}>{e}</option>)}
            </select>
          </div>

          {filteredInspecciones.length === 0 ? (
            <div className="bg-white rounded-xl border p-12 text-center">
              <ClipboardCheck className="w-16 h-16 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500">No hay inspecciones registradas</p>
              <p className="text-sm text-gray-400 mt-1">Use las plantillas para iniciar una inspección rápida</p>
            </div>
          ) : (
            filteredInspecciones.map(insp => {
              const totalItems = insp.items?.length || 0;
              const checksOk = insp.items?.filter(i => i.resultado === 'check').length || 0;
              const fails = insp.items?.filter(i => i.resultado === 'fail').length || 0;
              const na = insp.items?.filter(i => i.resultado === 'na').length || 0;
              const evaluated = totalItems - (insp.items?.filter(i => i.resultado === null).length || 0);
              const cumplimiento = (totalItems - na) > 0 ? Math.round((checksOk / (totalItems - na)) * 100) : 0;

              return (
                <div key={insp.id} className="bg-white rounded-xl shadow-sm border overflow-hidden">
                  <div className="p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADOS[insp.estado] || ESTADOS.Pendiente}`}>{insp.estado}</span>
                          {insp.tipoArea && <span className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">{insp.tipoArea}</span>}
                        </div>
                        <h3 className="font-semibold text-gray-800">{insp.nombre || 'Inspección sin nombre'}</h3>
                        <div className="flex flex-wrap gap-4 mt-2 text-xs text-gray-500">
                          {insp.fecha && <span><Calendar className="w-3 h-3 inline mr-1" />{new Date(insp.fecha).toLocaleDateString('es-CO')}</span>}
                          {insp.inspector && <span><Users className="w-3 h-3 inline mr-1" />{insp.inspector}</span>}
                          {insp.area && <span><MapPin className="w-3 h-3 inline mr-1" />{insp.area}</span>}
                        </div>
                        {/* Mini progress */}
                        <div className="flex items-center gap-3 mt-2">
                          <div className="flex-1 max-w-[200px] bg-gray-200 rounded-full h-2">
                            <div className={`h-2 rounded-full ${cumplimiento >= 80 ? 'bg-green-500' : cumplimiento >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                              style={{ width: `${cumplimiento}%` }} />
                          </div>
                          <span className="text-xs font-medium text-gray-600">{cumplimiento}%</span>
                          <span className="text-xs text-gray-400">
                            ✓{checksOk} ✗{fails} —{na}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-1 flex-shrink-0">
                        {insp.estado !== 'Completado' && (
                          <button onClick={() => executeInspection(insp)} className="p-2 text-purple-500 hover:bg-purple-50 rounded-lg" title="Ejecutar">
                            <Edit3 className="w-4 h-4" />
                          </button>
                        )}
                        <button onClick={() => handlePrintReport(insp)} className="p-2 text-gray-400 hover:bg-gray-100 rounded-lg" title="Imprimir reporte">
                          <Printer className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(insp.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* Tab: Plantillas */}
      {activeTab === 'plantillas' && (
        <div className="space-y-4">
          <div className="p-3 bg-purple-50 border border-purple-200 rounded-lg">
            <p className="text-sm text-purple-700">
              <Info className="w-4 h-4 inline mr-1" />
              Seleccione una plantilla predefinida o cree un checklist personalizado.
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(PLANTILLAS_INSPECCION).map(([tipo, items]) => (
              <div key={tipo} className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                    <ClipboardCheck className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-800">{tipo}</h3>
                    <p className="text-xs text-gray-500">{items.length} ítems</p>
                  </div>
                </div>
                <div className="space-y-1 mb-3 max-h-32 overflow-y-auto">
                  {items.slice(0, 5).map(item => (
                    <div key={item.id} className="flex items-center gap-2 text-xs text-gray-600">
                      <span className={`w-1.5 h-1.5 rounded-full ${item.prioridad === 'Crítico' ? 'bg-red-500' : item.prioridad === 'Mayor' ? 'bg-orange-500' : 'bg-yellow-500'}`} />
                      <span className="truncate">{item.item}</span>
                    </div>
                  ))}
                  {items.length > 5 && <p className="text-xs text-gray-400">...y {items.length - 5} ítems más</p>}
                </div>
                <button onClick={() => loadPlantilla(tipo)}
                  className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium">
                  Usar Plantilla
                </button>
              </div>
            ))}
            {/* Custom */}
            <div className="bg-white rounded-xl shadow-sm border p-5 hover:shadow-md transition-shadow border-dashed">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center">
                  <Plus className="w-5 h-5 text-gray-500" />
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">Personalizado</h3>
                  <p className="text-xs text-gray-500">Crear checklist desde cero</p>
                </div>
              </div>
              <p className="text-sm text-gray-500 mb-3">Cree un checklist personalizado agregando sus propios ítems de inspección.</p>
              <button onClick={() => { setForm({ ...emptyForm }); setSelectedPlantilla(null); setEditingId(null); setActiveTab('nueva'); }}
                className="w-full px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 text-sm font-medium">
                Crear Personalizado
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Nueva / Ejecutar */}
      {activeTab === 'nueva' && (
        <div className="space-y-4">
          <div className="bg-white rounded-xl shadow-sm border p-6 space-y-4">
            {/* Info básica */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="text-sm font-medium text-gray-700">Nombre de la Inspección *</label>
                <input type="text" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Área / Ubicación</label>
                <input type="text" value={form.area} onChange={e => setForm(p => ({ ...p, area: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Inspector</label>
                <input type="text" value={form.inspector} onChange={e => setForm(p => ({ ...p, inspector: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Fecha</label>
                <input type="date" value={form.fecha} onChange={e => setForm(p => ({ ...p, fecha: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Frecuencia</label>
                <select value={form.frecuencia} onChange={e => setForm(p => ({ ...p, frecuencia: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                  {['Diaria', 'Semanal', 'Quincenal', 'Mensual', 'Bimestral', 'Trimestral', 'Semestral', 'Anual', 'Única'].map(f =>
                    <option key={f} value={f}>{f}</option>
                  )}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Próxima Inspección</label>
                <input type="date" value={form.proximaFecha} onChange={e => setForm(p => ({ ...p, proximaFecha: e.target.value }))}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
              </div>
            </div>

            {/* Checklist Items */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-700">Ítems de Inspección ({form.items.length})</h3>
                <button onClick={addCustomItem}
                  className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-sm font-medium hover:bg-purple-200">
                  <Plus className="w-3 h-3" /> Agregar Ítem
                </button>
              </div>
              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {form.items.map((item, idx) => (
                  <div key={idx} className={`p-3 rounded-lg border ${item.resultado === 'fail' ? 'bg-red-50 border-red-200' : item.resultado === 'check' ? 'bg-green-50 border-green-200' : 'bg-white'}`}>
                    <div className="flex items-start gap-3">
                      {/* Result buttons */}
                      <div className="flex gap-1 flex-shrink-0 mt-1">
                        {['check', 'fail', 'na'].map(result => {
                          const Icon = resultIcons[result];
                          const isActive = item.resultado === result;
                          return (
                            <button key={result} onClick={() => updateItem(idx, 'resultado', isActive ? null : result)}
                              className={`p-1.5 rounded-lg transition-colors ${isActive ? (result === 'check' ? 'bg-green-500 text-white' : result === 'fail' ? 'bg-red-500 text-white' : 'bg-gray-400 text-white') : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                              title={result === 'check' ? 'Conforme' : result === 'fail' ? 'No conforme' : 'No aplica'}>
                              <Icon className="w-4 h-4" />
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex-1 min-w-0">
                        {item.id?.startsWith('custom_') ? (
                          <input type="text" value={item.item} onChange={e => updateItem(idx, 'item', e.target.value)}
                            placeholder="Describa el ítem a inspeccionar..."
                            className="w-full px-2 py-1 border rounded text-sm" />
                        ) : (
                          <p className="text-sm text-gray-800">{item.item}</p>
                        )}
                        <div className="flex items-center gap-2 mt-1">
                          <span className={`text-xs px-2 py-0.5 rounded-full border ${PRIORIDAD_COLORS[item.prioridad] || PRIORIDAD_COLORS.Menor}`}>
                            {item.prioridad}
                          </span>
                          {item.id?.startsWith('custom_') && (
                            <select value={item.prioridad} onChange={e => updateItem(idx, 'prioridad', e.target.value)}
                              className="text-xs px-1 py-0.5 border rounded">
                              {Object.keys(PRIORIDAD_COLORS).map(p => <option key={p} value={p}>{p}</option>)}
                            </select>
                          )}
                        </div>
                        {(item.resultado === 'fail' || item.observacion) && (
                          <input type="text" value={item.observacion || ''} onChange={e => updateItem(idx, 'observacion', e.target.value)}
                            placeholder="Observación o hallazgo..."
                            className="w-full mt-2 px-2 py-1 border rounded text-xs text-gray-600" />
                        )}
                      </div>
                      <button onClick={() => removeItem(idx)} className="p-1 text-red-300 hover:text-red-500 flex-shrink-0">
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
              {form.items.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <ClipboardCheck className="w-12 h-12 mx-auto mb-2 opacity-50" />
                  <p>Agregue ítems al checklist o seleccione una plantilla</p>
                </div>
              )}
            </div>

            {/* Acciones correctivas */}
            <div className="p-4 bg-yellow-50 rounded-lg">
              <h3 className="font-semibold text-gray-700 mb-2">Acciones Correctivas</h3>
              <div className="flex gap-2 mb-2">
                <input type="text" value={form.nuevaAccion || ''} onChange={e => setForm(p => ({ ...p, nuevaAccion: e.target.value }))}
                  placeholder="Descripción de la acción correctiva..."
                  onKeyDown={e => e.key === 'Enter' && addAccionCorrectiva()}
                  className="flex-1 px-3 py-2 border rounded-lg text-sm" />
                <button onClick={addAccionCorrectiva} className="px-3 py-2 bg-yellow-600 text-white rounded-lg text-sm"><Plus className="w-4 h-4" /></button>
              </div>
              {(form.accionesCorrectivas || []).map((ac, i) => (
                <div key={i} className="flex items-center gap-2 p-2 bg-white rounded border mb-1">
                  <span className="text-sm flex-1">{ac.descripcion}</span>
                  <button onClick={() => setForm(p => ({ ...p, accionesCorrectivas: p.accionesCorrectivas.filter((_, idx) => idx !== i) }))}
                    className="text-red-400"><X className="w-3 h-3" /></button>
                </div>
              ))}
            </div>

            {/* Observaciones */}
            <div>
              <label className="text-sm font-medium text-gray-700">Observaciones Generales</label>
              <textarea value={form.observacionesGenerales} onChange={e => setForm(p => ({ ...p, observacionesGenerales: e.target.value }))}
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm h-16 resize-none" />
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button onClick={() => { setActiveTab('inspecciones'); setEditingId(null); setForm({ ...emptyForm }); }}
                className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium">Cancelar</button>
              <button onClick={handleSave}
                className="flex-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 text-sm font-medium flex items-center justify-center gap-2">
                <Save className="w-4 h-4" /> {editingId ? 'Actualizar' : 'Guardar'} Inspección
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="text-center text-xs text-gray-400 py-2">
        Inspecciones conforme al Decreto 1072/2015 Art. 2.2.4.6.31
      </div>
    </div>
  );
};

export default InspectionChecklist;
