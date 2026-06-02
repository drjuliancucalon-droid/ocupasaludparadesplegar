/**
 * DocumentRepository.jsx
 * Repositorio de Documentos Obligatorios del SG-SST
 * Resolución 0312/2019 — 21 documentos obligatorios
 */

import React, { useState, useMemo } from 'react';
import {
  FileText, Upload, Search, Filter, X, Plus, Edit3, Trash2,
  CheckCircle2, XCircle, Clock, AlertTriangle, Download, Eye,
  FolderOpen, Calendar, History, Info, Shield, BarChart3,
  ChevronDown, ChevronUp, Save, Printer, Bell, RefreshCw, Archive
} from 'lucide-react';
import { documentosCRUD, DOCUMENTOS_OBLIGATORIOS } from '../services/sgsstService';

const CATEGORIAS_DOC = [
  { id: 'Políticas', color: 'bg-blue-100 text-blue-700' },
  { id: 'Identificación', color: 'bg-orange-100 text-orange-700' },
  { id: 'Planificación', color: 'bg-green-100 text-green-700' },
  { id: 'Salud', color: 'bg-pink-100 text-pink-700' },
  { id: 'Comités', color: 'bg-purple-100 text-purple-700' },
  { id: 'Seguimiento', color: 'bg-teal-100 text-teal-700' },
  { id: 'Emergencias', color: 'bg-red-100 text-red-700' },
  { id: 'Accidentalidad', color: 'bg-yellow-100 text-yellow-700' },
  { id: 'Legal', color: 'bg-indigo-100 text-indigo-700' },
  { id: 'Evaluación', color: 'bg-cyan-100 text-cyan-700' },
];

