// src/pages/Caja.jsx
// ═══════════════════════════════════════════════════════════════════════
// CAJA — Control de ingresos/egresos diarios, resumen financiero
// y módulo de contabilidad básica
// ═══════════════════════════════════════════════════════════════════════
import React, { useState, useMemo, useCallback } from 'react';
import {
  Wallet, Plus, Trash2, TrendingUp, TrendingDown, DollarSign,
  Calendar, Filter, Download, ArrowUpCircle, ArrowDownCircle,
  PieChart, BarChart3, FileText, RefreshCw, Clock, Edit3,
  ChevronDown, ChevronUp, Search, AlertTriangle, CheckCircle2,
  CreditCard, Banknote, ArrowLeftRight,
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════════
// CAJA COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export default function Caja({
  cajaMovimientos = [], setCajaMovimientos, cajaForm = {}, setCajaForm,
  currentUser, saveCajaDebounced,
  // Contabilidad mode
  mode,
  contabTab, setContabTab, contabPeriodo, setContabPeriodo,
  // Caja extra state from App
  cajaTab, setCajaTab, cajaFiltroPeriodo, setCajaFiltroPeriodo,
  cajaFiltroDesde, setCajaFiltroDesde, cajaFiltroHasta, setCajaFiltroHasta,
  cajaMedicoPeriodo, setCajaMedicoPeriodo, porcentajeMedico, setPorcentajeMedico,
  usersList = [], patientsList = [],
  savedBillsList = [], setSavedBillsList,
  showAlert, showConfirm,
  ...rest
}) {
  const [editingId, setEditingId] = useState(null);
  const [showForm, setShowForm] = useState(false);

  // ── Helpers ─────────────────────────────────────────────────────────
  const formatCOP = (n) => {
    const v = parseFloat(n) || 0;
    return v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
  };

  const today = new Date().toISOString().split('T')[0];
  const getWeekStart = () => {
    const d = new Date();
    d.setDate(d.getDate() - d.getDay());
    return d.toISOString().split('T')[0];
  };
  const getMonthStart = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
  };

  // ── Filter movements by period ──────────────────────────────────────
  const filteredMovimientos = useMemo(() => {
    const periodo = cajaFiltroPeriodo || 'hoy';
    return cajaMovimientos.filter(m => {
      if (!m.fecha) return false;
      switch (periodo) {
        case 'hoy': return m.fecha === today;
        case 'semana': return m.fecha >= getWeekStart();
        case 'mes': return m.fecha >= getMonthStart();
        case 'personalizado':
          if (cajaFiltroDesde && m.fecha < cajaFiltroDesde) return false;
          if (cajaFiltroHasta && m.fecha > cajaFiltroHasta) return false;
          return true;
        default: return true;
      }
    });
  }, [cajaMovimientos, cajaFiltroPeriodo, cajaFiltroDesde, cajaFiltroHasta, today]);

  // ── Summary stats ───────────────────────────────────────────────────
  const stats = useMemo(() => {
    const ingresos = filteredMovimientos
      .filter(m => m.tipo === 'ingreso')
      .reduce((s, m) => s + (parseFloat(m.monto) || 0), 0);
    const egresos = filteredMovimientos
      .filter(m => m.tipo === 'egreso')
      .reduce((s, m) => s + (parseFloat(m.monto) || 0), 0);
    return { ingresos, egresos, saldo: ingresos - egresos };
  }, [filteredMovimientos]);

  // ── Previous period stats for comparison ────────────────────────────
  const prevStats = useMemo(() => {
    const periodo = cajaFiltroPeriodo || 'hoy';
    let prevStart, prevEnd;
    const d = new Date();

    switch (periodo) {
      case 'hoy': {
        const yesterday = new Date(d);
        yesterday.setDate(yesterday.getDate() - 1);
        prevStart = prevEnd = yesterday.toISOString().split('T')[0];
        break;
      }
      case 'semana': {
        const ws = new Date(d);
        ws.setDate(ws.getDate() - ws.getDay() - 7);
        prevStart = ws.toISOString().split('T')[0];
        const we = new Date(ws);
        we.setDate(we.getDate() + 6);
        prevEnd = we.toISOString().split('T')[0];
        break;
      }
      case 'mes': {
        const pm = new Date(d.getFullYear(), d.getMonth() - 1, 1);
        prevStart = pm.toISOString().split('T')[0];
        const pmEnd = new Date(d.getFullYear(), d.getMonth(), 0);
        prevEnd = pmEnd.toISOString().split('T')[0];
        break;
      }
      default:
        return { ingresos: 0, egresos: 0, saldo: 0 };
    }

    const prevMovs = cajaMovimientos.filter(m =>
      m.fecha >= prevStart && m.fecha <= prevEnd
    );
    const ingresos = prevMovs.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + (parseFloat(m.monto) || 0), 0);
    const egresos = prevMovs.filter(m => m.tipo === 'egreso').reduce((s, m) => s + (parseFloat(m.monto) || 0), 0);
    return { ingresos, egresos, saldo: ingresos - egresos };
  }, [cajaMovimientos, cajaFiltroPeriodo]);

  // ── Add movement ────────────────────────────────────────────────────
  const handleAddMovimiento = () => {
    if (!cajaForm.concepto || !cajaForm.monto || parseFloat(cajaForm.monto) <= 0) {
      showAlert?.('⚠️ Complete concepto y monto válido.');
      return;
    }

    const newMov = {
      id: editingId || 'MOV-' + Date.now(),
      tipo: cajaForm.tipo || 'ingreso',
      concepto: cajaForm.concepto,
      monto: parseFloat(cajaForm.monto),
      formaPago: cajaForm.formaPago || 'Efectivo',
      fecha: cajaForm.fecha || today,
      hora: new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }),
      usuario: currentUser?.user,
      nombreUsuario: currentUser?.name,
    };

    setCajaMovimientos(prev => {
      let updated;
      if (editingId) {
        updated = prev.map(m => m.id === editingId ? newMov : m);
      } else {
        updated = [newMov, ...prev];
      }
      saveCajaDebounced?.(updated);
      return updated;
    });

    setCajaForm({
      tipo: 'ingreso', concepto: '', monto: '', formaPago: 'Efectivo',
      fecha: today,
    });
    setEditingId(null);
    setShowForm(false);
  };

  // ── Delete movement ─────────────────────────────────────────────────
  const handleDelete = (id) => {
    showConfirm?.('¿Eliminar este movimiento?', () => {
      setCajaMovimientos(prev => {
        const updated = prev.filter(m => m.id !== id);
        saveCajaDebounced?.(updated);
        return updated;
      });
    });
  };

  // ── Edit movement ───────────────────────────────────────────────────
  const handleEdit = (mov) => {
    setCajaForm({
      tipo: mov.tipo,
      concepto: mov.concepto,
      monto: String(mov.monto),
      formaPago: mov.formaPago || 'Efectivo',
      fecha: mov.fecha,
    });
    setEditingId(mov.id);
    setShowForm(true);
  };

  // ── Export CSV ──────────────────────────────────────────────────────
  const handleExportCSV = () => {
    const headers = 'Fecha,Hora,Tipo,Concepto,Monto,Forma de Pago,Usuario\n';
    const rows = filteredMovimientos.map(m =>
      `${m.fecha},${m.hora || ''},${m.tipo},${(m.concepto || '').replace(/,/g, ';')},${m.monto},${m.formaPago || ''},${m.nombreUsuario || ''}`
    ).join('\n');
    const csv = '\uFEFF' + headers + rows;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `caja_${cajaFiltroPeriodo || 'hoy'}_${today}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showAlert?.('✅ CSV exportado.');
  };

  // ── Contabilidad mode ───────────────────────────────────────────────
  if (mode === 'contabilidad') return renderContabilidad();

  // ── Percentage change ───────────────────────────────────────────────
  const pctChange = (current, prev) => {
    if (!prev || prev === 0) return current > 0 ? '+100%' : '—';
    const diff = ((current - prev) / prev * 100).toFixed(1);
    return diff > 0 ? `+${diff}%` : `${diff}%`;
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: CONTABILIDAD
  // ═══════════════════════════════════════════════════════════════════════
  function renderContabilidad() {
    const allMovs = cajaMovimientos;
    const totalIngresos = allMovs.filter(m => m.tipo === 'ingreso').reduce((s, m) => s + (parseFloat(m.monto) || 0), 0);
    const totalEgresos = allMovs.filter(m => m.tipo === 'egreso').reduce((s, m) => s + (parseFloat(m.monto) || 0), 0);

    // Group by month
    const byMonth = {};
    allMovs.forEach(m => {
      const key = m.fecha ? m.fecha.substring(0, 7) : 'sin-fecha';
      if (!byMonth[key]) byMonth[key] = { ingresos: 0, egresos: 0 };
      if (m.tipo === 'ingreso') byMonth[key].ingresos += parseFloat(m.monto) || 0;
      else byMonth[key].egresos += parseFloat(m.monto) || 0;
    });

    const months = Object.keys(byMonth).sort().reverse();

    return (
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-6 text-white">
          <h2 className="text-xl font-black flex items-center gap-2">
            <BarChart3 className="w-6 h-6" /> Contabilidad
          </h2>
          <p className="text-violet-100 text-sm mt-1">Resumen financiero consolidado</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-5 text-center">
            <p className="text-xs font-bold text-emerald-600">Total Ingresos</p>
            <p className="text-2xl font-black text-emerald-700 mt-1">{formatCOP(totalIngresos)}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-5 text-center">
            <p className="text-xs font-bold text-red-600">Total Egresos</p>
            <p className="text-2xl font-black text-red-700 mt-1">{formatCOP(totalEgresos)}</p>
          </div>
          <div className={`${totalIngresos - totalEgresos >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-orange-50 border-orange-200'} border rounded-xl p-5 text-center`}>
            <p className="text-xs font-bold text-gray-600">Saldo Neto</p>
            <p className={`text-2xl font-black mt-1 ${totalIngresos - totalEgresos >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
              {formatCOP(totalIngresos - totalEgresos)}
            </p>
          </div>
        </div>

        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="p-4 border-b border-gray-100 bg-gray-50">
            <h3 className="font-black text-sm text-gray-800">Resumen Mensual</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="text-left p-3 font-bold text-gray-600">Mes</th>
                  <th className="text-right p-3 font-bold text-emerald-600">Ingresos</th>
                  <th className="text-right p-3 font-bold text-red-600">Egresos</th>
                  <th className="text-right p-3 font-bold text-gray-700">Saldo</th>
                </tr>
              </thead>
              <tbody>
                {months.map(month => {
                  const data = byMonth[month];
                  const saldo = data.ingresos - data.egresos;
                  return (
                    <tr key={month} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="p-3 font-bold">{month}</td>
                      <td className="p-3 text-right text-emerald-700">{formatCOP(data.ingresos)}</td>
                      <td className="p-3 text-right text-red-600">{formatCOP(data.egresos)}</td>
                      <td className={`p-3 text-right font-bold ${saldo >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>{formatCOP(saldo)}</td>
                    </tr>
                  );
                })}
                {months.length === 0 && (
                  <tr><td colSpan={4} className="p-6 text-center text-gray-400">No hay movimientos</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black flex items-center gap-2">
              <Wallet className="w-6 h-6" /> Caja
            </h2>
            <p className="text-emerald-100 text-sm mt-1">Control de ingresos y egresos</p>
          </div>
          <button onClick={() => { setShowForm(!showForm); setEditingId(null); }}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl font-bold text-sm">
            <Plus className="w-4 h-4" /> Nuevo Movimiento
          </button>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border border-emerald-200 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-100 rounded-xl flex items-center justify-center">
              <ArrowUpCircle className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-emerald-600">Ingresos</p>
              <p className="text-xl font-black text-emerald-700">{formatCOP(stats.ingresos)}</p>
              <p className={`text-[10px] font-bold ${parseFloat(pctChange(stats.ingresos, prevStats.ingresos)) >= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {pctChange(stats.ingresos, prevStats.ingresos)} vs período anterior
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white border border-red-200 rounded-xl p-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
              <ArrowDownCircle className="w-5 h-5 text-red-600" />
            </div>
            <div>
              <p className="text-xs font-bold text-red-600">Egresos</p>
              <p className="text-xl font-black text-red-700">{formatCOP(stats.egresos)}</p>
              <p className={`text-[10px] font-bold ${parseFloat(pctChange(stats.egresos, prevStats.egresos)) <= 0 ? 'text-emerald-500' : 'text-red-500'}`}>
                {pctChange(stats.egresos, prevStats.egresos)} vs período anterior
              </p>
            </div>
          </div>
        </div>

        <div className={`bg-white border rounded-xl p-5 ${stats.saldo >= 0 ? 'border-blue-200' : 'border-orange-200'}`}>
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${stats.saldo >= 0 ? 'bg-blue-100' : 'bg-orange-100'}`}>
              <DollarSign className={`w-5 h-5 ${stats.saldo >= 0 ? 'text-blue-600' : 'text-orange-600'}`} />
            </div>
            <div>
              <p className="text-xs font-bold text-gray-600">Saldo</p>
              <p className={`text-xl font-black ${stats.saldo >= 0 ? 'text-blue-700' : 'text-orange-700'}`}>
                {formatCOP(stats.saldo)}
              </p>
              <p className="text-[10px] font-bold text-gray-400">Ingresos − Egresos</p>
            </div>
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
          <h3 className="font-black text-sm text-gray-800 flex items-center gap-2">
            <Plus className="w-4 h-4 text-emerald-600" />
            {editingId ? 'Editar Movimiento' : 'Nuevo Movimiento'}
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Tipo</label>
              <select value={cajaForm.tipo || 'ingreso'}
                onChange={e => setCajaForm(p => ({ ...p, tipo: e.target.value }))}
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500">
                <option value="ingreso">💰 Ingreso</option>
                <option value="egreso">💸 Egreso</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-gray-600 block mb-1">Concepto</label>
              <input type="text" value={cajaForm.concepto || ''}
                onChange={e => setCajaForm(p => ({ ...p, concepto: e.target.value }))}
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                placeholder="Descripción del movimiento" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Monto (COP)</label>
              <input type="number" min="0" value={cajaForm.monto || ''}
                onChange={e => setCajaForm(p => ({ ...p, monto: e.target.value }))}
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500"
                placeholder="0" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Forma Pago</label>
              <select value={cajaForm.formaPago || 'Efectivo'}
                onChange={e => setCajaForm(p => ({ ...p, formaPago: e.target.value }))}
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500">
                <option value="Efectivo">💵 Efectivo</option>
                <option value="Transferencia">🏦 Transferencia</option>
                <option value="Tarjeta">💳 Tarjeta</option>
                <option value="Nequi">📱 Nequi</option>
                <option value="Daviplata">📱 Daviplata</option>
                <option value="Cheque">🧾 Cheque</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Fecha</label>
              <input type="date" value={cajaForm.fecha || today}
                onChange={e => setCajaForm(p => ({ ...p, fecha: e.target.value }))}
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500" />
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={handleAddMovimiento}
              className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 shadow">
              <CheckCircle2 className="w-4 h-4" /> {editingId ? 'Actualizar' : 'Registrar'}
            </button>
            <button onClick={() => { setShowForm(false); setEditingId(null); }}
              className="px-5 py-2.5 bg-gray-100 text-gray-600 rounded-xl font-bold text-sm hover:bg-gray-200">
              Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Filter bar */}
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-3">
          <span className="text-xs font-bold text-gray-600 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Período:
          </span>
          {[
            { id: 'hoy', label: 'Hoy' },
            { id: 'semana', label: 'Semana' },
            { id: 'mes', label: 'Mes' },
            { id: 'personalizado', label: 'Personalizado' },
          ].map(p => (
            <button key={p.id}
              onClick={() => setCajaFiltroPeriodo(p.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                (cajaFiltroPeriodo || 'hoy') === p.id
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {p.label}
            </button>
          ))}
          {cajaFiltroPeriodo === 'personalizado' && (
            <div className="flex items-center gap-2">
              <input type="date" value={cajaFiltroDesde || ''}
                onChange={e => setCajaFiltroDesde(e.target.value)}
                className="p-1.5 border border-gray-200 rounded-lg text-xs" />
              <span className="text-xs text-gray-400">a</span>
              <input type="date" value={cajaFiltroHasta || ''}
                onChange={e => setCajaFiltroHasta(e.target.value)}
                className="p-1.5 border border-gray-200 rounded-lg text-xs" />
            </div>
          )}
          <div className="ml-auto">
            <button onClick={handleExportCSV}
              className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200">
              <Download className="w-3 h-3" /> CSV
            </button>
          </div>
        </div>
      </div>

      {/* Movements list */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-4 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
          <h3 className="font-black text-sm text-gray-800">
            Movimientos ({filteredMovimientos.length})
          </h3>
        </div>

        {filteredMovimientos.length === 0 ? (
          <div className="p-10 text-center">
            <Wallet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 font-bold">No hay movimientos en este período</p>
            <p className="text-gray-400 text-xs mt-1">Registre un ingreso o egreso para comenzar</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50">
            {filteredMovimientos.map(mov => (
              <div key={mov.id} className="p-4 hover:bg-gray-50 transition flex items-center gap-4">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                  mov.tipo === 'ingreso' ? 'bg-emerald-100' : 'bg-red-100'
                }`}>
                  {mov.tipo === 'ingreso'
                    ? <ArrowUpCircle className="w-5 h-5 text-emerald-600" />
                    : <ArrowDownCircle className="w-5 h-5 text-red-600" />
                  }
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm text-gray-800 truncate">{mov.concepto}</p>
                  <p className="text-xs text-gray-500">
                    {mov.fecha} {mov.hora ? `· ${mov.hora}` : ''} · {mov.formaPago || 'Efectivo'}
                    {mov.nombreUsuario ? ` · ${mov.nombreUsuario}` : ''}
                  </p>
                </div>

                <div className="text-right flex-shrink-0">
                  <p className={`font-black text-sm ${mov.tipo === 'ingreso' ? 'text-emerald-700' : 'text-red-600'}`}>
                    {mov.tipo === 'ingreso' ? '+' : '-'}{formatCOP(mov.monto)}
                  </p>
                </div>

                <div className="flex gap-1 flex-shrink-0">
                  <button onClick={() => handleEdit(mov)}
                    className="p-1.5 text-amber-500 hover:bg-amber-50 rounded-lg">
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(mov.id)}
                    className="p-1.5 text-red-400 hover:bg-red-50 rounded-lg">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Breakdown by payment method */}
      {filteredMovimientos.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="font-black text-sm text-gray-800 mb-4 flex items-center gap-2">
            <PieChart className="w-4 h-4 text-purple-600" /> Desglose por Forma de Pago
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {(() => {
              const byMethod = {};
              filteredMovimientos.forEach(m => {
                const method = m.formaPago || 'Efectivo';
                if (!byMethod[method]) byMethod[method] = { ingresos: 0, egresos: 0 };
                if (m.tipo === 'ingreso') byMethod[method].ingresos += parseFloat(m.monto) || 0;
                else byMethod[method].egresos += parseFloat(m.monto) || 0;
              });
              return Object.entries(byMethod).map(([method, data]) => (
                <div key={method} className="bg-gray-50 rounded-xl p-3 text-center">
                  <p className="text-xs font-bold text-gray-600">{method}</p>
                  <p className="text-sm font-black text-emerald-700 mt-1">+{formatCOP(data.ingresos)}</p>
                  <p className="text-xs font-bold text-red-500">-{formatCOP(data.egresos)}</p>
                </div>
              ));
            })()}
          </div>
        </div>
      )}

      {/* T-01: Sección de Liquidación */}
      <div className="mt-6 bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-5 h-5 text-indigo-600" />
          <h3 className="font-black text-indigo-800">Generar Liquidación</h3>
        </div>
        <p className="text-xs text-indigo-600 mb-3">Genera documento de liquidación para servicios de salud ocupacional</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <button 
            onClick={() => {
              // Generar liquidación - combina ingresos del período
              const liq = {
                titulo: 'LIQUIDACIÓN DE SERVICIOS',
                fecha: today,
                periodo: cajaFiltroPeriodo || 'hoy',
                ingresos: stats.ingresos,
                egresos: stats.egresos,
                saldo: stats.saldo,
                movimientos: filteredMovimientos,
                generadoPor: currentUser?.user || 'Sistema',
              };
              const blob = new Blob([JSON.stringify(liq, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `liquidacion_${today}.json`;
              a.click();
              URL.revokeObjectURL(url);
              showAlert?.('✅ Liquidación exportada');
            }}
            className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700"
          >
            <FileText className="w-3.5 h-3.5 inline mr-1" />
            Exportar Liquidación (JSON)
          </button>
          
          <button 
            onClick={() => {
              // Generar Cuenta de Cobro
              const cxc = {
                numero: `CC-${Date.now()}`,
                fecha: today,
                concepto: 'Servicios de Salud Ocupacional',
                items: filteredMovimientos.filter(m => m.tipo === 'ingreso').map(m => ({
                  descripcion: m.concepto,
                  cantidad: 1,
                  vrUnitario: m.monto,
                  vrTotal: m.monto,
                })),
                subtotal: stats.ingresos,
                iva: Math.round(stats.ingresos * 0.19),
                total: Math.round(stats.ingresos * 1.19),
              };
              const blob = new Blob([JSON.stringify(cxc, null, 2)], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `cuenta_cobro_${cxc.numero}.json`;
              a.click();
              URL.revokeObjectURL(url);
              showAlert?.('✅ Cuenta de cobro exportada');
            }}
            className="px-4 py-2.5 bg-purple-600 text-white rounded-lg text-xs font-bold hover:bg-purple-700"
          >
            <DollarSign className="w-3.5 h-3.5 inline mr-1" />
            Exportar Cuenta de Cobro
          </button>
        </div>
      </div>

      {/* Cuentas por Cobrar */}
      <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-3">
          <CreditCard className="w-5 h-5 text-red-600" />
          <h3 className="font-black text-red-800">Cuentas por Cobrar</h3>
          <span className="ml-auto text-xs font-black text-red-700">
            Pendiente: {(savedBillsList.filter(b => !b.pagada).reduce((s, b) => s + Number(b.amount || 0), 0))
              .toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
          </span>
        </div>

        {savedBillsList.length === 0 ? (
          <p className="text-center py-4 text-gray-400 text-xs italic">
            Sin cuentas de cobro registradas
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-red-100 text-[10px] font-black text-red-700 uppercase">
                <tr>
                  {['#', 'Empresa / Cliente', 'Concepto', 'Monto', 'Fecha', 'Estado', 'Acciones'].map(h => (
                    <th key={h} className="px-3 py-2 text-left">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-red-100">
                {savedBillsList.map((bill, i) => (
                  <tr key={bill.id || i} className={`hover:bg-red-50/50 ${bill.pagada ? 'opacity-60' : ''}`}>
                    <td className="px-3 py-2 text-gray-500 font-mono">{bill.billNumber || bill.numero || `CC-${i + 1}`}</td>
                    <td className="px-3 py-2 font-bold text-gray-800">
                      {bill.companyName || bill.clientName || bill.empresa || '--'}
                    </td>
                    <td className="px-3 py-2 text-gray-600 max-w-[160px] truncate">
                      {bill.concept || bill.concepto || 'Servicios médicos'}
                    </td>
                    <td className="px-3 py-2 font-black text-gray-800">
                      {Number(bill.amount || 0).toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 })}
                    </td>
                    <td className="px-3 py-2 text-gray-500">{bill.date || bill.fecha || '--'}</td>
                    <td className="px-3 py-2">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                        bill.pagada ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                      }`}>
                        {bill.pagada ? '✅ Pagada' : '⏳ Pendiente'}
                      </span>
                    </td>
                    <td className="px-3 py-2">
                      {!bill.pagada && setSavedBillsList && (
                        <button
                          onClick={() => {
                            if (!window.confirm('¿Marcar esta cuenta como pagada?')) return;
                            const updated = savedBillsList.map(b =>
                              b.id === bill.id
                                ? { ...b, pagada: true, fechaPago: new Date().toISOString().split('T')[0] }
                                : b
                            );
                            setSavedBillsList(updated);
                          }}
                          className="px-2 py-1 bg-emerald-600 text-white text-[10px] font-black rounded-lg hover:bg-emerald-700"
                        >
                          Cobrar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
