import React, { useState, useMemo } from 'react';
import { Wallet, Plus, Trash2, CheckCircle2, Calendar, Download, DollarSign } from 'lucide-react';
import { InputGroup } from '../../../shared/components/ui/InputGroup';
import { SelectGroup } from '../../../shared/components/ui/SelectGroup';

/**
 * CashBox - Módulo de Caja (movimientos y resumen)
 * Control de ingresos, egresos, formas de pago
 */
export const CashBox = ({ movements = [], onAddMovement, onDeleteMovement, onMarkPaid, savedBills = [] }) => {
  const [showAdd, setShowAdd] = useState(false);
  const [newMov, setNewMov] = useState({
    tipo: 'ingreso', descripcion: '', monto: '', formaPago: 'Efectivo', fecha: new Date().toISOString().split('T')[0],
  });
  const [periodoFilter, setPeriodoFilter] = useState('mes');

  const now = new Date();
  const filteredMovs = useMemo(() => {
    return movements.filter((m) => {
      const d = new Date(m.fecha || m.createdAt);
      if (periodoFilter === 'hoy') return d.toDateString() === now.toDateString();
      if (periodoFilter === 'semana') return now - d < 7 * 86400000;
      if (periodoFilter === 'mes') return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      return true;
    });
  }, [movements, periodoFilter]);

  const totalIngresos = filteredMovs.filter((m) => m.tipo === 'ingreso').reduce((s, m) => s + (parseFloat(m.monto) || 0), 0);
  const totalEgresos = filteredMovs.filter((m) => m.tipo === 'egreso').reduce((s, m) => s + (parseFloat(m.monto) || 0), 0);
  const saldo = totalIngresos - totalEgresos;

  const handleAdd = () => {
    if (!newMov.monto || !newMov.descripcion) return;
    onAddMovement?.({ ...newMov, id: Date.now(), monto: parseFloat(newMov.monto), createdAt: new Date().toISOString() });
    setNewMov({ tipo: 'ingreso', descripcion: '', monto: '', formaPago: 'Efectivo', fecha: new Date().toISOString().split('T')[0] });
    setShowAdd(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
          <Wallet className="w-5 h-5 text-emerald-600" /> Caja
        </h2>
        <div className="flex gap-2">
          <select value={periodoFilter} onChange={(e) => setPeriodoFilter(e.target.value)}
            className="text-xs border border-gray-200 rounded-lg px-2 py-1 font-bold">
            <option value="hoy">Hoy</option>
            <option value="semana">Esta semana</option>
            <option value="mes">Este mes</option>
            <option value="todo">Todo</option>
          </select>
          <button onClick={() => setShowAdd(true)}
            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-xs font-black hover:bg-emerald-700 flex items-center gap-1">
            <Plus className="w-3 h-3" /> Nuevo movimiento
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
          <p className="text-[10px] font-black text-emerald-600 uppercase">Ingresos</p>
          <p className="text-lg font-black text-emerald-800">${totalIngresos.toLocaleString('es-CO')}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3">
          <p className="text-[10px] font-black text-red-600 uppercase">Egresos</p>
          <p className="text-lg font-black text-red-800">${totalEgresos.toLocaleString('es-CO')}</p>
        </div>
        <div className={`border rounded-xl p-3 ${saldo >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'}`}>
          <p className="text-[10px] font-black text-gray-600 uppercase">Saldo</p>
          <p className={`text-lg font-black ${saldo >= 0 ? 'text-blue-800' : 'text-orange-800'}`}>
            ${saldo.toLocaleString('es-CO')}
          </p>
        </div>
      </div>

      {/* New movement form */}
      {showAdd && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2">
          <p className="text-xs font-black text-gray-700">Nuevo movimiento</p>
          <div className="flex flex-wrap -mx-1.5">
            <SelectGroup label="Tipo" value={newMov.tipo}
              onChange={(e) => setNewMov((p) => ({ ...p, tipo: e.target.value }))}
              options={[{ v: 'ingreso', l: '📈 Ingreso' }, { v: 'egreso', l: '📉 Egreso' }]} width="w-1/4" />
            <InputGroup label="Descripción" value={newMov.descripcion}
              onChange={(e) => setNewMov((p) => ({ ...p, descripcion: e.target.value }))} width="w-1/2" />
            <InputGroup label="Monto $" type="number" value={newMov.monto}
              onChange={(e) => setNewMov((p) => ({ ...p, monto: e.target.value }))} width="w-1/4" />
            <SelectGroup label="Forma de pago" value={newMov.formaPago}
              onChange={(e) => setNewMov((p) => ({ ...p, formaPago: e.target.value }))}
              options={['Efectivo', 'Transferencia', 'Tarjeta', 'Cheque']} width="w-1/4" />
            <InputGroup label="Fecha" type="date" value={newMov.fecha}
              onChange={(e) => setNewMov((p) => ({ ...p, fecha: e.target.value }))} width="w-1/4" />
          </div>
          <div className="flex gap-2">
            <button onClick={handleAdd} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-xs font-black hover:bg-emerald-700">
              Registrar
            </button>
            <button onClick={() => setShowAdd(false)} className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-xs font-bold">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Movements list */}
      <div className="space-y-1.5">
        {filteredMovs.length === 0 ? (
          <div className="text-center py-8 text-gray-400">
            <DollarSign className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-bold">No hay movimientos en el período</p>
          </div>
        ) : (
          filteredMovs.sort((a, b) => new Date(b.fecha || b.createdAt) - new Date(a.fecha || a.createdAt)).map((mov) => (
            <div key={mov.id} className={`flex items-center gap-3 p-3 rounded-xl border ${
              mov.tipo === 'ingreso' ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
            }`}>
              <span className="text-lg">{mov.tipo === 'ingreso' ? '📈' : '📉'}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-gray-800 truncate">{mov.descripcion}</p>
                <p className="text-[10px] text-gray-500">{mov.fecha} · {mov.formaPago}</p>
              </div>
              <span className={`text-sm font-black ${mov.tipo === 'ingreso' ? 'text-emerald-700' : 'text-red-700'}`}>
                {mov.tipo === 'ingreso' ? '+' : '-'}${(parseFloat(mov.monto) || 0).toLocaleString('es-CO')}
              </span>
              <button onClick={() => onDeleteMovement?.(mov.id)} className="text-gray-400 hover:text-red-500">
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
