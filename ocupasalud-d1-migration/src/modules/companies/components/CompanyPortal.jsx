import React, { useState } from 'react';
import { Building2, Users, FileText, BarChart3, Search, Download, Eye } from 'lucide-react';

/**
 * CompanyPortal - Portal de empresa (admin_empresa)
 * Vista restringida de trabajadores y certificados de la empresa
 */
export const CompanyPortal = ({
  company,
  patients = [],
  onViewCertificate,
  onExportList,
  onBack,
}) => {
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState('trabajadores');

  const companyPatients = patients.filter((p) => p.empresaId === company?.id);
  const filtered = companyPatients.filter((p) => {
    const q = search.toLowerCase();
    return (
      (p.nombres || '').toLowerCase().includes(q) ||
      (p.docNumero || '').includes(q) ||
      (p.cargo || '').toLowerCase().includes(q)
    );
  });

  // Stats
  const total = companyPatients.length;
  const aptos = companyPatients.filter((p) => (p.conceptoAptitud || '').toLowerCase().includes('apto') && !(p.conceptoAptitud || '').toLowerCase().includes('no apto')).length;
  const conRestricciones = companyPatients.filter((p) => (p.conceptoAptitud || '').toLowerCase().includes('restricc')).length;
  const noAptos = companyPatients.filter((p) => (p.conceptoAptitud || '').toLowerCase().includes('no apto')).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-600 rounded-2xl p-5 text-white">
        <div className="flex justify-between items-start">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-black text-lg">{company?.nombre || 'Portal Empresa'}</h1>
              <p className="text-blue-200 text-xs">NIT: {company?.nit || '--'} · {company?.ciudad || ''}</p>
            </div>
          </div>
          {onBack && (
            <button onClick={onBack} className="text-white/70 hover:text-white text-xs font-bold bg-white/10 px-3 py-1.5 rounded-lg">
              ← Volver
            </button>
          )}
        </div>

        {/* Stats */}
        <div className="grid grid-cols-4 gap-3 mt-4">
          {[
            { label: 'Total evaluados', value: total, icon: Users, color: 'bg-white/20' },
            { label: 'Aptos', value: aptos, icon: FileText, color: 'bg-emerald-500/30' },
            { label: 'Con restricciones', value: conRestricciones, icon: FileText, color: 'bg-amber-500/30' },
            { label: 'No aptos', value: noAptos, icon: FileText, color: 'bg-red-500/30' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className={`${color} rounded-xl p-3`}>
              <Icon className="w-4 h-4 mb-1 text-white/70" />
              <p className="text-xl font-black">{value}</p>
              <p className="text-[10px] text-white/70">{label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar trabajador por nombre, cédula o cargo..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 outline-none" />
      </div>

      {/* Export button */}
      {onExportList && (
        <button onClick={() => onExportList(companyPatients, company?.nombre)}
          className="px-4 py-2 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl text-xs font-bold hover:bg-emerald-100 flex items-center gap-1.5">
          <Download className="w-4 h-4" /> Exportar listado Excel
        </button>
      )}

      {/* Workers list */}
      <div className="space-y-2">
        {filtered.map((p) => {
          const concepto = p.conceptoAptitud || 'Pendiente';
          const colorConcepto =
            concepto.toLowerCase().includes('no apto') ? 'bg-red-100 text-red-800' :
            concepto.toLowerCase().includes('restricc') ? 'bg-amber-100 text-amber-800' :
            concepto.toLowerCase().includes('apto') ? 'bg-emerald-100 text-emerald-800' :
            'bg-gray-100 text-gray-600';

          return (
            <div key={p.id} className="bg-white border border-gray-200 rounded-xl p-3 flex items-center justify-between hover:border-blue-200 transition">
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-gray-800 truncate">{p.nombres}</p>
                <p className="text-[10px] text-gray-500">
                  {p.docTipo || 'CC'} {p.docNumero} · {p.cargo || '--'} · Evaluado: {p.fechaExamen || '--'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-[9px] font-black px-2 py-1 rounded-full ${colorConcepto}`}>
                  {concepto}
                </span>
                {onViewCertificate && (
                  <button onClick={() => onViewCertificate(p)}
                    className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg" title="Ver certificado">
                    <Eye className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-bold">No se encontraron trabajadores</p>
          </div>
        )}
      </div>

      {/* Legal notice */}
      <div className="bg-blue-50 border border-blue-100 rounded-xl p-3 text-[10px] text-blue-700">
        <p className="font-black">🔒 Información confidencial - Res. 1843/2025 Art. 12</p>
        <p className="mt-0.5">
          Solo se muestra el concepto de aptitud. La historia clínica completa es de acceso
          exclusivo del médico evaluador (Ley 23/1981, Res. 1995/1999).
        </p>
      </div>
    </div>
  );
};
