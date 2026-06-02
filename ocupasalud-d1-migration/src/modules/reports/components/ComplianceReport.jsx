import React, { useMemo } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Percent } from 'lucide-react';

/**
 * ComplianceReport - Reporte de cumplimiento porcentual
 * Res. 0312/2019 - Estándares mínimos SG-SST
 */
export const ComplianceReport = ({ patients = [], companies = [], users = [], sgsstData = {} }) => {
  const metrics = useMemo(() => {
    const items = [
      { label: 'Política SST documentada', weight: 4, check: () => !!sgsstData.politica },
      { label: 'Identificación de peligros (GTC-45)', weight: 6, check: () => !!sgsstData.matrizRiesgos },
      { label: 'Evaluaciones médicas ocupacionales', weight: 6, check: () => patients.length > 0 },
      { label: 'Plan anual de trabajo SST', weight: 5, check: () => !!sgsstData.planAnual },
      { label: 'Programa de capacitación', weight: 5, check: () => !!sgsstData.capacitaciones },
      { label: 'COPASST / Vigía SST', weight: 4, check: () => !!sgsstData.copasst },
      { label: 'Indicadores de gestión SST', weight: 4, check: () => !!sgsstData.indicadores },
      { label: 'Investigación de AT', weight: 4, check: () => !!sgsstData.investigaciones },
      { label: 'Programas SVE', weight: 5, check: () => !!sgsstData.sve },
      { label: 'Inspecciones de seguridad', weight: 4, check: () => !!sgsstData.inspecciones },
      { label: 'Gestión del cambio', weight: 3, check: () => !!sgsstData.gestionCambio },
      { label: 'Auditoría interna', weight: 5, check: () => !!sgsstData.auditoria },
      { label: 'Revisión por la dirección', weight: 5, check: () => !!sgsstData.revisionDireccion },
      { label: 'Plan de emergencias', weight: 5, check: () => !!sgsstData.planEmergencias },
      { label: 'Reportes ARL', weight: 3, check: () => !!sgsstData.reportesARL },
    ];

    const maxScore = items.reduce((s, i) => s + i.weight, 0);
    const score = items.reduce((s, i) => s + (i.check() ? i.weight : 0), 0);
    const pct = maxScore > 0 ? ((score / maxScore) * 100).toFixed(1) : 0;

    return { items, maxScore, score, pct: parseFloat(pct) };
  }, [patients, sgsstData]);

  const getColor = (pct) => {
    if (pct >= 85) return { bg: 'bg-emerald-500', text: 'text-emerald-700', label: 'ACEPTABLE' };
    if (pct >= 60) return { bg: 'bg-amber-500', text: 'text-amber-700', label: 'MODERADAMENTE ACEPTABLE' };
    return { bg: 'bg-red-500', text: 'text-red-700', label: 'CRÍTICO' };
  };

  const color = getColor(metrics.pct);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
        <Percent className="w-5 h-5 text-indigo-600" /> Reporte de Cumplimiento SG-SST
      </h2>

      {/* Score card */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-700 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-indigo-200 text-xs font-bold uppercase">Cumplimiento Res. 0312/2019</p>
            <p className="text-4xl font-black mt-1">{metrics.pct}%</p>
            <p className={`text-sm font-black mt-1 px-3 py-1 rounded-full inline-block ${
              metrics.pct >= 85 ? 'bg-emerald-500/30' : metrics.pct >= 60 ? 'bg-amber-500/30' : 'bg-red-500/30'
            }`}>{color.label}</p>
          </div>
          <div className="w-24 h-24 relative">
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40" stroke="rgba(255,255,255,0.2)" strokeWidth="10" fill="none" />
              <circle cx="50" cy="50" r="40" stroke="white" strokeWidth="10" fill="none"
                strokeDasharray={`${metrics.pct * 2.51} ${251 - metrics.pct * 2.51}`}
                strokeLinecap="round" />
            </svg>
          </div>
        </div>
        <p className="text-xs text-indigo-200 mt-3">
          {metrics.score} de {metrics.maxScore} puntos · Evaluación basada en estándares mínimos
        </p>
      </div>

      {/* Checklist */}
      <div className="space-y-1.5">
        {metrics.items.map((item) => {
          const passed = item.check();
          return (
            <div key={item.label} className={`flex items-center gap-2 p-2.5 rounded-xl border ${
              passed ? 'border-emerald-200 bg-emerald-50' : 'border-red-200 bg-red-50'
            }`}>
              {passed ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
              )}
              <span className={`text-xs flex-1 ${passed ? 'text-emerald-800' : 'text-red-800'} font-medium`}>
                {item.label}
              </span>
              <span className="text-[10px] font-bold text-gray-500">{item.weight} pts</span>
            </div>
          );
        })}
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-[10px] text-blue-700">
        <p className="font-black">📋 Res. 0312/2019 - Estándares mínimos</p>
        <p className="mt-0.5">
          &ge; 85%: Aceptable (mantener y mejorar). 60-84%: Moderadamente aceptable (plan de mejora 6 meses).
          &lt; 60%: Crítico (acción inmediata requerida).
        </p>
      </div>
    </div>
  );
};
