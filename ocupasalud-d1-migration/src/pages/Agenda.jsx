// src/pages/Agenda.jsx
// ═══════════════════════════════════════════════════════════════════════
// AGENDA DEL DÍA — Sala de espera, citas, llamado, completado
// ═══════════════════════════════════════════════════════════════════════
import React, { useState, useMemo, useCallback } from 'react';
import { InputGroup } from '../shared/ui/InputGroup.jsx';
import { EPS_LIST, ARL_LIST } from '../shared/data/catalogs.js';

const TIPOS_CONSULTA = [
  { v: 'ingreso', l: 'Ingreso', mins: 20 },
  { v: 'egreso', l: 'Egreso', mins: 20 },
  { v: 'periodico', l: 'Periódico', mins: 20 },
  { v: 'seguimiento', l: 'Seguimiento', mins: 40 },
  { v: 'post_incapacidad', l: 'Post-Incapacidad', mins: 40 },
];

const DURACION = { ingreso: 20, egreso: 20, periodico: 20, seguimiento: 40, post_incapacidad: 40 };

const addMins = (hhmm, mins) => {
  const [h, m] = hhmm.split(':').map(Number);
  const total = h * 60 + m + mins;
  return `${String(Math.floor(total / 60) % 24).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
};

const horaActual = () => new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', hour12: false }).replace('.', ':');

const calcEdad = (fNac) => {
  if (!fNac) return '';
  const parts = String(fNac).split('-');
  if (parts.length !== 3) return '';
  const nacY = parseInt(parts[0], 10);
  const nacM = parseInt(parts[1], 10) - 1;
  const nacD = parseInt(parts[2], 10);
  if (isNaN(nacY) || isNaN(nacM) || isNaN(nacD)) return '';
  const hoy = new Date();
  let edad = hoy.getFullYear() - nacY;
  const mDiff = hoy.getMonth() - nacM;
  if (mDiff < 0 || (mDiff === 0 && hoy.getDate() < nacD)) edad--;
  return String(Math.max(0, edad));
};

export default function Agenda({
  currentUser,
  goTo,
  patientsList = [],
  companies = [],
  appointments = [],
  onAddAppointment,
  onCompleteAppointment,
}) {
  const showAlert = useCallback((msg) => window.alert(msg), []);

  const [agendaTab, setAgendaTab] = useState('hoy');
  const [agendaSuggs, setAgendaSuggs] = useState([]);
  const [agendaForm, setAgendaForm] = useState({
    nombre: '', docTipo: 'CC', docNumero: '', fechaNacimiento: '', edad: '',
    genero: '', celular: '', email: '', eps: '', arl: '',
    empresa: '', cargo: '', tipoConsulta: 'ingreso',
    fechaCita: '', horaCita: '', observacion: '', medicoId: currentUser?.user || '',
    _busquedaQuery: '',
  });

  const today = new Date().toISOString().split('T')[0];

  const miAgendaHoy = useMemo(() =>
    appointments.filter(a => a.fecha === today).sort((a, b) => (a.horaCita || '').localeCompare(b.horaCita || '')),
    [appointments, today]
  );
  const enEspera = miAgendaHoy.filter(a => a.estado === 'espera');
  const atendiendo = miAgendaHoy.filter(a => a.estado === 'atendiendo');
  const atendidos = miAgendaHoy.filter(a => a.estado === 'atendido' || a.completed);
  const proximas = useMemo(() =>
    appointments.filter(a => a.fecha > today).sort((a, b) => a.fecha.localeCompare(b.fecha) || (a.horaCita || '').localeCompare(b.horaCita || '')),
    [appointments, today]
  );

  const handleBusqueda = (val) => {
    setAgendaForm(p => ({ ...p, nombre: val, _busquedaQuery: val }));
    if (val.length < 2) { setAgendaSuggs([]); return; }
    const q = val.toLowerCase();
    setAgendaSuggs(patientsList.filter(p => p.nombres?.toLowerCase().includes(q) || p.docNumero?.toLowerCase().includes(q)).slice(0, 8));
  };

  const seleccionarPaciente = (p) => {
    setAgendaForm(prev => ({
      ...prev,
      nombre: p.nombres || '', docTipo: p.docTipo || 'CC', docNumero: p.docNumero || '',
      fechaNacimiento: p.fechaNacimiento || '', edad: p.edad || calcEdad(p.fechaNacimiento),
      genero: p.genero || '', celular: p.celular || '', email: p.email || '',
      eps: p.eps || '', arl: p.arl || '',
      empresa: p.empresa || companies.find(c => c.id === p.companyId)?.nombre || '',
      cargo: p.cargo || '', _busquedaQuery: p.nombres || '',
    }));
    setAgendaSuggs([]);
  };

  const registrarPaciente = () => {
    if (!agendaForm.nombre.trim()) { showAlert('Ingrese el nombre del paciente.'); return; }
    const fechaCita = agendaForm.fechaCita || today;
    const horaCita = agendaForm.horaCita || horaActual();
    const duracion = DURACION[agendaForm.tipoConsulta] || 20;
    const horaFin = addMins(horaCita, duracion);
    const esHoy = fechaCita === today;

    const nuevo = {
      id: 'ag_' + Date.now(),
      nombre: agendaForm.nombre.trim(),
      docTipo: agendaForm.docTipo,
      docNumero: agendaForm.docNumero.trim(),
      fechaNacimiento: agendaForm.fechaNacimiento,
      edad: agendaForm.edad || calcEdad(agendaForm.fechaNacimiento),
      genero: agendaForm.genero,
      celular: agendaForm.celular,
      email: agendaForm.email,
      eps: agendaForm.eps,
      arl: agendaForm.arl,
      empresa: agendaForm.empresa,
      cargo: agendaForm.cargo,
      medicoId: agendaForm.medicoId || currentUser?.user,
      medicoNombre: currentUser?.name || currentUser?.user,
      tipoConsulta: agendaForm.tipoConsulta,
      fecha: fechaCita,
      horaCita,
      horaFinCita: horaFin,
      duracion,
      hora: horaCita,
      observacion: agendaForm.observacion,
      estado: esHoy ? 'espera' : 'programado',
      registradoPor: currentUser?.user,
      registradoEn: new Date().toISOString(),
    };

    onAddAppointment?.(nuevo);
    setAgendaForm({
      nombre: '', docTipo: 'CC', docNumero: '', fechaNacimiento: '', edad: '',
      genero: '', celular: '', email: '', eps: '', arl: '',
      empresa: '', cargo: '', tipoConsulta: 'ingreso',
      fechaCita: '', horaCita: '', observacion: '', medicoId: currentUser?.user || '',
      _busquedaQuery: '',
    });
    setAgendaSuggs([]);
    setAgendaTab('hoy');
    showAlert(`✅ ${esHoy ? 'Paciente en sala de espera' : 'Cita programada para ' + fechaCita + ' a las ' + horaCita}.\nDuración: ${duracion} min`);
  };

  const EstadoBadge = ({ estado }) => {
    const map = {
      espera: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      atendiendo: 'bg-blue-100 text-blue-800 border-blue-300',
      atendido: 'bg-emerald-100 text-emerald-800 border-emerald-300',
      programado: 'bg-purple-100 text-purple-800 border-purple-300',
    };
    const icons = { espera: '⏳', atendiendo: '🔵', atendido: '✅', programado: '📅' };
    const labels = { espera: 'En espera', atendiendo: 'Atendiendo', atendido: 'Atendido', programado: 'Programado' };
    return (
      <span className={`text-[10px] font-black px-2 py-1 rounded-full border ${map[estado] || map.espera}`}>
        {icons[estado] || '⏳'} {labels[estado] || estado}
      </span>
    );
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-700 rounded-2xl p-5 text-white mb-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="text-lg font-black">🗓️ Agenda del Día</h2>
            <p className="text-blue-200 text-xs mt-0.5">
              Sala de espera · Programación de citas · {new Date().toLocaleDateString('es-CO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            <span className="bg-yellow-500 text-white text-[10px] font-black px-2 py-1 rounded-full">⏳ {enEspera.length} esperando</span>
            {atendiendo.length > 0 && <span className="bg-blue-500 text-white text-[10px] font-black px-2 py-1 rounded-full">🔵 {atendiendo.length} atendiendo</span>}
            <span className="bg-emerald-500 text-white text-[10px] font-black px-2 py-1 rounded-full">✅ {atendidos.length} atendidos</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
        {[
          { k: 'hoy', l: `🗓️ Hoy (${miAgendaHoy.length})` },
          { k: 'agendar', l: '➕ Agendar paciente' },
          { k: 'proximas', l: `📅 Próximas (${proximas.length})` },
        ].map(t => (
          <button key={t.k} onClick={() => setAgendaTab(t.k)} className={`flex-1 py-2 text-xs font-black rounded-lg transition ${agendaTab === t.k ? 'bg-blue-700 text-white' : 'text-gray-600 hover:bg-gray-100'}`}>
            {t.l}
          </button>
        ))}
      </div>

      {/* TAB: HOY */}
      {agendaTab === 'hoy' && (
        <div className="space-y-3">
          {miAgendaHoy.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center text-gray-400">
              <p className="text-4xl mb-3">📋</p>
              <p className="font-bold text-gray-600">Sin pacientes agendados hoy</p>
              <p className="text-xs mt-1">Use "➕ Agendar paciente" para agregar</p>
            </div>
          ) : miAgendaHoy.map(ag => (
            <div key={ag.id} className={`bg-white rounded-2xl shadow-sm border p-4 ${ag.estado === 'atendiendo' ? 'border-blue-400 ring-2 ring-blue-100' : ag.estado === 'espera' ? 'border-yellow-300' : 'border-gray-100'}`}>
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-black text-sm text-gray-800">{ag.nombre}</p>
                  <p className="text-[10px] text-gray-500">{ag.docTipo} {ag.docNumero} · {ag.empresa || 'Sin empresa'} · {ag.cargo || '--'}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    🕐 {ag.horaCita || ag.hora} - {ag.horaFinCita || '--'} · {TIPOS_CONSULTA.find(t => t.v === ag.tipoConsulta)?.l || ag.tipoConsulta} ({ag.duracion || 20} min)
                  </p>
                  {ag.observacion && <p className="text-[10px] text-gray-400 mt-0.5">📝 {ag.observacion}</p>}
                  <p className="text-[10px] text-gray-400">👤 {ag.medicoNombre || '--'}</p>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <EstadoBadge estado={ag.completed ? 'atendido' : ag.estado} />
                  <div className="flex gap-1">
                    {ag.estado === 'espera' && !ag.completed && (
                      <button onClick={() => onCompleteAppointment?.(ag.id)} className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black px-3 py-1.5 rounded-lg">
                        ▶ Llamar / Atender
                      </button>
                    )}
                    {ag.estado === 'atendiendo' && !ag.completed && (
                      <button onClick={() => onCompleteAppointment?.(ag.id)} className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-black px-3 py-1.5 rounded-lg">
                        ✅ Completar
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB: AGENDAR */}
      {agendaTab === 'agendar' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h3 className="text-sm font-black text-gray-800">Datos del paciente</h3>

          {/* Búsqueda */}
          <div className="relative">
            <label className="block text-[10px] font-black text-gray-600 uppercase mb-1">🔍 Buscar paciente existente</label>
            <input
              value={agendaForm._busquedaQuery}
              onChange={(e) => handleBusqueda(e.target.value)}
              className="w-full p-2 border-2 border-blue-200 rounded-lg text-sm"
              placeholder="Nombre o cédula del paciente..."
            />
            {agendaSuggs.length > 0 && (
              <div className="absolute z-20 bg-white border border-blue-300 rounded-xl shadow-lg mt-1 w-full max-h-40 overflow-y-auto">
                {agendaSuggs.map(p => (
                  <button key={p.id} onClick={() => seleccionarPaciente(p)} className="w-full text-left px-4 py-2 hover:bg-blue-50 text-xs border-b border-gray-50">
                    <span className="font-bold">{p.nombres}</span> <span className="text-gray-400">· {p.docNumero} · {p.empresa || '--'}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Form fields */}
          <div className="flex flex-wrap -mx-1.5">
            <InputGroup label="Nombre completo *" value={agendaForm.nombre} onChange={(e) => setAgendaForm(p => ({ ...p, nombre: e.target.value }))} width="w-1/2" />
            <div className="px-1.5 mb-3 w-1/6">
              <label className="block text-[10px] font-black text-gray-600 uppercase mb-1">Doc.</label>
              <select value={agendaForm.docTipo} onChange={(e) => setAgendaForm(p => ({ ...p, docTipo: e.target.value }))} className="w-full p-1.5 border rounded-lg text-xs">
                {['CC', 'TI', 'CE', 'PP', 'RC', 'NIP', 'PEP', 'PPT'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <InputGroup label="Número doc." value={agendaForm.docNumero} onChange={(e) => setAgendaForm(p => ({ ...p, docNumero: e.target.value }))} width="w-1/3" />
            <InputGroup label="Fecha nacimiento" value={agendaForm.fechaNacimiento} onChange={(e) => setAgendaForm(p => ({ ...p, fechaNacimiento: e.target.value, edad: calcEdad(e.target.value) }))} type="date" width="w-1/4" />
            <InputGroup label="Edad" value={agendaForm.edad} onChange={(e) => setAgendaForm(p => ({ ...p, edad: e.target.value }))} width="w-1/8 min-w-[60px]" />
            <div className="px-1.5 mb-3 w-1/6">
              <label className="block text-[10px] font-black text-gray-600 uppercase mb-1">Género</label>
              <select value={agendaForm.genero} onChange={(e) => setAgendaForm(p => ({ ...p, genero: e.target.value }))} className="w-full p-1.5 border rounded-lg text-xs">
                <option value="">--</option>
                {['Masculino', 'Femenino', 'Otro'].map(o => <option key={o}>{o}</option>)}
              </select>
            </div>
            <InputGroup label="Celular" value={agendaForm.celular} onChange={(e) => setAgendaForm(p => ({ ...p, celular: e.target.value }))} width="w-1/4" />
            <InputGroup label="Email" value={agendaForm.email} onChange={(e) => setAgendaForm(p => ({ ...p, email: e.target.value }))} width="w-1/4" />
            <InputGroup label="EPS" value={agendaForm.eps} onChange={(e) => setAgendaForm(p => ({ ...p, eps: e.target.value }))} width="w-1/4" list="eps-list-agenda" />
            <InputGroup label="ARL" value={agendaForm.arl} onChange={(e) => setAgendaForm(p => ({ ...p, arl: e.target.value }))} width="w-1/4" list="arl-list-agenda" />
            <InputGroup label="Empresa" value={agendaForm.empresa} onChange={(e) => setAgendaForm(p => ({ ...p, empresa: e.target.value }))} width="w-1/3" />
            <InputGroup label="Cargo" value={agendaForm.cargo} onChange={(e) => setAgendaForm(p => ({ ...p, cargo: e.target.value }))} width="w-1/3" />
          </div>

          {/* Cita fields */}
          <div className="border-t border-gray-100 pt-4">
            <p className="text-xs font-black text-gray-700 uppercase mb-3">📅 Datos de la cita</p>
            <div className="flex flex-wrap -mx-1.5">
              <div className="px-1.5 mb-3 w-1/4">
                <label className="block text-[10px] font-black text-gray-600 uppercase mb-1">Tipo de consulta</label>
                <select value={agendaForm.tipoConsulta} onChange={(e) => setAgendaForm(p => ({ ...p, tipoConsulta: e.target.value }))} className="w-full p-1.5 border rounded-lg text-xs">
                  {TIPOS_CONSULTA.map(t => <option key={t.v} value={t.v}>{t.l} ({t.mins} min)</option>)}
                </select>
              </div>
              <InputGroup label="Fecha cita" value={agendaForm.fechaCita} onChange={(e) => setAgendaForm(p => ({ ...p, fechaCita: e.target.value }))} type="date" width="w-1/4" />
              <InputGroup label="Hora cita" value={agendaForm.horaCita} onChange={(e) => setAgendaForm(p => ({ ...p, horaCita: e.target.value }))} type="time" width="w-1/4" />
              <InputGroup label="Observación" value={agendaForm.observacion} onChange={(e) => setAgendaForm(p => ({ ...p, observacion: e.target.value }))} width="w-full" />
            </div>
          </div>

          <button onClick={registrarPaciente} className="w-full py-3 bg-blue-700 hover:bg-blue-800 text-white font-black rounded-xl text-sm">
            📋 Registrar en agenda
          </button>
        </div>
      )}

      {/* TAB: PRÓXIMAS */}
      {agendaTab === 'proximas' && (
        <div className="space-y-3">
          {proximas.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center text-gray-400">Sin citas futuras programadas.</div>
          ) : proximas.map(ag => (
            <div key={ag.id} className="bg-white rounded-xl shadow-sm border border-purple-100 p-4 flex justify-between items-center">
              <div>
                <p className="font-bold text-sm text-gray-800">{ag.nombre}</p>
                <p className="text-[10px] text-gray-500">{ag.docNumero} · {ag.empresa || '--'} · {ag.cargo || '--'}</p>
                <p className="text-[10px] text-purple-600 font-bold mt-0.5">📅 {ag.fecha} · 🕐 {ag.horaCita || '--'} · {TIPOS_CONSULTA.find(t => t.v === ag.tipoConsulta)?.l || ag.tipoConsulta}</p>
              </div>
              <EstadoBadge estado="programado" />
            </div>
          ))}
        </div>
      )}

      <datalist id="eps-list-agenda">{EPS_LIST.map(o => <option key={o} value={o} />)}</datalist>
      <datalist id="arl-list-agenda">{ARL_LIST.map(o => <option key={o} value={o} />)}</datalist>
    </div>
  );
}