const ESTADO_DOC = {
  'Sin documento': { color: 'bg-gray-100 text-gray-600', icon: XCircle },
  'Borrador': { color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  'En revisión': { color: 'bg-blue-100 text-blue-700', icon: Eye },
  'Vigente': { color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  'Aprobado': { color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  'Vencido': { color: 'bg-red-100 text-red-700', icon: AlertTriangle },
};

const DocumentRepository = () => {
  const [documentos, setDocumentos] = useState(documentosCRUD.getAll());
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [selectedDoc, setSelectedDoc] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterCategoria, setFilterCategoria] = useState('');
  const [filterEstado, setFilterEstado] = useState('');
  const [showVersionHistory, setShowVersionHistory] = useState(null);
  const [viewMode, setViewMode] = useState('grid'); // grid | list

  const emptyForm = {
    docObligatorioId: '',
    nombre: '',
    categoria: '',
    descripcion: '',
    estado: 'Borrador',
    version: '1.0',
    fechaElaboracion: '',
    fechaAprobacion: '',
    fechaVencimiento: '',
    elaboradoPor: '',
    aprobadoPor: '',
    revisadoPor: '',
    observaciones: '',
    contenido: '',
    archivoNombre: '',
    versiones: [],
  };
  const [form, setForm] = useState({ ...emptyForm });

  const refresh = () => setDocumentos(documentosCRUD.getAll());

  // Merge obligatorios con registrados
  const documentosCompletos = useMemo(() => {
    return DOCUMENTOS_OBLIGATORIOS.map(docObl => {
      const registrado = documentos.find(d => d.docObligatorioId === docObl.id);
      return {
        ...docObl,
        registrado: registrado || null,
        estado: registrado?.estado || 'Sin documento',
        completo: registrado && (registrado.estado === 'Vigente' || registrado.estado === 'Aprobado'),
      };
    });
  }, [documentos]);

  const filteredDocs = useMemo(() => {
    return documentosCompletos.filter(d => {
      if (filterCategoria && d.categoria !== filterCategoria) return false;
      if (filterEstado) {
        if (filterEstado === 'completo' && !d.completo) return false;
        if (filterEstado === 'pendiente' && d.completo) return false;
        if (!['completo', 'pendiente'].includes(filterEstado) && d.estado !== filterEstado) return false;
      }
      if (searchTerm) {
        const term = searchTerm.toLowerCase();
        return d.nombre.toLowerCase().includes(term) || d.descripcion.toLowerCase().includes(term);
      }
      return true;
    });
  }, [documentosCompletos, filterCategoria, filterEstado, searchTerm]);

  const stats = useMemo(() => {
    const total = 21;
    const completos = documentosCompletos.filter(d => d.completo).length;
    const porcentaje = Math.round((completos / total) * 100);
    const borradores = documentosCompletos.filter(d => d.estado === 'Borrador').length;
    const sinDocumento = documentosCompletos.filter(d => d.estado === 'Sin documento').length;
    const vencidos = documentosCompletos.filter(d => {
      if (!d.registrado?.fechaVencimiento) return false;
      return new Date(d.registrado.fechaVencimiento) < new Date();
    }).length;

    const porCategoria = {};
    CATEGORIAS_DOC.forEach(cat => {
      const docsEnCat = documentosCompletos.filter(d => d.categoria === cat.id);
      const compEnCat = docsEnCat.filter(d => d.completo).length;
      porCategoria[cat.id] = { total: docsEnCat.length, completos: compEnCat };
    });

    return { total, completos, porcentaje, borradores, sinDocumento, vencidos, porCategoria };
  }, [documentosCompletos]);

  const openDocForm = (docObl) => {
    const registrado = docObl.registrado;
    if (registrado) {
      setForm({ ...emptyForm, ...registrado });
      setEditingId(registrado.id);
    } else {
      setForm({
        ...emptyForm,
        docObligatorioId: docObl.id,
        nombre: docObl.nombre,
        categoria: docObl.categoria,
        descripcion: docObl.descripcion,
      });
      setEditingId(null);
    }
    setShowForm(true);
  };

  const handleSave = () => {
    if (!form.nombre) { alert('El nombre del documento es obligatorio'); return; }
    const data = { ...form };

    // Add version to history
    if (editingId) {
      const existing = documentosCRUD.getById(editingId);
      if (existing && existing.version !== data.version) {
        data.versiones = [...(existing.versiones || []), {
          version: existing.version,
          fecha: existing.updatedAt || existing.createdAt,
          modificadoPor: existing.elaboradoPor,
          cambios: 'Versión anterior',
        }];
      }
      documentosCRUD.update(editingId, data);
    } else {
      documentosCRUD.create(data);
    }
    refresh();
    setShowForm(false);
    setEditingId(null);
    setForm({ ...emptyForm });
  };

  const handleDelete = (id) => {
    if (window.confirm('¿Eliminar este documento del repositorio?')) {
      documentosCRUD.remove(id);
      refresh();
    }
  };

  const getCatColor = (catId) => {
    return CATEGORIAS_DOC.find(c => c.id === catId)?.color || 'bg-gray-100 text-gray-700';
  };

  const handlePrint = () => {
    const rows = documentosCompletos.map((d, i) => `
      <tr>
        <td>${i + 1}</td>
        <td>${d.nombre}</td>
        <td>${d.categoria}</td>
        <td>${d.descripcion}</td>
        <td style="font-weight:bold; color:${d.completo ? 'green' : 'red'}">${d.estado}</td>
        <td>${d.registrado?.version || '-'}</td>
        <td>${d.registrado?.fechaAprobacion ? new Date(d.registrado.fechaAprobacion).toLocaleDateString('es-CO') : '-'}</td>
      </tr>
    `).join('');

    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html><html><head><title>Repositorio Documental SG-SST</title>
      <style>
        body { font-family: Arial; padding: 20px; font-size: 9pt; }
        h1 { text-align: center; font-size: 14pt; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #999; padding: 4px 6px; }
        th { background: #1e40af; color: white; font-size: 8pt; }
        .summary { text-align: center; margin: 10px 0; font-size: 12pt; }
        @media print { @page { margin: 1.5cm; } }
      </style></head><body>
        <h1>REPOSITORIO DOCUMENTAL DEL SG-SST</h1>
        <p style="text-align:center;">Resolución 0312 de 2019 — 21 documentos obligatorios</p>
        <p class="summary"><strong>${stats.completos}/21</strong> documentos completos (${stats.porcentaje}%)</p>
        <table><thead><tr><th>#</th><th>Documento</th><th>Categoría</th><th>Norma</th><th>Estado</th><th>Versión</th><th>Aprobación</th></tr></thead><tbody>${rows}</tbody></table>
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
            <FolderOpen className="w-7 h-7 text-teal-600" />
            Repositorio Documental
          </h1>
          <p className="text-sm text-gray-500">21 documentos obligatorios — Resolución 0312/2019</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 text-sm font-medium">
            <Printer className="w-4 h-4" />
          </button>
          <div className="flex bg-gray-100 rounded-lg p-0.5">
            <button onClick={() => setViewMode('grid')} className={`px-3 py-1.5 rounded text-sm ${viewMode === 'grid' ? 'bg-white shadow text-teal-600' : 'text-gray-600'}`}>Cuadrícula</button>
            <button onClick={() => setViewMode('list')} className={`px-3 py-1.5 rounded text-sm ${viewMode === 'list' ? 'bg-white shadow text-teal-600' : 'text-gray-600'}`}>Lista</button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-gray-700">Cumplimiento Documental</h2>
          <span className="text-2xl font-bold" style={{ color: stats.porcentaje >= 80 ? '#22c55e' : stats.porcentaje >= 50 ? '#eab308' : '#ef4444' }}>
            {stats.porcentaje}%
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-4 mb-4">
          <div className="h-4 rounded-full transition-all duration-700"
            style={{ width: `${stats.porcentaje}%`, backgroundColor: stats.porcentaje >= 80 ? '#22c55e' : stats.porcentaje >= 50 ? '#eab308' : '#ef4444' }} />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          <div className="text-center p-2 bg-green-50 rounded-lg">
            <p className="text-xl font-bold text-green-600">{stats.completos}</p>
            <p className="text-xs text-gray-500">Vigentes</p>
          </div>
          <div className="text-center p-2 bg-yellow-50 rounded-lg">
            <p className="text-xl font-bold text-yellow-600">{stats.borradores}</p>
            <p className="text-xs text-gray-500">Borradores</p>
          </div>
          <div className="text-center p-2 bg-gray-50 rounded-lg">
            <p className="text-xl font-bold text-gray-600">{stats.sinDocumento}</p>
            <p className="text-xs text-gray-500">Sin documento</p>
          </div>
          <div className="text-center p-2 bg-red-50 rounded-lg">
            <p className="text-xl font-bold text-red-600">{stats.vencidos}</p>
            <p className="text-xs text-gray-500">Vencidos</p>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded-lg">
            <p className="text-xl font-bold text-blue-600">21</p>
            <p className="text-xs text-gray-500">Total requeridos</p>
          </div>
        </div>

        {/* Mini bars por categoría */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-5 gap-2">
          {CATEGORIAS_DOC.filter(cat => stats.porCategoria[cat.id]?.total > 0).map(cat => (
            <div key={cat.id} className="text-center">
              <p className="text-xs text-gray-500 truncate">{cat.id}</p>
              <div className="w-full bg-gray-200 rounded-full h-1.5 mt-1">
                <div className="bg-teal-500 h-1.5 rounded-full" style={{
                  width: `${stats.porCategoria[cat.id].total > 0 ? Math.round((stats.porCategoria[cat.id].completos / stats.porCategoria[cat.id].total) * 100) : 0}%`
                }} />
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{stats.porCategoria[cat.id].completos}/{stats.porCategoria[cat.id].total}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Filtros */}
      <div className="flex flex-wrap gap-3 items-center bg-white rounded-lg border p-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input type="text" value={searchTerm} onChange={e => setSearchTerm(e.target.value)}
            placeholder="Buscar documentos..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" />
        </div>
        <select value={filterCategoria} onChange={e => setFilterCategoria(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
          <option value="">Todas las categorías</option>
          {CATEGORIAS_DOC.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
        </select>
        <select value={filterEstado} onChange={e => setFilterEstado(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
          <option value="">Todos los estados</option>
          <option value="completo">✓ Completos</option>
          <option value="pendiente">✗ Pendientes</option>
          {Object.keys(ESTADO_DOC).map(e => <option key={e} value={e}>{e}</option>)}
        </select>
        {(filterCategoria || filterEstado || searchTerm) && (
          <button onClick={() => { setFilterCategoria(''); setFilterEstado(''); setSearchTerm(''); }}
            className="text-xs text-red-600 flex items-center gap-1"><X className="w-3 h-3" /> Limpiar</button>
        )}
      </div>

      {/* Grid view */}
      {viewMode === 'grid' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocs.map((doc, i) => {
            const EstadoIcon = ESTADO_DOC[doc.estado]?.icon || XCircle;
            return (
              <div key={doc.id}
                className={`bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow cursor-pointer ${doc.completo ? 'border-green-200' : 'border-gray-200'}`}
                onClick={() => openDocForm(doc)}>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getCatColor(doc.categoria)}`}>
                      {doc.categoria}
                    </span>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 ${ESTADO_DOC[doc.estado]?.color || 'bg-gray-100'}`}>
                      <EstadoIcon className="w-3 h-3" /> {doc.estado}
                    </span>
                  </div>
                  <h3 className="font-semibold text-gray-800 text-sm leading-tight mb-1">{doc.nombre}</h3>
                  <p className="text-xs text-gray-500 line-clamp-2">{doc.descripcion}</p>
                  {doc.registrado && (
                    <div className="mt-2 pt-2 border-t flex items-center justify-between text-xs text-gray-400">
                      <span>v{doc.registrado.version || '1.0'}</span>
                      {doc.registrado.fechaAprobacion && (
                        <span>{new Date(doc.registrado.fechaAprobacion).toLocaleDateString('es-CO')}</span>
                      )}
                    </div>
                  )}
                </div>
                <div className={`h-1 ${doc.completo ? 'bg-green-500' : doc.estado === 'Borrador' ? 'bg-yellow-400' : 'bg-gray-200'}`} />
              </div>
            );
          })}
        </div>
      )}

      {/* List view */}
      {viewMode === 'list' && (
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-gray-50">
                <th className="text-left p-3 text-xs font-semibold text-gray-600">#</th>
                <th className="text-left p-3 text-xs font-semibold text-gray-600">Documento</th>
                <th className="text-left p-3 text-xs font-semibold text-gray-600 hidden md:table-cell">Categoría</th>
                <th className="text-left p-3 text-xs font-semibold text-gray-600 hidden lg:table-cell">Norma</th>
                <th className="text-left p-3 text-xs font-semibold text-gray-600">Estado</th>
                <th className="text-left p-3 text-xs font-semibold text-gray-600 hidden md:table-cell">Versión</th>
                <th className="text-right p-3 text-xs font-semibold text-gray-600">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {filteredDocs.map((doc, i) => {
                const EstadoIcon = ESTADO_DOC[doc.estado]?.icon || XCircle;
                return (
                  <tr key={doc.id} className="border-b hover:bg-gray-50">
                    <td className="p-3 text-sm text-gray-400">{i + 1}</td>
                    <td className="p-3">
                      <p className="text-sm font-medium text-gray-800">{doc.nombre}</p>
                    </td>
                    <td className="p-3 hidden md:table-cell">
                      <span className={`text-xs px-2 py-0.5 rounded-full ${getCatColor(doc.categoria)}`}>{doc.categoria}</span>
                    </td>
                    <td className="p-3 hidden lg:table-cell text-xs text-gray-500">{doc.descripcion}</td>
                    <td className="p-3">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1 w-fit ${ESTADO_DOC[doc.estado]?.color}`}>
                        <EstadoIcon className="w-3 h-3" /> {doc.estado}
                      </span>
                    </td>
                    <td className="p-3 hidden md:table-cell text-xs text-gray-500">{doc.registrado?.version || '-'}</td>
                    <td className="p-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => openDocForm(doc)} className="p-1.5 text-teal-500 hover:bg-teal-50 rounded-lg">
                          <Edit3 className="w-4 h-4" />
                        </button>
                        {doc.registrado && (
                          <button onClick={() => handleDelete(doc.registrado.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowForm(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <FileText className="w-6 h-6 text-teal-600" />
                {editingId ? 'Actualizar Documento' : 'Registrar Documento'}
              </h2>
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">Nombre del Documento *</label>
                  <input type="text" value={form.nombre} onChange={e => setForm(p => ({ ...p, nombre: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Categoría</label>
                    <select value={form.categoria} onChange={e => setForm(p => ({ ...p, categoria: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                      {CATEGORIAS_DOC.map(c => <option key={c.id} value={c.id}>{c.id}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Estado</label>
                    <select value={form.estado} onChange={e => setForm(p => ({ ...p, estado: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm">
                      {Object.keys(ESTADO_DOC).filter(e => e !== 'Sin documento').map(e => <option key={e} value={e}>{e}</option>)}
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Versión</label>
                    <input type="text" value={form.version} onChange={e => setForm(p => ({ ...p, version: e.target.value }))}
                      placeholder="1.0" className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Fecha Elaboración</label>
                    <input type="date" value={form.fechaElaboracion} onChange={e => setForm(p => ({ ...p, fechaElaboracion: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Fecha Aprobación</label>
                    <input type="date" value={form.fechaAprobacion} onChange={e => setForm(p => ({ ...p, fechaAprobacion: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Fecha de Vencimiento</label>
                  <input type="date" value={form.fechaVencimiento} onChange={e => setForm(p => ({ ...p, fechaVencimiento: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                  <p className="text-xs text-gray-400 mt-1">Deje vacío si no tiene vencimiento</p>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="text-sm font-medium text-gray-700">Elaborado por</label>
                    <input type="text" value={form.elaboradoPor} onChange={e => setForm(p => ({ ...p, elaboradoPor: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Revisado por</label>
                    <input type="text" value={form.revisadoPor} onChange={e => setForm(p => ({ ...p, revisadoPor: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Aprobado por</label>
                    <input type="text" value={form.aprobadoPor} onChange={e => setForm(p => ({ ...p, aprobadoPor: e.target.value }))}
                      className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                  </div>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Referencia Normativa</label>
                  <input type="text" value={form.descripcion} onChange={e => setForm(p => ({ ...p, descripcion: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm bg-gray-50" readOnly={!!form.docObligatorioId} />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Nombre del Archivo</label>
                  <input type="text" value={form.archivoNombre} onChange={e => setForm(p => ({ ...p, archivoNombre: e.target.value }))}
                    placeholder="Ej: Politica_SST_v1.0.pdf"
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm" />
                  <p className="text-xs text-gray-400 mt-1">
                    <Info className="w-3 h-3 inline mr-1" />
                    Registre el nombre del archivo para referencia. Los documentos físicos se gestionan externamente.
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Observaciones</label>
                  <textarea value={form.observaciones} onChange={e => setForm(p => ({ ...p, observaciones: e.target.value }))}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm h-16 resize-none" />
                </div>

                {/* Version history */}
                {form.versiones?.length > 0 && (
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="text-sm font-semibold text-gray-700 mb-2 flex items-center gap-1">
                      <History className="w-4 h-4" /> Historial de Versiones
                    </h4>
                    {form.versiones.map((v, i) => (
                      <div key={i} className="flex items-center gap-2 text-xs text-gray-500 py-1 border-b last:border-0">
                        <span className="font-medium">v{v.version}</span>
                        <span>{v.fecha ? new Date(v.fecha).toLocaleDateString('es-CO') : '-'}</span>
                        <span>{v.modificadoPor || '-'}</span>
                        <span className="text-gray-400">{v.cambios || ''}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex gap-3 mt-6">
                <button onClick={() => { setShowForm(false); setEditingId(null); }}
                  className="flex-1 px-4 py-2 border rounded-lg text-gray-700 hover:bg-gray-50 text-sm font-medium">Cancelar</button>
                <button onClick={handleSave}
                  className="flex-1 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 text-sm font-medium flex items-center justify-center gap-2">
                  <Save className="w-4 h-4" /> {editingId ? 'Actualizar' : 'Registrar'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="text-center text-xs text-gray-400 py-2">
        Repositorio documental conforme a la Resolución 0312 de 2019 y Decreto 1072/2015
      </div>
    </div>
  );
};

export default DocumentRepository;
