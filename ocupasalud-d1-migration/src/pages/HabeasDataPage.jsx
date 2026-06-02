// src/pages/HabeasDataPage.jsx
// Sprint 3.5: Habeas Data — Solicitudes ARCO (Ley 1581/2012)
// Consulta, Rectificación, Supresión, Revocatoria
import React, { useState, useCallback, useEffect } from 'react';
import { Shield, Plus, Clock, CheckCircle, AlertCircle, FileText, Search, Trash2 } from 'lucide-react';
import { InputGroup } from '../shared/components/ui/InputGroup';
import { SelectGroup } from '../shared/components/ui/SelectGroup';
import { TextAreaGroup } from '../shared/components/ui/TextAreaGroup';

const SOLICITUD_TYPES = ['Consulta', 'Rectificación', 'Supresión', 'Revocatoria'];
const STATUS_MAP = {
  Pendiente: { color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  'En proceso': { color: 'bg-blue-100 text-blue-800', icon: Clock },
  Resuelta: { color: 'bg-green-100 text-green-800', icon: CheckCircle },
  Rechazada: { color: 'bg-red-100 text-red-800', icon: AlertCircle },
};

const STORAGE_KEY = 'siso_habeas_data_requests';

const loadRequests = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; }
};

const saveRequests = (reqs) => localStorage.setItem(STORAGE_KEY, JSON.stringify(reqs));

