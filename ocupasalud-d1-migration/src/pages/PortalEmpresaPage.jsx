// src/pages/PortalEmpresaPage.jsx — Company Portal
// T-07: Completar Portal Empresa - Excel export
import React from 'react';
import { CompanyPortal } from '../modules/companies/components/CompanyPortal';
import { useBackendData } from '../hooks/useBackendData';
import { Building2, Loader2, Download } from 'lucide-react';

export default function PortalEmpresaPage() {
  const { data: companies, loading } = useBackendData('/data/companies', 'siso_companies', 'companies');
  const { data: patients } = useBackendData('/data/patients', 'siso_db_patients', 'patients');

  // T-07: Exportar empresas a Excel/CSV
  const handleExportExcel = () => {
    if (!companies || companies.length === 0) { alert('No hay empresas para exportar'); return; }
    const headers = 'Nombre,NIT,Actividad,E-mail,Teléfono,Dirección,ARL,Employees\n';
    const rows = companies.map(c => 
      `"${(c.razonSocial || c.nombre || '').replace(/"/g, '""')}","${c.nit || ''}","${c.actividadeconomica || ''}","${c.email || ''}","${c.telefono || ''}","${c.direccion || ''}","${c.arl || ''}","${c.empleados || 0}"`
    ).join('\n');
    const csv = '\uFEFF' + headers + rows;
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `empresas_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Building2 className="w-6 h-6 text-orange-600" />
          <h1 className="text-2xl font-bold text-gray-800">Portal Empresa</h1>
        </div>
        <button 
          onClick={handleExportExcel}
          className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg text-sm font-bold hover:bg-orange-700"
        >
          <Download className="w-4 h-4" />
          Exportar Excel
        </button>
      </div>
      <CompanyPortal companies={companies} patients={patients} />
    </div>
  );
}
