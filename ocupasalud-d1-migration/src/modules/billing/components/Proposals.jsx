import React, { useState } from 'react';
import { FileSpreadsheet, Plus, Trash2, Save, Printer, Send, CheckCircle2 } from 'lucide-react';
import { InputGroup } from '../../../shared/components/ui/InputGroup';

/**
 * Proposals - Propuestas económicas y cotizaciones
 */
export const Proposals = ({ proposals = [], onSave, onDelete, onChangeStatus, onPrint, doctorData }) => {
  const [editing, setEditing] = useState(null);
  const [items, setItems] = useState([{ id: Date.now(), servicio: '', cantidad: 1, precio: 0 }]);
  const [propData, setPropData] = useState({
    clienteNombre: '', clienteNit: '', clienteContacto: '', validezDias: '30',
    observaciones: '', incluirIVA: false,
  });

  const addItem = () => setItems((p) => [...p, { id: Date.now(), servicio: '', cantidad: 1, precio: 0 }]);
  const removeItem = (idx) => setItems((p) => p.filter((_, i) => i !== idx));
  const updateItem = (idx, field, val) => setItems((p) => p.map((it, i) => i === idx ? { ...it, [field]: val } : it));

  const subtotal = items.reduce((s, it) => s + (it.cantidad || 0) * (it.precio || 0), 0);
  const iva = propData.incluirIVA ? subtotal * 0.19 : 0;
  const total = subtotal + iva;

  const handleSave = (estado = 'Borrador') => {
    const prop = {
      ...propData,
      id: editing || `PROP-${Date.now()}`,
      numero: `COT-${String(proposals.length + 1).padStart(4, '0')}`,
      servicios: items,
      subtotal, iva, total,
      estado,
      fecha: new Date().toISOString().split('T')[0],
      medicoNombre: doctorData?.nombre || '',
    };
    onSave?.(prop);
    setEditing(null);
    setItems([{ id: Date.now(), servicio: '', cantidad: 1, precio: 0 }]);
    setPropData({ clienteNombre: '', clienteNit: '', clienteContacto: '', validezDias: '30', observaciones: '', incluirIVA: false });
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-indigo-600" /> Propuestas / Cotizaciones
        </h2>
      </div>

      {/* New proposal form */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-3">
        <p className="text-xs font-black text-indigo-700 uppercase">Nueva Cotización</p>
        <div className="flex flex-wrap -mx-1.5">
          <InputGroup label="Empresa / Cliente" value={propData.clienteNombre}
            onChange={(e) => setPropData((p) => ({ ...p, clienteNombre: e.target.value }))} width="w-1/3" />
          <InputGroup label="NIT" value={propData.clienteNit}
            onChange={(e) => setPropData((p) => ({ ...p, clienteNit: e.target.value }))} width="w-1/4" />
          <InputGroup label="Contacto" value={propData.clienteContacto}
            onChange={(e) => setPropData((p) => ({ ...p, clienteContacto: e.target.value }))} width="w-1/4" />
          <InputGroup label="Validez (días)" type="number" value={propData.validezDias}
            onChange={(e) => setPropData((p) => ({ ...p, validezDias: e.target.value }))} width="w-1/6 min-w-[80px]" />
        </div>

        {/* Service items */}
        <div className="space-y-2">
          {items.map((item, idx) => (
            <div key={item.id} className="flex gap-2 items-end">
              <div className="flex-1">
                <input value={item.servicio} onChange={(e) => updateItem(idx, 'servicio', e.target.value)}
                  placeholder="Servicio..." className="w-full p-1.5 border border-gray-200 rounded text-xs" />
              </div>
              <div className="w-16">
                <input type="number" value={item.cantidad} onChange={(e) => updateItem(idx, 'cantidad', parseInt(e.target.value) || 0)}
                  className="w-full p-1.5 border border-gray-200 rounded text-xs text-center" />
              </div>
              <div className="w-28">
                <input type="number" value={item.precio} onChange={(e) => updateItem(idx, 'precio', parseFloat(e.target.value) || 0)}
                  className="w-full p-1.5 border border-gray-200 rounded text-xs text-right" />
              </div>
              <p className="text-xs font-bold w-24 text-right">${((item.cantidad || 0) * (item.precio || 0)).toLocaleString('es-CO')}</p>
              {items.length > 1 && (
                <button onClick={() => removeItem(idx)} className="text-red-400 hover:text-red-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          ))}
          <button onClick={addItem} className="text-[10px] text-indigo-600 font-bold hover:text-indigo-800 flex items-center gap-1">
            <Plus className="w-3 h-3" /> Agregar servicio
          </button>
        </div>

        {/* Total */}
        <div className="bg-white rounded-lg p-3 text-right space-y-1">
          <p className="text-xs text-gray-600">Subtotal: <strong>${subtotal.toLocaleString('es-CO')}</strong></p>
          <label className="flex items-center justify-end gap-2 text-xs">
            <input type="checkbox" checked={propData.incluirIVA}
              onChange={(e) => setPropData((p) => ({ ...p, incluirIVA: e.target.checked }))}
              className="w-3 h-3 accent-indigo-600" />
            IVA 19%: <strong>${iva.toLocaleString('es-CO')}</strong>
          </label>
          <p className="text-sm font-black text-indigo-800 border-t pt-1">TOTAL: ${total.toLocaleString('es-CO')}</p>
        </div>

        <div className="flex gap-2">
          <button onClick={() => handleSave('Borrador')} className="px-4 py-2 bg-gray-600 text-white rounded-lg text-xs font-black hover:bg-gray-700">
            💾 Guardar borrador
          </button>
          <button onClick={() => handleSave('Enviada')} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-black hover:bg-indigo-700 flex items-center gap-1">
            <Send className="w-3 h-3" /> Enviar cotización
          </button>
        </div>
      </div>

      {/* Saved proposals */}
      {proposals.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-black text-gray-700 uppercase">Cotizaciones guardadas</p>
          {proposals.sort((a, b) => new Date(b.fecha) - new Date(a.fecha)).map((prop) => (
            <div key={prop.id} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between">
              <div>
                <p className="text-xs font-black text-gray-800">{prop.numero} - {prop.clienteNombre}</p>
                <p className="text-[10px] text-gray-500">{prop.fecha} · ${(prop.total || 0).toLocaleString('es-CO')}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-black px-2 py-1 rounded-full ${
                  prop.estado === 'Aceptada' ? 'bg-emerald-100 text-emerald-700' :
                  prop.estado === 'Enviada' ? 'bg-blue-100 text-blue-700' :
                  prop.estado === 'Rechazada' ? 'bg-red-100 text-red-700' :
                  'bg-gray-100 text-gray-600'
                }`}>{prop.estado}</span>
                <button onClick={() => onPrint?.(prop)} className="p-1 text-gray-400 hover:text-gray-600">
                  <Printer className="w-3.5 h-3.5" />
                </button>
                <button onClick={() => onDelete?.(prop.id)} className="p-1 text-red-400 hover:text-red-600">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