export default function HabeasDataPage() {
  const [requests, setRequests] = useState(loadRequests);
  const [showForm, setShowForm] = useState(false);
  const [filter, setFilter] = useState('');
  const [form, setForm] = useState({
    tipo: 'Consulta',
    nombres: '',
    docTipo: 'CC',
    docNumero: '',
    email: '',
    celular: '',
    descripcion: '',
  });

  useEffect(() => { saveRequests(requests); }, [requests]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSubmit = useCallback(() => {
    if (!form.nombres || !form.docNumero || !form.descripcion) {
      alert('Complete nombre, documento y descripción');
      return;
    }
    const newReq = {
      ...form,
      id: `hd_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      estado: 'Pendiente',
      fechaCreacion: new Date().toISOString(),
      fechaRespuesta: null,
      respuesta: '',
    };
    setRequests((prev) => [newReq, ...prev]);
    setForm({ tipo: 'Consulta', nombres: '', docTipo: 'CC', docNumero: '', email: '', celular: '', descripcion: '' });
    setShowForm(false);
    alert('✅ Solicitud registrada correctamente');
  }, [form]);

  const handleStatusChange = useCallback((id, newStatus) => {
    setRequests((prev) => prev.map((r) =>
      r.id === id ? { ...r, estado: newStatus, fechaRespuesta: newStatus === 'Resuelta' || newStatus === 'Rechazada' ? new Date().toISOString() : r.fechaRespuesta } : r
    ));
  }, []);

  const handleDelete = useCallback((id) => {
    if (!confirm('¿Eliminar esta solicitud?')) return;
    setRequests((prev) => prev.filter((r) => r.id !== id));
  }, []);

  const filteredRequests = requests.filter((r) =>
    !filter ||
    r.nombres.toLowerCase().includes(filter.toLowerCase()) ||
    r.docNumero.includes(filter) ||
    r.tipo.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="p-4 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="bg-emerald-100 p-2.5 rounded-xl">
            <Shield className="w-6 h-6 text-emerald-700" />
          </div>
          <div>
            <h1 className="text-lg font-black text-gray-800">Habeas Data</h1>
            <p className="text-xs text-gray-500">Solicitudes ARCO — Ley 1581/2012 · Decreto 1377/2013</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-1.5 bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700"
        >
          <Plus className="w-4 h-4" /> Nueva Solicitud
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-emerald-200 rounded-xl p-5 mb-6 shadow-sm">
          <h2 className="text-sm font-black text-gray-800 mb-3 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-600" /> Registrar Solicitud
          </h2>
          <div className="flex flex-wrap -mx-1.5">
            <SelectGroup label="Tipo de solicitud" name="tipo" value={form.tipo} onChange={handleChange} options={SOLICITUD_TYPES} width="w-1/3" />
            <InputGroup label="Nombre completo" name="nombres" value={form.nombres} onChange={handleChange} width="w-2/3" required />
          </div>
          <div className="flex flex-wrap -mx-1.5">
            <SelectGroup label="Tipo documento" name="docTipo" value={form.docTipo} onChange={handleChange} options={['CC', 'CE', 'TI', 'PA', 'RC']} width="w-1/4" />
            <InputGroup label="Número documento" name="docNumero" value={form.docNumero} onChange={handleChange} width="w-1/4" required />
            <InputGroup label="Email" name="email" value={form.email} onChange={handleChange} type="email" width="w-1/4" />
            <InputGroup label="Celular" name="celular" value={form.celular} onChange={handleChange} width="w-1/4" />
          </div>
          <TextAreaGroup label="Descripción de la solicitud" name="descripcion" value={form.descripcion} onChange={handleChange} rows={4} placeholder="Describa su solicitud en detalle..." />
          <div className="flex gap-2 mt-2">
            <button onClick={handleSubmit} className="bg-emerald-600 text-white px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-700">
              Registrar Solicitud
            </button>
            <button onClick={() => setShowForm(false)} className="bg-gray-200 text-gray-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-gray-300">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden mb-4 bg-white">
        <Search className="w-4 h-4 text-gray-400 ml-3" />
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Buscar por nombre, documento o tipo..."
          className="flex-1 p-2 text-xs outline-none"
        />
      </div>

      {/* Requests list */}
      {filteredRequests.length > 0 ? (
        <div className="space-y-3">
          {filteredRequests.map((req) => {
            const statusInfo = STATUS_MAP[req.estado] || STATUS_MAP.Pendiente;
            const StatusIcon = statusInfo.icon;
            return (
              <div key={req.id} className="bg-white border border-gray-200 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${statusInfo.color}`}>
                        <StatusIcon className="w-3 h-3 inline mr-0.5" />
                        {req.estado}
                      </span>
                      <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">{req.tipo}</span>
                      <span className="text-[10px] text-gray-400">{new Date(req.fechaCreacion).toLocaleDateString('es-CO')}</span>
                    </div>
                    <p className="text-sm font-bold text-gray-800">{req.nombres}</p>
                    <p className="text-xs text-gray-500">{req.docTipo} {req.docNumero} {req.email ? `· ${req.email}` : ''}</p>
                    <p className="text-xs text-gray-600 mt-1">{req.descripcion}</p>
                  </div>
                  <div className="flex items-center gap-1 ml-3">
                    <select
                      value={req.estado}
                      onChange={(e) => handleStatusChange(req.id, e.target.value)}
                      className="text-[10px] border border-gray-200 rounded px-1 py-0.5"
                    >
                      <option>Pendiente</option>
                      <option>En proceso</option>
                      <option>Resuelta</option>
                      <option>Rechazada</option>
                    </select>
                    <button onClick={() => handleDelete(req.id)} className="p-1 text-red-400 hover:text-red-600">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12 text-gray-400">
          <Shield className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p className="text-sm font-medium">No hay solicitudes registradas</p>
          <p className="text-xs">Las solicitudes de Habeas Data aparecerán aquí</p>
        </div>
      )}

      {/* Legal notice */}
      <div className="mt-8 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-800">
        <p className="font-bold mb-1">📜 Marco Legal</p>
        <p>Ley 1581 de 2012 (Protección de Datos Personales) · Decreto 1377 de 2013 · Decreto Único Reglamentario 1074 de 2015.</p>
        <p className="mt-1">Los titulares tienen derecho a conocer, actualizar, rectificar y suprimir sus datos personales. El responsable del tratamiento debe atender las solicitudes dentro de los 15 días hábiles siguientes a la recepción.</p>
      </div>
    </div>
  );
}
