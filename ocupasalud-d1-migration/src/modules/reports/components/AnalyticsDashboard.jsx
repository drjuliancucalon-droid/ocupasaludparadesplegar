import React, { useMemo } from 'react';
import { BarChart3, Users, FileText, TrendingUp, Calendar, Building2 } from 'lucide-react';

/**
 * AnalyticsDashboard - Panel de analítica general
 * Métricas de productividad, volumen, y tendencias
 */
export const AnalyticsDashboard = ({ patients = [], companies = [], users = [], bills = [] }) => {
  const stats = useMemo(() => {
    const now = new Date();
    const thisMonth = patients.filter((p) => {
      const d = new Date(p.fechaExamen);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const lastMonth = patients.filter((p) => {
      const d = new Date(p.fechaExamen);
      const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      return d.getMonth() === lm.getMonth() && d.getFullYear() === lm.getFullYear();
    });

    const monthlyRevenue = (bills || [])
      .filter((b) => {
        const d = new Date(b.fecha);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
      })
      .reduce((s, b) => s + (parseFloat(b.total || b.amount) || 0), 0);

    // Type distribution
    const types = {};
    patients.forEach((p) => {
      const t = p.tipoExamen || 'Otro';
      types[t] = (types[t] || 0) + 1;
    });

    // Top companies
    const compCounts = {};
    patients.forEach((p) => {
      if (p.empresaNombre && p.empresaNombre !== 'PARTICULAR') {
        compCounts[p.empresaNombre] = (compCounts[p.empresaNombre] || 0) + 1;
      }
    });
    const topCompanies = Object.entries(compCounts).sort((a, b) => b[1] - a[1]).slice(0, 5);

    return {
      totalPatients: patients.length,
      thisMonthCount: thisMonth.length,
      lastMonthCount: lastMonth.length,
      growthPct: lastMonth.length > 0
        ? (((thisMonth.length - lastMonth.length) / lastMonth.length) * 100).toFixed(0)
        : thisMonth.length > 0 ? '+100' : '0',
      totalCompanies: companies.length,
      totalUsers: users.length,
      monthlyRevenue,
      typeDistribution: types,
      topCompanies,
    };
  }, [patients, companies, users, bills]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
        <BarChart3 className="w-5 h-5 text-blue-600" /> Panel de Analítica
      </h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Evaluados', value: stats.totalPatients, icon: Users, color: 'blue' },
          { label: 'Este Mes', value: stats.thisMonthCount, icon: Calendar, color: 'emerald',
            badge: stats.growthPct !== '0' ? `${stats.growthPct > 0 ? '+' : ''}${stats.growthPct}%` : null },
          { label: 'Empresas', value: stats.totalCompanies, icon: Building2, color: 'purple' },
          { label: 'Ingresos Mes', value: `$${(stats.monthlyRevenue / 1000).toFixed(0)}K`, icon: TrendingUp, color: 'amber' },
        ].map(({ label, value, icon: Icon, color, badge }) => (
          <div key={label} className={`bg-${color}-50 border border-${color}-200 rounded-xl p-4`}>
            <div className="flex justify-between items-start">
              <Icon className={`w-5 h-5 text-${color}-500`} />
              {badge && (
                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded-full ${
                  parseInt(badge) >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                }`}>{badge}</span>
              )}
            </div>
            <p className="text-2xl font-black text-gray-800 mt-2">{value}</p>
            <p className="text-[10px] text-gray-500 font-bold">{label}</p>
          </div>
        ))}
      </div>

      {/* Distribution and rankings */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Type distribution */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-black text-gray-700 mb-3">Distribución por tipo de examen</p>
          <div className="space-y-2">
            {Object.entries(stats.typeDistribution).sort((a, b) => b[1] - a[1]).map(([type, count]) => {
              const pct = stats.totalPatients > 0 ? ((count / stats.totalPatients) * 100).toFixed(0) : 0;
              return (
                <div key={type} className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-600 w-28 truncate">{type}</span>
                  <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                    <div className="bg-blue-500 h-full rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="text-[10px] font-bold text-gray-700 w-12 text-right">{count} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top companies */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs font-black text-gray-700 mb-3">Top 5 Empresas por Volumen</p>
          <div className="space-y-2">
            {stats.topCompanies.map(([name, count], i) => (
              <div key={name} className="flex items-center gap-2">
                <span className="w-5 h-5 bg-purple-100 text-purple-700 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0">
                  {i + 1}
                </span>
                <span className="text-xs text-gray-700 flex-1 truncate font-medium">{name}</span>
                <span className="text-xs font-black text-gray-800">{count}</span>
              </div>
            ))}
            {stats.topCompanies.length === 0 && (
              <p className="text-xs text-gray-400 italic">Sin datos de empresas</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
