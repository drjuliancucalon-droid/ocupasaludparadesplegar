import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Search, CheckCircle, Clock, User, Filter } from 'lucide-react';
import { sp, _ls } from '../../../shared/lib/storage';

const STORAGE_KEY = 'siso_agendados';

const STATUS_CONFIG = {
  espera: { label: 'En espera', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  atendiendo: { label: 'Atendiendo', color: 'bg-blue-100 text-blue-800', icon: User },
  atendido: { label: 'Atendido', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  no_asistio: { label: 'No asistió', color: 'bg-red-100 text-red-800', icon: Clock },
};

export const AgendaView = ({ currentUser }) => {
  const [citas, setCitas] = useState([]);
  const [filtroFecha, setFiltroFecha] = useState(new Date().toISOString().slice(0, 10));
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('todos');

  useEffect(() => {
    setCitas(sp(STORAGE_KEY, []));
  }, []);

  const guardar = (nuevas) => {
    setCitas(nuevas);
    _ls.setItem(STORAGE_KEY, JSON.stringify(nuevas));
  };

  const cambiarEstado = (id, nuevoEstado) => {
    const actualizadas = citas.map((c) =>
      c.id === id ? { ...c, estado: nuevoEstado, updatedAt: new Date().toISOString() } : c
    );
    guardar(actualizadas);
  };

  const citasFiltradas = useMemo(() => {
    return citas.filter((c) => {
      const coincideFecha = c.fecha === filtroFecha;
      const coincideBusqueda =
        !busqueda ||
        (c.paciente || '').toLowerCase().includes(busqueda.toLowerCase()) ||
        (c.documento || '').toLowerCase().includes(busqueda.toLowerCase());
      const coincideEstado = filtroEstado === 'todos' || c.estado === filtroEstado;
      return coincideFecha && coincideBusqueda && coincideEstado;
    });
  }, [citas, filtroFecha, busqueda, filtroEstado]);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
        <Calendar className="w-5 h-5 text-teal-600" /> Agenda de Citas
      </h2>

      {/* Filtros */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Fecha</label>
          <input
            type="date"
            value={filtroFecha}
            onChange={(e) => setFiltroFecha(e.target.value)}
            className="w-full border rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-teal-400"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Buscar paciente</label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Nombre o documento..."
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="w-full border rounded-lg pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-teal-400"
            />
          </div>
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Estado</label>
          <div className="relative">
            <Filter className="absolute left-2 top-2.5 w-4 h-4 text-gray-400" />
            <select
              value={filtroEstado}
              onChange={(e) => setFiltroEstado(e.target.value)}
              className="w-full border rounded-lg pl-8 pr-3 py-2 text-sm focus:ring-2 focus:ring-teal-400 appearance-none"
            >
              <option value="todos">Todos</option>
              <option value="espera">En espera</option>
              <option value="atendiendo">Atendiendo</option>
              <option value="atendido">Atendido</option>
            </select>
          </div>
        </div>
        <div className="flex items-end">
          <span className="text-sm text-gray-500">
            {citasFiltradas.length} cita(s) encontrada(s)
          </span>
        </div>
      </div>

      {/* Lista de citas */}
      {citasFiltradas.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <Calendar className="w-12 h-12 mx-auto mb-2 opacity-40" />
          <p>No hay citas para esta fecha</p>
        </div>
      ) : (
        <div className="space-y-2">
          {citasFiltradas.map((cita) => {
            const cfg = STATUS_CONFIG[cita.estado] || STATUS_CONFIG.espera;
            const Icon = cfg.icon;
            return (
              <div
                key={cita.id}
                className="flex items-center justify-between bg-white border rounded-xl p-4 hover:shadow-md transition"
              >
                <div className="flex items-center gap-4">
                  <div className="text-center min-w-[60px]">
                    <div className="text-lg font-bold text-teal-700">{cita.hora || '--:--'}</div>
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{cita.paciente || 'Sin nombre'}</p>
                    <p className="text-xs text-gray-500">
                      Doc: {cita.documento || 'N/A'} · Tipo: {cita.tipo || 'General'}
                    </p>
                    {cita.medico && (
                      <p className="text-xs text-gray-400">Dr(a). {cita.medico}</p>
                    )}
                    {cita.notas && (
                      <p className="text-xs text-gray-400 italic mt-1">{cita.notas}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 ${cfg.color}`}>
                    <Icon className="w-3 h-3" /> {cfg.label}
                  </span>
                  {cita.estado === 'espera' && (
                    <button
                      onClick={() => cambiarEstado(cita.id, 'atendiendo')}
                      className="px-3 py-1 bg-blue-600 text-white rounded-lg text-xs hover:bg-blue-700 transition"
                    >
                      Llamar
                    </button>
                  )}
                  {cita.estado === 'atendiendo' && (
                    <button
                      onClick={() => cambiarEstado(cita.id, 'atendido')}
                      className="px-3 py-1 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700 transition"
                    >
                      Finalizar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
