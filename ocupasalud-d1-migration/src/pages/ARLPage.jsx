// src/pages/ARLPage.jsx — ARL Module (AT + EL)
// Modo ARL: Accidentes de Trabajo + Enfermedades Laborales
// Plan GATE: Requiere plan PRO o superior
import React, { useState, useMemo } from 'react';
import { Shield, AlertTriangle, TrendingUp, TrendingDown, FileText, Plus, Activity, Users, Calendar, Download } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useBackendData } from '../hooks/useBackendData';

const STORAGE_KEY = 'siso_atl_cases';
const loadATL = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } };
const saveATL = (d) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {} };

export default function ARLPage() {
  const { currentUser } = useAuthStore();
  const { data: patients } = useBackendData('/data/patients', 'siso_db_patients', 'patients');
  const { data: companies } = useBackendData('/data/companies', 'siso_companies', 'companies');
  
  // Plan GATE: ARL requiere PRO
  const canAccessARL = currentUser?.license === 'pro' || currentUser?.license === 'clinica' || currentUser?.role === 'super_admin' || currentUser?.role === 'administrador';
  
  const [atlCases, setAtlCases] = useState(loadATL);
  const [activeTab, setActiveTab] = useState('at'); // 'at' = Accidentes, 'el' = Enfermedades
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    tipo: 'AT', // AT o EL
    fecha: new Date().toISOString().split('T')[0],
    empresa: '',
    trabajador: '',
    docNumero: '',
    descripcion: '',
    estado: 'en_tramite', // en_tramite, cerrado, pendiente
    clasificacion: '',
    diasIncapacidad: '',
    consecuencia: '', // trabajo perdido, trabajo limiting, primer dia
  });

  const handleSave = () => {
    if (!form.trabajador || !form.empresa) { alert('Empresa y trabajador son requeridos'); return; }
    const newCase = { ...form, id: `atl_${Date.now()}`, createdAt: new Date().toISOString() };
    const updated = [newCase, ...atlCases]; setAtlCases(updated); saveATL(updated);
    setForm({ tipo: 'AT', fecha: new Date().toISOString().split('T')[0], empresa: '', trabajador: '', docNumero: '', descripcion: '', estado: 'en_tramite', clasificacion: '', diasIncapacidad: '', consecuencia: '' });
    setShowForm(false);
  };

  // Métricas
  const metrics = useMemo(() => {
    const atCases = atlCases.filter(c => c.tipo === 'AT');
    const elCases = atlCases.filter(c => c.tipo === 'EL');
    const totalAt = atCases.length;
    const totalEl = elCases.length;
    const abiertosAt = atCases.filter(c => c.estado === 'en_tramite').length;
    const abiertosEl = elCases.filter(c => c.estado === 'en_tramite').length;
    const diasPerdidosAt = atCases.reduce((sum, c) => sum + (parseInt(c.diasIncapacidad) || 0), 0);
    const diasPerdidosEl = elCases.reduce((sum, c) => sum + (parseInt(c.diasIncapacidad) || 0), 0);
    return { totalAt, totalEl, abiertosAt, abiertosEl, diasPerdidosAt, diasPerdidosEl, diasTotales: diasPerdidosAt + diasPerdidosEl };
  }, [atlCases]);

  // Filtrar por tab
  const filteredCases = atlCases.filter(c => c.tipo === activeTab);

  if (!canAccessARL) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <div className="bg-red-50 border border-red-200 rounded-xl p-8 text-center">
          <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-black text-red-700 mb-2">Acceso Restringido</h2>
          <p className="text-red-600">El módulo ARL requiere plan PRO, Clínica o superior.</p>
          <p className="text-gray-500 text-sm mt-2">Consulte los planes disponibles en la sección de Planes.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Shield className="w-6 h-6 text-orange-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Módulo ARL</h1>
            <p className="text-xs text-gray-500">Accidentes de Trabajo (AT) + Enfermedades Laborales (EL)</p>
          </div>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-3 py-2 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700">
          <Plus className="w-4 h-4" /> Nuevo Caso
        </button>
      </div>

      {/* Métricas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
          <AlertTriangle className="w-5 h-5 text-red-500 mx-auto mb-1" />
          <p className="text-xl font-black text-red-700">{metrics.totalAt}</p>
          <p className="text-[10px] text-red-600">Accidentes (AT)</p>
        </div>
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
          <Activity className="w-5 h-5 text-amber-500 mx-auto mb-1" />
          <p className="text-xl font-black text-amber-700">{metrics.totalEl}</p>
          <p className="text-[10px] text-amber-600">Enfermedades (EL)</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-center">
          <Calendar className="w-5 h-5 text-orange-500 mx-auto mb-1" />
          <p className="text-xl font-black text-orange-700">{metrics.diasTotales}</p>
          <p className="text-[10px] text-orange-600">Días perdidos</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
          <TrendingUp className="w-5 h-5 text-blue-500 mx-auto mb-1" />
          <p className="text-xl font-black text-blue-700">{metrics.abiertosAt + metrics.abiertosEl}</p>
          <p className="text-[10px] text-blue-600">En trámite</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-4">
        <button onClick={() => setActiveTab('at')} className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'at' ? 'bg-red-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
          🔴 Accidentes (AT)
        </button>
        <button onClick={() => setActiveTab('el')} className={`px-4 py-2 rounded-lg font-bold text-sm ${activeTab === 'el' ? 'bg-amber-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
          🟠 Enfermedades (EL)
        </button>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border rounded-xl p-5 mb-6 space-y-4">
          <h3 className="font-bold text-gray-800">Nuevo Caso {activeTab === 'at' ? 'AT' : 'EL'}</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Empresa</label>
              <select value={form.empresa} onChange={e => setForm({ ...form, empresa: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Seleccionar empresa</option>
                {companies?.map(c => <option key={c.id} value={c.nombre || c.razonSocial}>{c.nombre || c.razonSocial}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Trabajador</label>
              <input type="text" value={form.trabajador} onChange={e => setForm({ ...form, trabajador: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Nombre del trabajador" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Documento</label>
              <input type="text" value={form.docNumero} onChange={e => setForm({ ...form, docNumero: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Número de documento" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Fecha</label>
              <input type="date" value={form.fecha} onChange={e => setForm({ ...form, fecha: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-gray-600 block mb-1">Descripción</label>
              <textarea value={form.descripcion} onChange={e => setForm({ ...form, descripcion: e.target.value })} rows={2} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Descripción del incidente o enfermedad" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Clasificación</label>
              <select value={form.clasificacion} onChange={e => setForm({ ...form, clasificacion: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="">Seleccionar</option>
                <option value="leve">Leve</option>
                <option value="grave">Grave</option>
                <option value="mortal">Mortales</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Días Incapacidad</label>
              <input type="number" value={form.diasIncapacidad} onChange={e => setForm({ ...form, diasIncapacidad: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="0" />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleSave} className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-bold">Guardar</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-600 text-sm">Cancelar</button>
          </div>
        </div>
      )}

      {/* Lista de casos */}
      <div className="space-y-3">
        {filteredCases.length === 0 ? (
          <div className="text-center py-10 text-gray-400">
            <Shield className="w-12 h-12 mx-auto mb-2 opacity-40" />
            <p>No hay casos de {activeTab === 'at' ? 'Accidentes' : 'Enfermedades'} laborales registrados</p>
          </div>
        ) : filteredCases.map(c => (
          <div key={c.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.tipo === 'AT' ? 'bg-red-100' : 'bg-amber-100'}`}>
                <AlertTriangle className={`w-5 h-5 ${c.tipo === 'AT' ? 'text-red-600' : 'text-amber-600'}`} />
              </div>
              <div>
                <p className="font-bold text-sm text-gray-800">{c.trabajador}</p>
                <p className="text-xs text-gray-500">{c.empresa} | {new Date(c.fecha).toLocaleDateString('es-CO')}</p>
                <p className="text-xs text-gray-400 mt-1">{c.descripcion?.substring(0, 60)}...</p>
              </div>
            </div>
            <div className="text-right">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                c.estado === 'en_tramite' ? 'bg-yellow-100 text-yellow-700' :
                c.estado === 'cerrado' ? 'bg-green-100 text-green-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {c.estado === 'en_tramite' ? '⏳ En trámite' : c.estado === 'cerrado' ? '✅ Cerrado' : '⚠️ Pendiente'}
              </span>
              {c.diasIncapacidad && <p className="text-[10px] text-gray-500 mt-1">{c.diasIncapacidad} días</p>}
            </div>
          </div>
        ))}
      </div>

      {/* Exportar */}
      <div className="mt-6 bg-gray-50 border border-gray-200 rounded-xl p-4">
        <button 
          onClick={() => {
            const csv = `Tipo,Fecha,Empresa,Trabajador,Documento,Descripción,Días,Estado\n` +
              atlCases.map(c => `${c.tipo},${c.fecha},"${c.empresa}","${c.trabajador}",${c.docNumero},"${c.descripcion}",${c.diasIncapacidad || 0},${c.estado}`).join('\n');
            const blob = new Blob([csv], { type: 'text/csv' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a'); a.href = url; a.download = `atl_${new Date().toISOString().split('T')[0]}.csv`; a.click();
          }}
          className="flex items-center gap-2 px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-bold hover:bg-gray-700"
        >
          <Download className="w-4 h-4" /> Exportar CSV
        </button>
      </div>
    </div>
  );
}