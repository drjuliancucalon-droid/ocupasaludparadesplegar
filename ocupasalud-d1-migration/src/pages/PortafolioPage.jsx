// src/pages/PortafolioPage.jsx — Service portfolio
import React, { useState, useEffect } from 'react';
import { Briefcase, Plus, Edit2, Trash2, DollarSign, Save } from 'lucide-react';

const STORAGE_KEY = 'siso_portafolio';
const load = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } };
const persist = (d) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {} };

export default function PortafolioPage() {
  const [items, setItems] = useState(load);
  const [form, setForm] = useState({ nombre: '', descripcion: '', precio: '', categoria: 'Exámenes ocupacionales' });
  const [showForm, setShowForm] = useState(false);
  const CATS = ['Exámenes ocupacionales', 'Exámenes periódicos', 'SG-SST', 'Capacitaciones', 'Telemedicina', 'Otros'];

  const handleSave = () => {
    if (!form.nombre) { alert('Nombre requerido'); return; }
    const item = { ...form, id: `svc_${Date.now()}` };
    const u = [...items, item]; setItems(u); persist(u);
    setForm({ nombre: '', descripcion: '', precio: '', categoria: 'Exámenes ocupacionales' }); setShowForm(false);
  };
  const handleDelete = (id) => { if (confirm('¿Eliminar?')) { const u = items.filter((i) => i.id !== id); setItems(u); persist(u); } };

  const grouped = CATS.map((cat) => ({ cat, items: items.filter((i) => i.categoria === cat) })).filter((g) => g.items.length > 0);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3"><Briefcase className="w-6 h-6 text-emerald-600" /><h1 className="text-2xl font-bold text-gray-800">Portafolio de Servicios</h1></div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold"><Plus className="w-4 h-4" /> Nuevo</button>
      </div>
      {showForm && (
        <div className="bg-white border rounded-xl p-5 mb-6 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input value={form.nombre} onChange={(e) => setForm({ ...form, nombre: e.target.value })} placeholder="Nombre del servicio *" className="border rounded-lg px-3 py-2 text-sm" />
            <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className="border rounded-lg px-3 py-2 text-sm">{CATS.map((c) => <option key={c}>{c}</option>)}</select>
          </div>
          <textarea value={form.descripcion} onChange={(e) => setForm({ ...form, descripcion: e.target.value })} placeholder="Descripción..." rows={2} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
          <input value={form.precio} onChange={(e) => setForm({ ...form, precio: e.target.value })} placeholder="Precio ($)" className="border rounded-lg px-3 py-2 text-sm w-48" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
            <button onClick={handleSave} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold">Guardar</button>
          </div>
        </div>
      )}
      {grouped.length === 0 ? <div className="text-center py-12 text-gray-400"><Briefcase className="w-12 h-12 mx-auto mb-2 opacity-40" /><p>No hay servicios registrados</p></div>
      : grouped.map((g) => (
        <div key={g.cat} className="mb-6">
          <h3 className="text-sm font-black text-emerald-700 uppercase mb-2">{g.cat}</h3>
          <div className="space-y-2">{g.items.map((item) => (
            <div key={item.id} className="bg-white border rounded-xl p-4 flex justify-between">
              <div><p className="font-bold text-sm text-gray-800">{item.nombre}</p>{item.descripcion && <p className="text-xs text-gray-500">{item.descripcion}</p>}{item.precio && <p className="text-xs font-bold text-emerald-600 mt-1">${item.precio}</p>}</div>
              <button onClick={() => handleDelete(item.id)} className="p-2 text-red-400 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
            </div>
          ))}</div>
        </div>
      ))}
    </div>
  );
}
