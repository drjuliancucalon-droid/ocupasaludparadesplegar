// src/pages/BillingPage.jsx — Billing with tabs: Facturación + Propuestas + DIAN
// Sprint 1.6: Integrates Proposals and DIANExport
import React, { useState } from 'react';
import { BillGenerator } from '../modules/billing/components/BillGenerator';
import { Proposals } from '../modules/billing/components/Proposals';
import { DIANExport } from '../modules/billing/components/DIANExport';
import { useBackendData } from '../hooks/useBackendData';
import { Receipt, FileText, Upload, Loader2, Cloud, HardDrive } from 'lucide-react';

const TABS = [
  { id: 'facturacion', label: 'Facturación', icon: Receipt },
  { id: 'propuestas', label: 'Propuestas', icon: FileText },
  { id: 'dian', label: 'DIAN', icon: Upload },
];

export default function BillingPage() {
  const [activeTab, setActiveTab] = useState('facturacion');
  const { data: atencionesData, loading: la } = useBackendData('/data/atenciones_cerradas', 'siso_atenciones_cerradas', 'atenciones'); const atencionesCerradas = atencionesData || []; const { data: pacientesData, loading: lp } = useBackendData('/data/patients', 'siso_patients_drcucalon', 'patients'); const patients = pacientesData || []
const { data: companies, loading: lc } = useBackendData('/data/companies', 'siso_companies', 'companies');
  const { data: bills, loading: lb, source } = useBackendData('/data/bills', 'siso_saved_bills', 'bills');

  const loading = lc || lb || la || lp;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <Receipt className="w-6 h-6 text-green-600" />
          <h1 className="text-2xl font-bold text-gray-800">Facturación</h1>
        </div>
        {!loading && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            {source !== 'local' && source !== 'none' ? <Cloud className="w-3 h-3 text-emerald-500" /> : <HardDrive className="w-3 h-3" />}
            <span>{source === 'local' || source === 'none' ? 'Local' : 'Supabase'}</span>
          </div>
        )}
      </div>

      {/* Sub-tabs */}
      <div className="flex gap-1 mb-6">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeTab === tab.id
                ? 'bg-emerald-100 text-emerald-800 shadow-sm'
                : 'text-gray-500 hover:bg-gray-100'
            }`}
          >
            <tab.icon className="w-3.5 h-3.5" />
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
        </div>
      ) : (
        <>
          {activeTab === 'facturacion' && <BillGenerator companies={companies} savedBills={bills} atencionesCerradas={atencionesCerradas} patients={patients} />}
          {activeTab === 'propuestas' && <Proposals />}
          {activeTab === 'dian' && <DIANExport bills={bills} companies={companies} />}
        </>
      )}
    </div>
  );
}
