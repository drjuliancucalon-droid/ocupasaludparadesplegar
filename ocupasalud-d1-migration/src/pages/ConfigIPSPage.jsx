// src/pages/ConfigIPSPage.jsx — IPS Profile configuration
import React, { useState, useEffect } from 'react';
import { Building2, Save, CheckCircle, Upload } from 'lucide-react';

const STORAGE_KEY = 'siso_ips_perfil';
const load = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}'); } catch { return {}; } };

export default function ConfigIPSPage() {
  const [form, setForm] = useState({ nombre: '', nit: '', dv: '', direccion: '', ciudad: '', departamento: '', telefono: '', correo: '', lema: '', logo: '' });
  const [saved, setSaved] = useState(false);

  useEffect(() => { const d = load(); if (d.nombre) setForm((f) => ({ ...f, ...d })); }, []);

  const handleSave = () => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(form)); setSaved(true); setTimeout(() => setSaved(false), 3000); } catch {}
  };

  const h = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3"><Building2 className="w-6 h-6 text-emerald-600" /><h1 className="text-2xl font-bold text-gray-800">Perfil IPS</h1></div>
        <button onClick={handleSave} className="flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700">
          {saved ? <CheckCircle className="w-4 h-4" /> : <Save className="w-4 h-4" />} {saved ? 'Guardado' : 'Guardar'}
        </button>
      </div>
      <div className="bg-white border rounded-xl p-6 space-y-4">
        <p className="text-xs text-gray-500 mb-2">Estos datos se usan en todos los documentos impresos (certificados, HC, facturas).</p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[['nombre', 'Nombre de la IPS *'], ['nit', 'NIT'], ['dv', 'DV'], ['direccion', 'Dirección'], ['ciudad', 'Ciudad'], ['departamento', 'Departamento'], ['telefono', 'Teléfono'], ['correo', 'Correo electrónico'], ['lema', 'Lema / Eslogan']].map(([field, label]) => (
            <div key={field}><label className="block text-xs font-bold text-gray-600 mb-1">{label}</label>
              <input value={form[field]} onChange={h(field)} className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-emerald-400 outline-none" /></div>
          ))}
        </div>
      </div>
    </div>
  );
}
