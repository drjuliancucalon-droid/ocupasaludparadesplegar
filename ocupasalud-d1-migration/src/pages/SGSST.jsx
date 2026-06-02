// src/pages/SGSST.jsx
// Sistema de Gestión de Seguridad y Salud en el Trabajo
// Decreto 1072/2015, Resolución 0312/2019
import React, { useState } from 'react';
import {
  Shield, BarChart3, FileText, AlertTriangle, GraduationCap,
  ClipboardCheck, FolderOpen, Calendar, ScrollText, ChevronRight
} from 'lucide-react';

// Import SG-SST module components
import {
  SSTDashboard,
  PolicyGenerator,
  RiskMatrix,
  AnnualPlan,
  TrainingModule,
  AccidentInvestigation,
  InspectionChecklist,
  DocumentRepository,
} from '../modules/sgsst/index.js';

const SGSST_TABS = [
  { id: 'dashboard', label: 'Dashboard', icon: BarChart3, color: 'blue' },
  { id: 'politica', label: 'Política SST', icon: ScrollText, color: 'indigo' },
  { id: 'riesgos', label: 'Matriz de Riesgos', icon: AlertTriangle, color: 'red' },
  { id: 'plan', label: 'Plan Anual', icon: Calendar, color: 'emerald' },
  { id: 'capacitaciones', label: 'Capacitaciones', icon: GraduationCap, color: 'purple' },
  { id: 'accidentes', label: 'Accidentes', icon: Shield, color: 'amber' },
  { id: 'inspecciones', label: 'Inspecciones', icon: ClipboardCheck, color: 'teal' },
  { id: 'documentos', label: 'Documentos', icon: FolderOpen, color: 'gray' },
];

export default function SGSST({
  currentUser,
  companies = [],
  selectedCompany,
  onSelectCompany,
}) {
  const [activeTab, setActiveTab] = useState('dashboard');
  const currentTabInfo = SGSST_TABS.find(t => t.id === activeTab) || SGSST_TABS[0];

  const renderContent = () => {
    const props = {
      currentUser,
      companies,
      selectedCompany,
      onSelectCompany,
    };

    switch (activeTab) {
      case 'dashboard':
        return <SSTDashboard {...props} />;
      case 'politica':
        return <PolicyGenerator {...props} />;
      case 'riesgos':
        return <RiskMatrix {...props} />;
      case 'plan':
        return <AnnualPlan {...props} />;
      case 'capacitaciones':
        return <TrainingModule {...props} />;
      case 'accidentes':
        return <AccidentInvestigation {...props} />;
      case 'inspecciones':
        return <InspectionChecklist {...props} />;
      case 'documentos':
        return <DocumentRepository {...props} />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4 animate-fade-in">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-600 to-orange-600 rounded-2xl p-6 text-white shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black flex items-center gap-2">
              <Shield className="w-7 h-7" />
              SG-SST
            </h1>
            <p className="text-red-100 mt-1 text-sm">
              Sistema de Gestión de Seguridad y Salud en el Trabajo — Decreto 1072/2015 · Res. 0312/2019
            </p>
          </div>
          {companies.length > 0 && (
            <div>
              <select
                value={selectedCompany || ''}
                onChange={e => onSelectCompany?.(e.target.value)}
                className="px-3 py-1.5 bg-white/20 border border-white/30 rounded-lg text-sm text-white outline-none backdrop-blur-sm"
              >
                <option value="" className="text-gray-800">Todas las empresas</option>
                {companies.map((c, i) => (
                  <option key={c.id || i} value={c.id || c.nombre} className="text-gray-800">
                    {c.nombre}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="flex overflow-x-auto">
          {SGSST_TABS.map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold whitespace-nowrap border-b-2 transition-all ${
                  isActive
                    ? `border-${tab.color}-600 text-${tab.color}-700 bg-${tab.color}-50/50`
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Icon className="w-4 h-4" />
                <span className="hidden md:inline">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="min-h-[400px]">
        {renderContent()}
      </div>
    </div>
  );
}
