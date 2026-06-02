// src/pages/MensajesPage.jsx — Internal messaging
import React, { useState } from 'react';
import { MessageCircle, Send, Plus, User, Clock } from 'lucide-react';
import { useAuthStore } from '../stores/authStore';
import { useBackendData } from '../hooks/useBackendData';

const STORAGE_KEY = 'siso_mensajes';
const load = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } };
const save = (d) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {} };

export default function MensajesPage() {
  const { currentUser } = useAuthStore();
  const { data: users } = useBackendData('/data/users', 'siso_users', 'users');
  const [mensajes, setMensajes] = useState(load);
  const [showCompose, setShowCompose] = useState(false);
  const [form, setForm] = useState({ to: '', text: '' });

  const handleSend = () => {
    if (!form.to || !form.text) { alert('Selecciona destinatario y escribe un mensaje'); return; }
    const msg = { id: `msg_${Date.now()}`, from: currentUser?.user || 'admin', to: form.to, text: form.text, fecha: new Date().toISOString(), leido: false };
    const updated = [msg, ...mensajes]; setMensajes(updated); save(updated);
    setForm({ to: '', text: '' }); setShowCompose(false);
  };

  const myMessages = mensajes.filter((m) => m.to === currentUser?.user || m.from === currentUser?.user);

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3"><MessageCircle className="w-6 h-6 text-emerald-600" /><h1 className="text-2xl font-bold text-gray-800">Mensajes</h1></div>
        <button onClick={() => setShowCompose(!showCompose)} className="flex items-center gap-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold"><Plus className="w-4 h-4" /> Nuevo</button>
      </div>
      {showCompose && (
        <div className="bg-white border rounded-xl p-5 mb-6 space-y-3">
          <select value={form.to} onChange={(e) => setForm({ ...form, to: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="">Destinatario</option>{users.filter((u) => u.user !== currentUser?.user).map((u) => <option key={u.user} value={u.user}>{u.name || u.user} ({u.role})</option>)}
          </select>
          <textarea value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} rows={3} placeholder="Escribe tu mensaje..." className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowCompose(false)} className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
            <button onClick={handleSend} className="flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold"><Send className="w-3.5 h-3.5" /> Enviar</button>
          </div>
        </div>
      )}
      <div className="space-y-2">
        {myMessages.length === 0 ? <div className="text-center py-12 text-gray-400"><MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-40" /><p>No hay mensajes</p></div>
        : myMessages.map((m) => (
          <div key={m.id} className={`bg-white border rounded-xl p-4 ${m.from === currentUser?.user ? 'border-emerald-200' : ''}`}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2"><User className="w-3.5 h-3.5 text-gray-400" /><span className="text-xs font-bold text-gray-700">{m.from === currentUser?.user ? `Para: ${m.to}` : `De: ${m.from}`}</span></div>
              <span className="text-[10px] text-gray-400 flex items-center gap-1"><Clock className="w-3 h-3" />{new Date(m.fecha).toLocaleString('es-CO')}</span>
            </div>
            <p className="text-sm text-gray-600">{m.text}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
