// src/shared/components/MensajesDrawer.jsx
// T-04: Convertir Mensajes a drawer overlay (como monolito)
import React, { useState, useEffect } from 'react';
import { X, Send, Plus, User, MessageCircle } from 'lucide-react';
import { useAuthStore } from '../../stores/authStore';
import { useBackendData } from '../../hooks/useBackendData';

const STORAGE_KEY = 'siso_mensajes_drawer';
const load = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } };
const save = (d) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {} };

export function MensajesDrawer({ isOpen, onClose }) {
  const { currentUser } = useAuthStore();
  const { data: users } = useBackendData('/data/users', 'siso_users', 'users');
  const [mensajes, setMensajes] = useState(load);
  const [showCompose, setShowCompose] = useState(false);
  const [form, setForm] = useState({ to: '', text: '' });

  // Contar no leídos
  const noLeidos = mensajes.filter(m => m.to === currentUser?.user && !m.leido).length;

  const handleSend = () => {
    if (!form.to || !form.text) { return; }
    const msg = { 
      id: `msg_${Date.now()}`, 
      from: currentUser?.user || 'admin', 
      to: form.to, 
      text: form.text, 
      fecha: new Date().toISOString(), 
      leido: false 
    };
    const updated = [msg, ...mensajes]; 
    setMensajes(updated); 
    save(updated);
    setForm({ to: '', text: '' }); 
    setShowCompose(false);
  };

  const handleMarcarLeido = (id) => {
    const updated = mensajes.map(m => m.id === id ? { ...m, leido: true } : m);
    setMensajes(updated);
    save(updated);
  };

  const myMessages = mensajes.filter((m) => m.to === currentUser?.user || m.from === currentUser?.user);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Overlay */}
      <div className="fixed inset-0 bg-black/40" onClick={onClose} />
      
      {/* Drawer - Right side */}
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-md bg-white shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b bg-emerald-600 text-white">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            <h2 className="font-bold">Mensajes</h2>
            {noLeidos > 0 && (
              <span className="bg-red-500 text-white text-xs px-2 py-0.5 rounded-full">{noLeidos}</span>
            )}
          </div>
          <button onClick={onClose} className="p-1 hover:bg-emerald-700 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Compose */}
        {showCompose && (
          <div className="p-4 border-b bg-gray-50">
            <select 
              value={form.to} 
              onChange={(e) => setForm({ ...form, to: e.target.value })} 
              className="w-full border rounded-lg px-3 py-2 text-sm mb-2"
            >
              <option value="">Destinatario</option>
              {users?.filter((u) => u.user !== currentUser?.user).map((u) => (
                <option key={u.user} value={u.user}>{u.name || u.user}</option>
              ))}
            </select>
            <textarea 
              value={form.text} 
              onChange={(e) => setForm({ ...form, text: e.target.value })} 
              rows={2} 
              placeholder="Escribe tu mensaje..." 
              className="w-full border rounded-lg px-3 py-2 text-sm resize-none mb-2" 
            />
            <div className="flex gap-2">
              <button onClick={handleSend} className="flex-1 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold">Enviar</button>
              <button onClick={() => setShowCompose(false)} className="px-4 py-2 text-gray-600 text-sm">Cancelar</button>
            </div>
          </div>
        )}

        {/* Messages list */}
        <div className="flex-1 overflow-y-auto">
          {myMessages.length === 0 ? (
            <div className="p-8 text-center text-gray-400">
              <MessageCircle className="w-12 h-12 mx-auto mb-2 opacity-40" />
              <p>No hay mensajes</p>
            </div>
          ) : (
            myMessages.map(m => (
              <div 
                key={m.id} 
                className={`p-4 border-b cursor-pointer hover:bg-gray-50 ${!m.leido && m.to === currentUser?.user ? 'bg-blue-50' : ''}`}
                onClick={() => m.to === currentUser?.user && !m.leido && handleMarcarLeido(m.id)}
              >
                <div className="flex items-center gap-2 mb-1">
                  <User className="w-4 h-4 text-gray-400" />
                  <span className="font-bold text-sm">{m.from === currentUser?.user ? 'Tú' : m.from}</span>
                  <span className="text-xs text-gray-400 ml-auto">
                    {new Date(m.fecha).toLocaleDateString('es-CO', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-gray-700">{m.text}</p>
                {!m.leido && m.to === currentUser?.user && (
                  <span className="text-[10px] text-blue-600 font-bold">Nuevo</span>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer - New message button */}
        <div className="p-4 border-t">
          <button 
            onClick={() => setShowCompose(!showCompose)} 
            className="w-full py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold flex items-center justify-center gap-2"
          >
            <Plus className="w-4 h-4" /> Nuevo Mensaje
          </button>
        </div>
      </div>
    </div>
  );
}

// Hook para abrir el drawer desde cualquier lugar
export function useMensajesDrawer() {
  const [isOpen, setIsOpen] = useState(false);
  return { isOpen, open: () => setIsOpen(true), close: () => setIsOpen(false) };
}