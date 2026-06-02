/**
 * RiskMatrix.jsx
 * Matriz IPEVR — Identificación de Peligros, Evaluación y Valoración de Riesgos
 * Metodología GTC-45 (2012), Decreto 1072/2015 Art. 2.2.4.6.15
 */

import React, { useState, useMemo } from 'react';
import {
  AlertTriangle, Plus, Edit3, Trash2, Filter, Printer, Search,
  ChevronDown, ChevronUp, X, Save, Info, Eye, BarChart3,
  Download, Lightbulb, Shield, CheckCircle2, ArrowRight
} from 'lucide-react';
import {
  riesgosCRUD,
  CATEGORIAS_PELIGROS,
  CONTROLES_SUGERIDOS,
  NIVEL_DEFICIENCIA,
  NIVEL_EXPOSICION,
  NIVEL_CONSECUENCIA,
  calcularNivelProbabilidad,
  calcularNivelRiesgo,
  determinarAceptabilidad,
} from '../services/sgsstService';

const RiskMatrix = () => {
  const [riesgos, setRiesgos] = useState(riesgosCRUD.getAll());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [showHeatMap, setShowHeatMap] = useState(false);
  const [showControles, setShowControles] = useState(null);
  const [expandedRisk, setExpandedRisk] = useState(null);

  // Filtros
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterArea, setFilterArea] = useState('');
  const [filterNivel, setFilterNivel] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const emptyForm = {
    area: '',
    proceso: '',
    actividad: '',
    tarea: '',
    rutinaria: true,
    categoria: '',
    peligro: '',
    fuenteGeneradora: '',
    efectosPosibles: '',
    controlesExistentes: '',
    nivelDeficiencia: 'Medio',
    nivelExposicion: 'Ocasional',
    nivelConsecuencia: 'Leve',
    numExpuestos: 1,
    medidasIntervencion: '',
    responsable: '',
    fechaImplementacion: '',
  };

  const [form, setForm] = useState({ ...emptyForm });

  const refreshData = () => setRiesgos(riesgosCRUD.getAll());

  const riesgosCalculados = useMemo(() => {
    return riesgos.map(r => {
      const np = calcularNivelProbabilidad(r.nivelDeficiencia, r.nivelExposicion);
      const nr = calcularNivelRiesgo(np.valor, r.nivelConsecuencia);
      const aceptabilidad = determinarAceptabilidad(nr.nivel);
      return { ...r, np, nr, aceptabilidad };
    });
  }, [riesgos]);

  const filteredRiesgos = useMemo(() => {
    return riesgosCalculados.filter(r => {
      if (filterCategoria && r.categoria !== filterCategoria) return false;
      if (filterArea && r.area !== filterArea) return false;
      if (filterNivel && r.nr.nivel !== filterNivel) return false;
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return (
          (r.peligro || '').toLowerCase().includes(term) ||
          (r.area || '').toLowerCase().includes(term) ||
          (r.fuenteGeneradora || '').toLowerCase().includes(term) ||
          (r.efectosPosibles || '').toLowerCase().includes(term)
        );
      }
      return true;
    });
  }, [riesgosCalculados, filterCategoria, filterArea, filterNivel, searchTerm]);

  const areas = [...new Set(riesgos.map(r => r.area).filter(Boolean))];

  const handleSave = () => {
    if (!form.area || !form.categoria || !form.peligro) {
      alert('Complete los campos obligatorios: Área, Categoría y Peligro');
      return;
    }
    if (editingId) {
      riesgosCRUD.update(editingId, form);
    } else {
      riesgosCRUD.create(form);
    }
    refreshData();
    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm });
  };

  const handleEdit = (riesgo) => {
    setForm({ ...riesgo });
    setEditingId(riesgo.id);
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Está seguro de eliminar este riesgo de la matriz IPEVR?')) {
      riesgosCRUD.remove(id);
      refreshData();
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const rows = filteredRiesgos.map(r => `
      <tr>
        <td>${r.area}</td>
        <td>${r.categoria}</td>
        <td>${r.peligro}</td>
        <td>${r.fuenteGeneradora || '-'}</td>
        <td>${r.efectosPosibles || '-'}</td>
        <td>${r.controlesExistentes || '-'}</td>
        <td>${r.nivelDeficiencia}</td>
        <td>${r.nivelExposicion}</td>
        <td>${r.np.valor} (${r.np.nivel})</td>
        <td>${r.nivelConsecuencia}</td>
        <td style="background-color:${r.nr.color}; color:white; font-weight:bold;">${r.nr.valor} (${r.nr.nivel})</td>
        <td>${r.aceptabilidad.clase}</td>
        <td>${r.medidasIntervencion || '-'}</td>
      </tr>`).join('');

    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Matriz IPEVR - GTC-45</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; font-size: 9pt; }
        h1 { font-size: 14pt; text-align: center; }
        table { width: 100%; border-collapse: collapse; margin-top: 10px; }
        th, td { border: 1px solid #999; padding: 4px 6px; text-align: left; vertical-align: top; }
        th { background-color: #1e40af; color: white; font-size: 8pt; }
        td { font-size: 8pt; }
        @media print { @page { size: landscape; margin: 1cm; } }
      </style></head>
      <body>
        <h1>MATRIZ DE IDENTIFICACIÓN DE PELIGROS, EVALUACIÓN Y VALORACIÓN DE RIESGOS (IPEVR)</h1>
        <p style="text-align:center; font-size:10pt;">Metodología GTC-45 (2012) | Dec. 1072/2015 Art. 2.2.4.6.15</p>
        <table>
          <thead><tr>
            <th>Área</th><th>Categoría</th><th>Peligro</th><th>Fuente</th><th>Efectos</th>
            <th>Controles Existentes</th><th>ND</th><th>NE</th><th>NP</th><th>NC</th>
            <th>NR</th><th>Aceptabilidad</th><th>Medidas</th>
          </tr></thead>
          <tbody>${rows}</tbody>
        </table>
        <p style="margin-top:10px; font-size:8pt; color:#666;">
          ND: Nivel de Deficiencia | NE: Nivel de Exposición | NP: Nivel de Probabilidad | NC: Nivel de Consecuencia | NR: Nivel de Riesgo
        </p>
        <script>window.print();</script>
      </body></html>
    `);
    printWindow.document.close();
  };

  // Heat map data
  const heatMapData = useMemo(() => {
    const matrix = {};
    const ndLabels = ['Bajo', 'Medio', 'Alto', 'Muy Alto'];
    const ncLabels = ['Leve', 'Grave', 'Muy Grave', 'Mortal o Catastrófico'];
    ndLabels.forEach(nd => {
      matrix[nd] = {};
      ncLabels.forEach(nc => { matrix[nd][nc] = 0; });
    });
    riesgosCalculados.forEach(r => {
      const ndKey = r.nivelDeficiencia || 'Medio';
      const ncKey = r.nivelConsecuencia || 'Leve';
      if (matrix[ndKey] && matrix[ndKey][ncKey] !== undefined) matrix[ndKey][ncKey]++;
    });
    return { matrix, ndLabels, ncLabels };
  }, [riesgosCalculados]);

  const getHeatColor = (count, nd, nc) => {
    if (count === 0) return 'bg-gray-100 text-gray-400';
    const ndIdx = heatMapData.ndLabels.indexOf(nd);
    const ncIdx = heatMapData.ncLabels.indexOf(nc);
    const severity = ndIdx + ncIdx;
    if (severity >= 5) return 'bg-red-500 text-white';
    if (severity >= 3) return 'bg-orange-400 text-white';
    if (severity >= 2) return 'bg-yellow-400 text-gray-800';
    return 'bg-green-400 text-white';
  };

  const nrColors = { I: 'bg-red-100 text-red-800 border-red-200', II: 'bg-orange-100 text-orange-800 border-orange-200', III: 'bg-yellow-100 text-yellow-800 border-yellow-200', IV: 'bg-green-100 text-green-800 border-green-200' };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <AlertTriangle className="w-7 h-7 text-orange-500" />
            Matriz IPEVR
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Identificación de Peligros, Evaluación y Valoración de Riesgos — GTC-45 (2012)
          </p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => setShowHeatMap(!showHeatMap)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium ${showHeatMap ? 'bg-orange-600 text-white' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'}`}>
            <BarChart3 className="w-4 h-4" /> Mapa de Calor
          </button>
          <button onClick={handlePrint}
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 text-sm font-medium">
            <Printer className="w-4 h-4" /> Imprimir
          </button>
          <button onClick={() => { setForm({ ...emptyForm }); setEditingId(null); setShowForm(true); }}
            className="flex items-center gap-2 px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-sm font-medium">
            <Plus className="w-4 h-4" /> Agregar Riesgo
          </button>
        </div>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'No Aceptable (I)', count: riesgosCalculados.filter(r => r.nr.nivel === 'I').length, color: 'bg-red-500' },
          { label: 'No Aceptable (II)', count: riesgosCalculados.filter(r => r.nr.nivel === 'II').length, color: 'bg-orange-500' },
          { label: 'Mejorable (III)', count: riesgosCalculados.filter(r => r.nr.nivel === 'III').length, color: 'bg-yellow-500' },
          { label: 'Aceptable (IV)', count: riesgosCalculados.filter(r => r.nr.nivel === 'IV').length, color: 'bg-green-500' },
        ].map(item => (
          <div key={item.label} className="bg-white rounded-lg border p-3 flex items-center gap-3">
            <div className={`w-4 h-4 rounded-full ${item.color}`} />
            <div>
              <p className="text-xl font-bold text-gray-800">{item.count}</p>
              <p className="text-xs text-gray-500">{item.label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Heat Map */}
      {showHeatMap && (
        <div className="bg-white rounded-xl shadow-sm border p-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Mapa de Calor de Riesgos</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="p-2 text-sm font-medium text-gray-600 text-left">ND \ NC</th>
                  {heatMapData.ncLabels.map(nc => (
                    <th key={nc} className="p-2 text-xs font-medium text-gray-600 text-center">{nc}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[...heatMapData.ndLabels].reverse().map(nd => (
                  <tr key={nd}>
                    <td className="p-2 text-sm font-medium text-gray-600">{nd}</td>
                    {heatMapData.ncLabels.map(nc => (
                      <td key={nc} className="p-1">
                        <div className={`${getHeatColor(heatMapData.matrix[nd][nc], nd, nc)} rounded-lg p-3 text-center font-bold text-lg min-w-[60px]`}>
                          {heatMapData.matrix[nd][nc]}
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-xs text-gray-400 mt-3">Cada celda muestra la cantidad de riesgos identificados para la combinación de ND y NC.</p>
        </div>
      )}

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border p-4">
        <div className="flex flex-wrap gap-3 items-center">
          <Filter className="w-4 h-4 text-gray-500" />
          <div className="relative flex-1 min-w-[200px]">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
              placeholder="Buscar riesgos..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" />
          </div>
          <select value={filterCategoria} onChange={e => setFilterCategoria(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm">
            <option value="">Todas las categorías</option>
            {Object.keys(CATEGORIAS_PELIGROS).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={filterArea} onChange={e => setFilterArea(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm">
            <option value="">Todas las áreas</option>
            {areas.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <select value={filterNivel} onChange={e => setFilterNivel(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm">
            <option value="">Todos los niveles</option>
            <option value="I">I - No Aceptable</option>
            <option value="II">II - No Aceptable/Controlado</option>
            <option value="III">III - Mejorable</option>
            <option value="IV">IV - Aceptable</option>
          </select>
          {(filterCategoria || filterArea || filterNivel || searchTerm) && (
            <button onClick={() => { setFilterCategoria(''); setFilterArea(''); setFilterNivel(''); setSearchTerm(''); }}
              className="text-xs text-red-600 hover:text-red-800 flex items-center gap-1">
              <X className="w-3 h-3" /> Limpiar
            </button>
          )}
        </div>
        <p className="text-xs text-gray-400 mt-2">{filteredRiesgos.length} de {riesgosCalculados.length} riesgos</p>
      </div>

      {/* Lista de riesgos */}
      <div className="space-y-3">
        {filteredRiesgos.length === 0 ? (
          <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
            <AlertTriangle className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">No hay riesgos registrados</p>
            <p className="text-sm text-gray-400 mt-1">Agregue riesgos a la Matriz IPEVR usando el botón superior</p>
          </div>
        ) : (
          filteredRiesgos.map(riesgo => (
            <div key={riesgo.id} className={`bg-white rounded-xl shadow-sm border overflow-hidden`}>
              <div className="flex items-center gap-3 p-4 cursor-pointer hover:bg-gray-50" onClick={() => setExpandedRisk(expandedRisk === riesgo.id ? null : riesgo.id)}>
                <div className="w-3 h-full rounded-full flex-shrink-0" style={{ backgroundColor: riesgo.nr.color, minHeight: '40px' }} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${nrColors[riesgo.nr.nivel]}`}>
                      NR: {riesgo.nr.nivel} ({riesgo.nr.valor})
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-100 text-gray-700">{riesgo.categoria}</span>
                    <span className="text-xs text-gray-400">{riesgo.area}</span>
                  </div>
                  <p className="font-medium text-gray-800 mt-1 truncate">{riesgo.peligro}</p>
                  <p className="text-xs text-gray-500 truncate">{riesgo.fuenteGeneradora} → {riesgo.efectosPosibles}</p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <button onClick={e => { e.stopPropagation(); setShowControles(showControles === riesgo.id ? null : riesgo.id); }}
                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg" title="Controles sugeridos">
                    <Lightbulb className="w-4 h-4" />
                  </button>
                  <button onClick={e => { e.stopPropagation(); handleEdit(riesgo); }}
                    className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"><Edit3 className="w-4 h-4" /></button>
                  <button onClick={e => { e.stopPropagation(); handleDelete(riesgo.id); }}
                    className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
                  {expandedRisk === riesgo.id ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
                </div>
              </div>

              {/* Expanded details */}
              {expandedRisk === riesgo.id && (
                <div className="px-4 pb-4 border-t bg-gray-50">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 py-3">
                    <div>
                      <p className="text-xs font-medium text-gray-500">Proceso/Actividad</p>
                      <p className="text-sm text-gray-800">{riesgo.proceso || '-'} / {riesgo.actividad || '-'}</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Tarea</p>
                      <p className="text-sm text-gray-800">{riesgo.tarea || '-'} ({riesgo.rutinaria ? 'Rutinaria' : 'No rutinaria'})</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Expuestos</p>
                      <p className="text-sm text-gray-800">{riesgo.numExpuestos || '-'} personas</p>
                    </div>
                    <div>
                      <p className="text-xs font-medium text-gray-500">Responsable</p>
                      <p className="text-sm text-gray-800">{riesgo.responsable || '-'}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-5 gap-3 py-3 border-t">
                    <div className="p-2 bg-white rounded border text-center">
                      <p className="text-xs text-gray-500">ND</p>
                      <p className="text-sm font-bold">{riesgo.nivelDeficiencia}</p>
                      <p className="text-xs text-gray-400">{NIVEL_DEFICIENCIA[riesgo.nivelDeficiencia]?.valor}</p>
                    </div>
                    <div className="p-2 bg-white rounded border text-center">
                      <p className="text-xs text-gray-500">NE</p>
                      <p className="text-sm font-bold">{riesgo.nivelExposicion}</p>
                      <p className="text-xs text-gray-400">{NIVEL_EXPOSICION[riesgo.nivelExposicion]?.valor}</p>
                    </div>
                    <div className="p-2 bg-white rounded border text-center">
                      <p className="text-xs text-gray-500">NP</p>
                      <p className="text-sm font-bold">{riesgo.np.nivel}</p>
                      <p className="text-xs text-gray-400">{riesgo.np.valor}</p>
                    </div>
                    <div className="p-2 bg-white rounded border text-center">
                      <p className="text-xs text-gray-500">NC</p>
                      <p className="text-sm font-bold">{riesgo.nivelConsecuencia}</p>
                      <p className="text-xs text-gray-400">{NIVEL_CONSECUENCIA[riesgo.nivelConsecuencia]?.valor}</p>
                    </div>
                    <div className="p-2 rounded border text-center text-white font-bold" style={{ backgroundColor: riesgo.nr.color }}>
                      <p className="text-xs opacity-80">NR</p>
                      <p className="text-lg">{riesgo.nr.nivel}</p>
                      <p className="text-xs opacity-80">{riesgo.nr.valor}</p>
                    </div>
                  </div>
                  <div className="py-3 border-t">
                    <p className="text-xs font-medium text-gray-500 mb-1">Aceptabilidad</p>
                    <p className="text-sm font-semibold" style={{ color: riesgo.nr.color }}>{riesgo.aceptabilidad.clase}</p>
                    <p className="text-xs text-gray-600">{riesgo.aceptabilidad.accion}</p>
                  </div>
                  {riesgo.controlesExistentes && (
                    <div className="py-3 border-t">
                      <p className="text-xs font-medium text-gray-500 mb-1">Controles Existentes</p>
                      <p className="text-sm text-gray-700">{riesgo.controlesExistentes}</p>
                    </div>
                  )}
                  {riesgo.medidasIntervencion && (
                    <div className="py-3 border-t">
                      <p className="text-xs font-medium text-gray-500 mb-1">Medidas de Intervención</p>
                      <p className="text-sm text-gray-700">{riesgo.medidasIntervencion}</p>
                    </div>
                  )}
                </div>
              )}

              {/* Controles sugeridos */}
              {showControles === riesgo.id && (
                <div className="px-4 pb-4 border-t bg-blue-50">
                  <div className="py-3">
                    <h4 className="font-semibold text-blue-800 flex items-center gap-2 mb-3">
                      <Lightbulb className="w-4 h-4" /> Controles Sugeridos para {riesgo.categoria}
                    </h4>
                    {CONTROLES_SUGERIDOS[riesgo.categoria] ? (
                      <div className="space-y-2">
                        {[
                          { key: 'eliminacion', label: '1. Eliminación', color: 'bg-green-100 text-green-800' },
                          { key: 'sustitucion', label: '2. Sustitución', color: 'bg-emerald-100 text-emerald-800' },
                          { key: 'ingenieria', label: '3. Controles de Ingeniería', color: 'bg-blue-100 text-blue-800' },
                          { key: 'administrativo', label: '4. Controles Administrativos', color: 'bg-yellow-100 text-yellow-800' },
                          { key: 'epp', label: '5. EPP', color: 'bg-orange-100 text-orange-800' },
                        ].map(({ key, label, color }) => {
                          const controles = CONTROLES_SUGERIDOS[riesgo.categoria][key];
                          if (!controles || controles.length === 0) return null;
                          return (
                            <div key={key}>
                              <p className={`text-xs font-semibold ${color} inline-block px-2 py-0.5 rounded mb-1`}>{label}</p>
                              <ul className="list-disc list-inside text-sm text-gray-700 ml-2">
                                {controles.map((c, i) => <li key={i}>{c}</li>)}
                              </ul>
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-sm text-gray-500">No hay controles predefinidos para esta categoría.</p>
                    )}
                    <p className="text-xs text-blue-500 mt-3">
                      <Info className="w-3 h-3 inline mr-1" />
                      Jerarquía de controles conforme al Art. 2.2.4.6.24 Dec. 1072/2015
                    </p>
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <AlertTriangle className="w-6 h-6 text-orange-500" />
                {editingId ? 'Editar Riesgo' : 'Nuevo Riesgo — GTC-45'}
              </h2>

              <div className="space-y-4">
                {/* Sección: Identificación */}
                <div className="p-4 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-3">Identificación del Peligro</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Área / Departamento *</label>
                      <input type="text" value={form.area} onChange={e => setForm(prev => ({ ...prev, area: e.target.value }))}
                        placeholder="Ej: Producción, Oficinas, Bodega"
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Proceso</label>
                      <input type="text" value={form.proceso} onChange={e => setForm(prev => ({ ...prev, proceso: e.target.value }))}
                        placeholder="Ej: Manufactura, Administrativo"
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Actividad</label>
                      <input type="text" value={form.actividad} onChange={e => setForm(prev => ({ ...prev, actividad: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Tarea</label>
                      <input type="text" value={form.tarea} onChange={e => setForm(prev => ({ ...prev, tarea: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div className="flex items-center gap-2 mt-4">
                      <input type="checkbox" checked={form.rutinaria} onChange={e => setForm(prev => ({ ...prev, rutinaria: e.target.checked }))}
                        className="w-4 h-4 rounded" />
                      <label className="text-sm text-gray-700">Actividad rutinaria</label>
                    </div>
                  </div>
                </div>

                {/* Sección: Peligro */}
                <div className="p-4 bg-orange-50 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-3">Clasificación del Peligro (GTC-45)</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Categoría *</label>
                      <select value={form.categoria} onChange={e => setForm(prev => ({ ...prev, categoria: e.target.value, peligro: '' }))}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                        <option value="">Seleccione...</option>
                        {Object.keys(CATEGORIAS_PELIGROS).map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Peligro específico *</label>
                      <select value={form.peligro} onChange={e => setForm(prev => ({ ...prev, peligro: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" disabled={!form.categoria}>
                        <option value="">Seleccione...</option>
                        {(CATEGORIAS_PELIGROS[form.categoria] || []).map(p => <option key={p} value={p}>{p}</option>)}
                        <option value="__otro">Otro (especificar)</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Fuente Generadora</label>
                      <input type="text" value={form.fuenteGeneradora} onChange={e => setForm(prev => ({ ...prev, fuenteGeneradora: e.target.value }))}
                        placeholder="Ej: Máquina cortadora, Sustancia X"
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">N° Expuestos</label>
                      <input type="number" value={form.numExpuestos} onChange={e => setForm(prev => ({ ...prev, numExpuestos: parseInt(e.target.value) || 0 }))}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-700">Efectos Posibles</label>
                      <textarea value={form.efectosPosibles} onChange={e => setForm(prev => ({ ...prev, efectosPosibles: e.target.value }))}
                        placeholder="Ej: Hipoacusia, dermatitis, lumbalgia, estrés laboral..."
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm h-16 resize-none" />
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-700">Controles Existentes</label>
                      <textarea value={form.controlesExistentes} onChange={e => setForm(prev => ({ ...prev, controlesExistentes: e.target.value }))}
                        placeholder="Describa los controles ya implementados..."
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm h-16 resize-none" />
                    </div>
                  </div>
                </div>

                {/* Sección: Valoración */}
                <div className="p-4 bg-blue-50 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-3">Valoración del Riesgo</h3>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="text-sm font-medium text-gray-700">Nivel de Deficiencia (ND)</label>
                      <select value={form.nivelDeficiencia} onChange={e => setForm(prev => ({ ...prev, nivelDeficiencia: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                        {Object.entries(NIVEL_DEFICIENCIA).map(([k, v]) => (
                          <option key={k} value={k}>{k} ({v.valor})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Nivel de Exposición (NE)</label>
                      <select value={form.nivelExposicion} onChange={e => setForm(prev => ({ ...prev, nivelExposicion: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                        {Object.entries(NIVEL_EXPOSICION).map(([k, v]) => (
                          <option key={k} value={k}>{k} ({v.valor})</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Nivel de Consecuencia (NC)</label>
                      <select value={form.nivelConsecuencia} onChange={e => setForm(prev => ({ ...prev, nivelConsecuencia: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                        {Object.entries(NIVEL_CONSECUENCIA).map(([k, v]) => (
                          <option key={k} value={k}>{k} ({v.valor})</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  {/* Live preview */}
                  {(() => {
                    const np = calcularNivelProbabilidad(form.nivelDeficiencia, form.nivelExposicion);
                    const nr = calcularNivelRiesgo(np.valor, form.nivelConsecuencia);
                    const acept = determinarAceptabilidad(nr.nivel);
                    return (
                      <div className="mt-3 p-3 bg-white rounded-lg border flex flex-wrap items-center gap-4">
                        <div><span className="text-xs text-gray-500">NP: </span><span className="font-bold">{np.valor} ({np.nivel})</span></div>
                        <ArrowRight className="w-4 h-4 text-gray-400" />
                        <div className="px-3 py-1 rounded-full text-white font-bold text-sm" style={{ backgroundColor: nr.color }}>
                          NR: {nr.nivel} ({nr.valor})
                        </div>
                        <span className="text-sm text-gray-600">— {acept.clase}</span>
                      </div>
                    );
                  })()}
                </div>

                {/* Sección: Intervención */}
                <div className="p-4 bg-green-50 rounded-lg">
                  <h3 className="font-semibold text-gray-700 mb-3">Medidas de Intervención</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-700">Medidas de Intervención Propuestas</label>
                      <textarea value={form.medidasIntervencion} onChange={e => setForm(prev => ({ ...prev, medidasIntervencion: e.target.value }))}
                        placeholder="Describa las medidas de control a implementar (eliminación, sustitución, ingeniería, administrativos, EPP)..."
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm h-20 resize-none" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Responsable</label>
                      <input type="text" value={form.responsable} onChange={e => setForm(prev => ({ ...prev, responsable: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-700">Fecha de Implementación</label>
                      <input type="date" value={form.fechaImplementacion} onChange={e => setForm(prev => ({ ...prev, fechaImplementacion: e.target.value }))}
                        className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium">
                  Cancelar
                </button>
                <button onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> {editingId ? 'Actualizar' : 'Guardar'} Riesgo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="text-center text-xs text-gray-400 py-2">
        Metodología GTC-45 (2012) | Decreto 1072/2015 Art. 2.2.4.6.15
      </div>
    </div>
  );
};

export default RiskMatrix;
