// src/pages/ContabilidadPage.jsx — Accounting / Doctor honoraries
import React, { useState, useMemo } from 'react';
import { Calculator, TrendingUp, DollarSign, Calendar, BarChart3 } from 'lucide-react';
import { useBackendData } from '../hooks/useBackendData';
import { useAuthStore } from '../stores/authStore';

export default function ContabilidadPage() {
  const { currentUser } = useAuthStore();
  const { data: patients } = useBackendData('/data/patients', 'siso_db_patients', 'patients');
  const { data: bills } = useBackendData('/data/bills', 'siso_saved_bills', 'bills');
  const [periodo, setPeriodo] = useState('mes');
  const [porcentaje, setPorcentaje] = useState(60);

  const now = new Date();
  const stats = useMemo(() => {
    const thisMonth = now.toISOString().substring(0, 7);
    const thisYear = now.getFullYear().toString();
    const filter = periodo === 'mes' ? thisMonth : thisYear;
    const hcMes = patients.filter((p) => (p.fechaExamen || '').startsWith(filter));
    const totalFacturado = bills.filter((b) => (b.fecha || '').startsWith(filter)).reduce((s, b) => s + (parseFloat(b.total) || 0), 0);
    const honorarios = totalFacturado * (porcentaje / 100);
    return { hcCount: hcMes.length, totalFacturado, honorarios, clinica: totalFacturado - honorarios };
  }, [patients, bills, periodo, porcentaje]);

  const fmt = (n) => new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(n);

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-6"><Calculator className="w-6 h-6 text-emerald-600" /><h1 className="text-2xl font-bold text-gray-800">Contabilidad</h1></div>

      <div className="flex gap-3 mb-6">
        <select value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="mes">Este mes</option><option value="año">Este año</option>
        </select>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-gray-500">Honorarios médico:</span>
          <input type="number" min="0" max="100" value={porcentaje} onChange={(e) => setPorcentaje(parseInt(e.target.value) || 0)} className="w-16 border rounded-lg px-2 py-1 text-sm text-center" />
          <span className="text-gray-500">%</span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {[
          { icon: BarChart3, label: 'HC realizadas', value: stats.hcCount, color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { icon: DollarSign, label: 'Total facturado', value: fmt(stats.totalFacturado), color: 'text-teal-600', bg: 'bg-teal-50' },
          { icon: TrendingUp, label: `Honorarios (${porcentaje}%)`, value: fmt(stats.honorarios), color: 'text-emerald-700', bg: 'bg-emerald-50' },
          { icon: Calculator, label: `Clínica (${100 - porcentaje}%)`, value: fmt(stats.clinica), color: 'text-gray-600', bg: 'bg-gray-50' },
        ].map((s, i) => (
          <div key={i} className="bg-white border rounded-xl p-5">
            <div className={`${s.bg} w-10 h-10 rounded-xl flex items-center justify-center mb-3`}><s.icon className={`w-5 h-5 ${s.color}`} /></div>
            <p className="text-xl font-black text-gray-800">{s.value}</p>
            <p className="text-xs text-gray-500 mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-xs text-emerald-700">
        <p className="font-bold">Período: {periodo === 'mes' ? now.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' }) : now.getFullYear()}</p>
        <p className="mt-1">Los datos se calculan a partir de las HC registradas y las facturas guardadas. Ajusta el porcentaje de honorarios según el convenio.</p>
      </div>
    </div>
  );
}
