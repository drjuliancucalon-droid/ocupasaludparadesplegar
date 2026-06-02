import React, { useState, useEffect, useMemo } from 'react';
import { Users, Search, Filter, Calendar, Building2, SortAsc, SortDesc, User } from 'lucide-react';
import { sp } from '../../../shared/lib/storage';

const PACIENTES_KEY = 'siso_pacientes';

export const PatientList = ({ onSelect, pacientes: pacientesExternos }) => {
  const [pacientes, setPacientes] = useState([]);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEmpresa, setFiltroEmpresa] = useState('');
  const [filtroTipo, setFiltroTipo] = useState('');
  const [ordenDir, setOrdenDir] = useState('desc');

  useEffect(() => {
    if (pacientesExternos) {
      setPacientes(pacientesExternos);
    } else {
      setPacientes(sp(PACIENTES_KEY, []));
    }
  }, [pacientesExternos]);

  const empresas = useMemo(() => {
    const set = new Set();
    pacientes.forEach((p) => {
      const emp = p.empresa || p.empresaNombre;
      if (emp) set.add(emp);
    });
    return Array.from(set).sort();
  }, [pacientes]);

  const tipos = useMemo(() => {
    const set = new Set();
    pacientes.forEach((p) => {
      const tipo = p.tipoExamen || p.tipo;
      if (tipo) set.add(tipo);
    });
    return Array.from(set).sort();
  }, [pacientes]);

  const filtrados = useMemo(() => {
    let lista = pacientes.filter((p) => {
      const q = busqueda.toLowerCase();
      const coincideBusqueda =
        !busqueda ||
        (p.nombres || p.nombre || p.paciente || '').toLowerCase().includes(q) ||
        (p.docNumero || p.documento || '').toLowerCase().includes(q);
      const coincideEmpresa =
        !filtroEmpresa || (p.empresa || p.empresaNombre || '') === filtroEmpresa;
      const coincideTipo =
        !filtroTipo || (p.tipoExamen || p.tipo || '') === filtroTipo;
      return coincideBusqueda && coincideEmpresa && coincideTipo;
    });

    lista.sort((a, b) => {
      const fa = a.fechaExamen || a.fecha || '';
      const fb = b.fechaExamen || b.fecha || '';
      return ordenDir === 'desc' ? fb.localeCompare(fa) : fa.localeCompare(fb);
    });

    return lista;
  }, [pacientes, busqueda, filtroEmpresa, filtroTipo, ordenDir]);

  const conceptoBadge = (concepto) => {
    const c = (concepto || '').toLowerCase();
    if (c.includes('apto sin') || c === 'apto') return 'bg-green-100 text-green-700';
    if (c.includes('apto con')) return 'bg-yellow-100 text-yellow-700';
    if (c.includes('no apto') || c.includes('aplazado')) return 'bg-red-100 text-red-700';
    return 'bg-gray-100 text-gray-600';
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
          <Users className="w-5 h-5 text-teal-600" /> Listado de Pacientes
        </h2>
        <span className="text-sm text-gray-500">{filtrados.length} de {pacientes.length}</span>
      </div>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            placeholder="Buscar por nombre o documento..."
            className="w-full border rounded-lg pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-teal-400"
          />
        </div>
        <div className="relative">
          <Building2 className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
          <select
            value={filtroEmpresa}
            onChange={(e) => setFiltroEmpresa(e.target.value)}
            className="w-full border rounded-lg pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 appearance-none"
          >
            <option value="">Todas las empresas</option>
            {empresas.map((e) => (
              <option key={e} value={e}>{e}</option>
            ))}
          </select>
        </div>
        <div className="relative">
          <Filter className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="w-full border rounded-lg pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 appearance-none"
          >
            <option value="">Todos los tipos</option>
            {tipos.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <button
          onClick={() => setOrdenDir((d) => (d === 'desc' ? 'asc' : 'desc'))}
          className="flex items-center gap-1 px-3 py-2 bg-gray-100 rounded-lg text-sm text-gray-600 hover:bg-gray-200 transition"
        >
          {ordenDir === 'desc' ? <SortDesc className="w-4 h-4" /> : <SortAsc className="w-4 h-4" />}
          Fecha {ordenDir === 'desc' ? '↓' : '↑'}
        </button>
      </div>

      {/* Lista */}
      {filtrados.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Users className="w-12 h-12 mx-auto mb-2 opacity-40" />
          <p>No se encontraron pacientes</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filtrados.map((p) => (
            <div
              key={p.id || p.docNumero || p.documento || Math.random()}
              onClick={() => onSelect && onSelect(p)}
              className={`bg-white border rounded-xl p-4 hover:shadow-md transition ${
                onSelect ? 'cursor-pointer' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center">
                    <User className="w-5 h-5 text-teal-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{p.nombres || p.nombre || p.paciente || 'Sin nombre'}</p>
                    <p className="text-xs text-gray-500">{p.docTipo || 'CC'} {p.docNumero || p.documento || 'N/A'}</p>
                  </div>
                </div>
                {(p.concepto || p.conceptoAptitud) && (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${conceptoBadge(p.concepto || p.conceptoAptitud)}`}>
                    {p.concepto || p.conceptoAptitud}
                  </span>
                )}
              </div>
              <div className="mt-2 flex flex-wrap gap-2 text-[10px] text-gray-400">
                {(p.empresa || p.empresaNombre) && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3" /> {p.empresa || p.empresaNombre}
                  </span>
                )}
                {(p.tipoExamen || p.tipo) && (
                  <span className="flex items-center gap-1">
                    <Filter className="w-3 h-3" /> {p.tipoExamen || p.tipo}
                  </span>
                )}
                {(p.fechaExamen || p.fecha) && (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" /> {p.fechaExamen || p.fecha}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
