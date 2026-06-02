import React, { useState } from 'react';
import { Building2, Search, Plus, Edit2, Trash2, Users, MapPin, Phone } from 'lucide-react';

/**
 * CompanyList - Listado y gestión de empresas
 * Incluye búsqueda, CRUD, y vista de sedes
 */
export const CompanyList = ({
  companies = [],
  onEdit,
  onDelete,
  onAdd,
  onSelect,
  patients = [],
}) => {
  const [search, setSearch] = useState('');

  const filtered = companies.filter((c) => {
    const q = search.toLowerCase();
    return (
      (c.nombre || '').toLowerCase().includes(q) ||
      (c.nit || '').includes(q) ||
      (c.ciudad || '').toLowerCase().includes(q)
    );
  });

  const getPatientCount = (compId) =>
    patients.filter((p) => p.empresaId === compId).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
            <Building2 className="w-5 h-5 text-blue-600" />
            Empresas
          </h2>
          <p className="text-xs text-gray-500">{companies.length} empresa(s) registrada(s)</p>
        </div>
        <button onClick={onAdd}
          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> Nueva Empresa
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por nombre, NIT o ciudad..."
          className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-400 outline-none"
        />
      </div>

      {/* Company cards */}
      <div className="grid gap-3">
        {filtered.map((comp) => {
          const patCount = getPatientCount(comp.id);
          return (
            <div key={comp.id}
              className="bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 transition cursor-pointer"
              onClick={() => onSelect?.(comp)}>
              <div className="flex justify-between items-start">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-5 h-5 text-blue-600" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black text-gray-800 truncate">{comp.nombre}</h3>
                      <p className="text-[10px] text-gray-500">
                        NIT: {comp.nit || '--'}{comp.dv ? `-${comp.dv}` : ''}
                      </p>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap gap-3 text-[10px] text-gray-500">
                    {comp.ciudad && (
                      <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {comp.ciudad}</span>
                    )}
                    {comp.telefono && (
                      <span className="flex items-center gap-1"><Phone className="w-3 h-3" /> {comp.telefono}</span>
                    )}
                    <span className="flex items-center gap-1">
                      <Users className="w-3 h-3" /> {patCount} trabajador{patCount !== 1 ? 'es' : ''}
                    </span>
                    {comp.arl && <span className="bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded font-bold">ARL: {comp.arl}</span>}
                  </div>
                  {comp.sedes && comp.sedes.length > 0 && (
                    <p className="text-[9px] text-gray-400 mt-1">
                      {comp.sedes.length} sede(s): {comp.sedes.map((s) => s.nombre || s.ciudad).join(', ')}
                    </p>
                  )}
                </div>
                <div className="flex gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                  <button onClick={() => onEdit?.(comp)}
                    className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg" title="Editar">
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button onClick={() => onDelete?.(comp.id)}
                    className="p-2 text-red-400 hover:bg-red-50 rounded-lg" title="Eliminar">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
        {filtered.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <Building2 className="w-12 h-12 mx-auto mb-2 opacity-30" />
            <p className="text-sm font-bold">{search ? 'No se encontraron empresas' : 'No hay empresas registradas'}</p>
          </div>
        )}
      </div>
    </div>
  );
};
