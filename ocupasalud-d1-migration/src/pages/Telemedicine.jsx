// src/pages/Telemedicine.jsx
// Telemedicina Ocupacional — Teleconsultas con Jitsi Meet, sala de espera, historial
import React, { useState, useCallback } from 'react';
import { _secretariaPuede } from '../shared/data/planConfig.js';
import { _ls } from '../shared/lib/storage.js';
import { _sbSet } from '../shared/lib/supabase.js';
import { PlanGate } from '../shared/ui/PlanGate.jsx';
import { initialGeneralPatientState } from '../shared/data/initialStates.js';

export default function Telemedicine({
  currentUser,
  usersList = [],
  goBack,
  showAlert,
  teleconsultas,
  setTeleconsultas,
  teleForm,
  setTeleForm,
  teleTab,
  setTeleTab,
  teleSalaActiva,
  setTeleSalaActiva,
  teleEspera,
  setTeleEspera,
  setData,
  setDataType,
  setActiveTab,
  setView,
}) {
  // ── SECRETARIA GATE ──
  if (currentUser?.role === "secretaria" && !_secretariaPuede("telemedicina", currentUser, usersList)) {
    return (
      <div className="max-w-xl mx-auto px-4 py-16 text-center">
        <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-8 space-y-3">
          <div className="text-5xl">🔐</div>
          <p className="font-black text-amber-800 text-xl">Módulo restringido</p>
          <p className="text-amber-700 text-sm font-bold">Telemedicina</p>
          <p className="text-amber-600 text-xs leading-relaxed">
            Este módulo requiere autorización explícita del administrador.<br />
            Solicita que habilite el permiso <strong>"Telemedicina"</strong> en tu perfil.<br />
            (Usuarios → tu nombre → 🔐 Permisos de secretaria)
          </p>
          <button onClick={() => goBack()} className="mt-3 bg-amber-600 text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-amber-700 transition">← Volver al panel</button>
        </div>
      </div>
    );
  }

  const _genRoomName = (doc, fecha, hora) => {
    const ts = `${doc}-${fecha}-${hora}`.replace(/[^a-zA-Z0-9]/g, "");
    return `SISOOcupaSalud-${ts}`;
  };

  const _syncTele = (lista) => {
    setTeleconsultas(lista);
    _ls.setItem("siso_teleconsultas", JSON.stringify(lista));
    _sbSet(`siso_teleconsultas_${currentUser?.user || "shared"}`, lista);
  };

  const handleIniciarSala = () => {
    if (!teleForm.paciente.trim()) { showAlert("⚠️ Ingrese el nombre del paciente."); return; }
    if (!teleForm.documento.trim()) { showAlert("⚠️ Ingrese el número de documento del paciente."); return; }
    if (!teleForm.hora.trim()) { showAlert("⚠️ Ingrese la hora de la teleconsulta."); return; }
    if (!teleForm.consentimientoTele) { showAlert("⚠️ El paciente debe aceptar el consentimiento de telemedicina."); return; }
    const roomName = _genRoomName(teleForm.documento, teleForm.fecha, teleForm.hora);
    const nuevaTele = {
      id: "tele_" + Date.now(), roomName, paciente: teleForm.paciente,
      documento: teleForm.documento, celular: teleForm.celular,
      fecha: teleForm.fecha, hora: teleForm.hora,
      motivo: teleForm.motivo, notas: teleForm.notas,
      consentimientoTele: true, consentimientoTs: new Date().toISOString(),
      medico: currentUser?.name || currentUser?.user,
      estado: "esperando", horaInicio: null, horaFin: null,
    };
    const lista = [nuevaTele, ...teleconsultas];
    _syncTele(lista);
    setTeleEspera(prev => [...prev, { id: nuevaTele.id, paciente: nuevaTele.paciente, documento: nuevaTele.documento, hora: nuevaTele.hora, roomName }]);
    setTeleSalaActiva({ roomName, paciente: teleForm.paciente, documento: teleForm.documento, celular: teleForm.celular, fecha: teleForm.fecha, hora: teleForm.hora });
  };

  const handleCerrarSala = () => {
    if (teleSalaActiva) {
      const horaFinTele = new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false }).replace(".", ":");
      const lista = teleconsultas.map(t => t.roomName === teleSalaActiva.roomName ? { ...t, estado: "completada", finTs: new Date().toISOString(), horaFin: horaFinTele } : t);
      _syncTele(lista);
      setTeleEspera(prev => prev.filter(e => e.roomName !== teleSalaActiva.roomName));
    }
    setTeleSalaActiva(null);
  };

  const handleIniciarConsulta = (teleId) => {
    const horaInicioTele = new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit", hour12: false }).replace(".", ":");
    const lista = teleconsultas.map(t => t.id === teleId ? { ...t, estado: "activa", horaInicio: horaInicioTele } : t);
    _syncTele(lista);
    const found = teleconsultas.find(t => t.id === teleId);
    if (found) setTeleSalaActiva({ roomName: found.roomName, paciente: found.paciente, documento: found.documento, celular: found.celular || "", fecha: found.fecha, hora: found.hora });
    setTeleEspera(prev => prev.filter(e => e.id !== teleId));
  };

  const crearHCDesdeTele = (tele) => {
    const newId = "pac_" + Date.now();
    setData({ ...initialGeneralPatientState, id: newId, _medicoId: currentUser?.user, nombres: tele.paciente, docNumero: tele.documento, celular: tele.celular || "", motivoConsulta: "Teleconsulta — " + (tele.motivo || "Sin motivo registrado"), _teleId: tele.id });
    setDataType("general"); setActiveTab("formGeneral"); setView("historia");
  };

  const jitsiUrl = teleSalaActiva ? `https://meet.jit.si/${teleSalaActiva.roomName}#userInfo.displayName="${encodeURIComponent(currentUser?.name || "Dr.")}"&config.startWithVideoMuted=false&config.prejoinPageEnabled=false` : null;

  return (
    <div className="p-4 max-w-5xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-blue-700 to-indigo-700 rounded-2xl p-5 text-white">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <button onClick={() => goBack()} className="bg-white/20 hover:bg-white/30 text-white px-3 py-1.5 rounded-lg text-xs font-bold flex-shrink-0">← Volver</button>
            <div>
              <h2 className="text-lg font-black">🩺 Telemedicina Ocupacional</h2>
              <p className="text-blue-200 text-xs mt-0.5">Res. 2654/2019 · Jitsi Meet · Sin costo por videollamada</p>
            </div>
          </div>
          <div className="flex gap-2 items-center">
            {teleconsultas.filter(t => t.estado === "esperando").length > 0 && (
              <span className="bg-red-500 text-white text-[10px] font-black px-2 py-1 rounded-full animate-pulse">
                🔴 {teleconsultas.filter(t => t.estado === "esperando").length} en espera
              </span>
            )}
            <button onClick={() => setTeleTab("nueva")} className={`px-3 py-1.5 text-xs font-bold rounded-lg ${teleTab === "nueva" ? "bg-white text-blue-700" : "bg-blue-800 text-blue-200 hover:bg-blue-600"}`}>➕ Nueva consulta</button>
            <button onClick={() => setTeleTab("historial")} className={`px-3 py-1.5 text-xs font-bold rounded-lg ${teleTab === "historial" ? "bg-white text-blue-700" : "bg-blue-800 text-blue-200 hover:bg-blue-600"}`}>📋 Historial ({teleconsultas.length})</button>
          </div>
        </div>
      </div>

      {/* Sala activa */}
      {teleSalaActiva && (
        <div className="bg-white rounded-2xl shadow-lg overflow-hidden border-2 border-blue-500">
          <div className="bg-blue-600 px-4 py-2 flex items-center justify-between">
            <div className="text-white text-xs font-bold flex items-center gap-2">
              🔴 CONSULTA EN CURSO - {teleSalaActiva.paciente} · {teleSalaActiva.fecha} {teleSalaActiva.hora}
              {teleEspera.length > 0 && <span className="bg-red-500 text-white text-[10px] font-black px-2 py-0.5 rounded-full animate-pulse">🔴 {teleEspera.length} esperando</span>}
            </div>
            <button onClick={handleCerrarSala} className="bg-red-500 hover:bg-red-600 text-white text-xs font-black px-3 py-1 rounded-lg">⏹ Finalizar consulta</button>
          </div>
          <div className="bg-gray-50 flex flex-col items-center justify-center gap-5 py-12">
            <div className="text-center">
              <div className="text-5xl mb-3">🎥</div>
              <p className="font-black text-gray-800 text-base">Sala lista para iniciar</p>
              <p className="text-xs text-gray-500 mt-1">La videollamada se abre en una nueva pestaña del navegador</p>
            </div>
            <div className="flex flex-col items-center gap-3 w-full max-w-xs">
              <a href={jitsiUrl} target="_blank" rel="noreferrer" className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black py-3 px-6 rounded-xl text-sm text-center flex items-center justify-center gap-2 shadow-lg">🎥 Abrir videollamada</a>
              <button onClick={() => { navigator.clipboard?.writeText(jitsiUrl); showAlert("🔗 Enlace copiado al portapapeles. Envíelo al paciente."); }}
                className="w-full bg-white border border-blue-200 text-blue-700 font-bold py-2 px-4 rounded-xl text-xs flex items-center justify-center gap-2">📋 Copiar enlace para el paciente</button>
              {teleSalaActiva.celular ? (
                <a href={`https://wa.me/${(teleSalaActiva.celular || "").replace(/\D/g, "")}?text=${encodeURIComponent(`Hola ${teleSalaActiva.paciente}, su teleconsulta esta lista. Ingrese al siguiente enlace: ${jitsiUrl}`)}`}
                  target="_blank" rel="noreferrer" className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition">📱 Enviar enlace por WhatsApp</a>
              ) : (
                <p className="text-[10px] text-amber-600 text-center font-bold">⚠️ Sin celular registrado - No se puede enviar por WhatsApp</p>
              )}
              <p className="text-[10px] text-gray-400 text-center">Enlace único: {jitsiUrl}</p>
            </div>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-[10px] text-blue-700 max-w-sm">
              <p className="font-black">ℹ️ Cómo funciona</p>
              <p className="mt-0.5">1. Presione "Abrir videollamada" - se abre en nueva pestaña</p>
              <p>2. Comparta el enlace con el paciente por WhatsApp o Email</p>
              <p>3. Ambos entran al mismo enlace y la sala es privada y cifrada</p>
            </div>
          </div>
          <div className="px-4 py-2 bg-blue-50 text-[10px] text-blue-700 font-bold">
            🔒 Sala privada: {teleSalaActiva.roomName} · La videollamada ocurre en servidores de Jitsi Meet (meet.jit.si) · Ningún dato clínico se transmite al proveedor de video
          </div>
        </div>
      )}

      {/* Formulario nueva consulta */}
      {teleTab === "nueva" && !teleSalaActiva && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5 space-y-4">
          <h3 className="text-sm font-black text-gray-800">Datos de la teleconsulta</h3>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase">Nombre del paciente *</label>
              <input value={teleForm.paciente} onChange={e => setTeleForm(p => ({ ...p, paciente: e.target.value }))} className="w-full p-2 border rounded-lg text-sm" placeholder="Nombre completo" /></div>
            <div><label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase">Documento de identidad *</label>
              <input value={teleForm.documento} onChange={e => setTeleForm(p => ({ ...p, documento: e.target.value }))} className="w-full p-2 border rounded-lg text-sm" placeholder="CC / CE / PP" /></div>
            <div className="col-span-2"><label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase">📱 Celular del paciente (WhatsApp)</label>
              <input value={teleForm.celular} onChange={e => setTeleForm(p => ({ ...p, celular: e.target.value }))} className="w-full p-2 border rounded-lg text-sm" placeholder="Ej: +573001234567" /></div>
            <div><label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase">Fecha *</label>
              <input type="date" value={teleForm.fecha} onChange={e => setTeleForm(p => ({ ...p, fecha: e.target.value }))} className="w-full p-2 border rounded-lg text-sm" /></div>
            <div><label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase">Hora *</label>
              <input type="time" value={teleForm.hora} onChange={e => setTeleForm(p => ({ ...p, hora: e.target.value }))} className="w-full p-2 border rounded-lg text-sm" /></div>
            <div className="col-span-2"><label className="block text-[10px] font-bold text-gray-600 mb-1 uppercase">Motivo de consulta</label>
              <input value={teleForm.motivo} onChange={e => setTeleForm(p => ({ ...p, motivo: e.target.value }))} className="w-full p-2 border rounded-lg text-sm" placeholder="Ej: Evaluación periódica, seguimiento recomendación..." /></div>
          </div>
          {/* Consentimiento telemedicina */}
          <div className={`p-4 rounded-xl border-2 ${teleForm.consentimientoTele ? "bg-emerald-50 border-emerald-400" : "bg-amber-50 border-amber-300"}`}>
            <p className="text-xs font-black text-gray-800 mb-2">Consentimiento Informado para Telemedicina (Res. 2654/2019)</p>
            <div className="text-[11px] text-gray-600 space-y-1 mb-3">
              <p>• La consulta se realizará por videollamada a través de Jitsi Meet, una plataforma de comunicación cifrada.</p>
              <p>• El médico puede tomar notas clínicas durante la sesión, las cuales formarán parte de la Historia Clínica.</p>
              <p>• Esta modalidad no reemplaza la evaluación física cuando la condición clínica lo requiera.</p>
              <p>• Tiene derecho a interrumpir la consulta en cualquier momento sin afectar su atención posterior.</p>
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={teleForm.consentimientoTele} onChange={e => setTeleForm(p => ({ ...p, consentimientoTele: e.target.checked }))} className="w-4 h-4 accent-emerald-600" />
              <span className="text-xs font-bold text-gray-700">El paciente <strong>{teleForm.paciente || "---"}</strong> ha leído y aceptado este consentimiento de telemedicina</span>
            </label>
          </div>
          <button onClick={handleIniciarSala} disabled={!teleForm.paciente || !teleForm.documento || !teleForm.hora || !teleForm.consentimientoTele}
            className="w-full py-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black rounded-xl flex items-center justify-center gap-2">🎥 Iniciar videoconsulta</button>
        </div>
      )}

      {/* Sala de espera */}
      {teleEspera.length > 0 && !teleSalaActiva && (
        <div className="bg-white rounded-2xl shadow-sm border-2 border-amber-300 overflow-hidden">
          <div className="bg-amber-50 px-4 py-3 border-b border-amber-200">
            <p className="text-sm font-black text-amber-800">🔴 Sala de Espera ({teleEspera.length} paciente{teleEspera.length !== 1 ? "s" : ""})</p>
          </div>
          <div className="divide-y divide-gray-100">
            {teleconsultas.filter(t => t.estado === "esperando").map(t => (
              <div key={t.id} className="flex items-center justify-between p-4 hover:bg-amber-50">
                <div>
                  <p className="text-xs font-bold text-gray-800">{t.paciente} · {t.documento}</p>
                  <p className="text-[10px] text-gray-500 mt-0.5">📅 {t.fecha} {t.hora} · {t.motivo || "Sin motivo"}</p>
                </div>
                <button onClick={() => handleIniciarConsulta(t.id)} className="bg-blue-600 hover:bg-blue-700 text-white text-xs font-black px-4 py-2 rounded-xl">▶ Iniciar consulta</button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Historial */}
      {teleTab === "historial" && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
          <div className="px-4 py-3 border-b border-gray-100 bg-indigo-50"><p className="text-sm font-black text-indigo-800">Historial de Teleconsultas</p></div>
          {teleconsultas.length === 0 ? (
            <div className="text-center py-12 text-gray-400"><p className="text-3xl mb-2">📹</p><p className="text-sm font-bold">Sin teleconsultas registradas</p></div>
          ) : (
            <div className="divide-y divide-gray-100">
              {teleconsultas.map(t => {
                const estadoLabel = t.estado === "activa" ? "🔵 En curso" : t.estado === "esperando" ? "🟡 Programada" : "✅ Finalizada";
                const estadoClass = t.estado === "activa" ? "bg-blue-100 text-blue-700" : t.estado === "esperando" ? "bg-yellow-100 text-yellow-700" : "bg-emerald-100 text-emerald-700";
                let duracionStr = "";
                if (t.horaInicio && t.horaFin) {
                  const [hI, mI] = t.horaInicio.split(":").map(Number);
                  const [hF, mF] = t.horaFin.split(":").map(Number);
                  const diff = (hF * 60 + mF) - (hI * 60 + mI);
                  if (diff > 0) duracionStr = diff + " min";
                }
                return (
                  <div key={t.id} className="flex items-center justify-between p-4 hover:bg-gray-50">
                    <div>
                      <p className="text-xs font-bold text-gray-800">{t.paciente} <span className="font-normal text-gray-400"> · {t.documento}</span></p>
                      <p className="text-[10px] text-gray-500 mt-0.5">📅 {t.fecha} {t.hora} · {t.motivo || "Sin motivo registrado"}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <p className="text-[10px] text-gray-400">👤 {t.medico}</p>
                        {duracionStr && <p className="text-[10px] text-blue-600 font-bold">⏱ Duración: {duracionStr}</p>}
                        {t.horaInicio && <p className="text-[10px] text-gray-400">🕐 {t.horaInicio}{t.horaFin ? ` → ${t.horaFin}` : ""}</p>}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5">
                      <span className={`text-[10px] font-black px-2 py-1 rounded-full ${estadoClass}`}>{estadoLabel}</span>
                      {t.estado === "completada" && <button onClick={() => crearHCDesdeTele(t)} className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 bg-indigo-50 hover:bg-indigo-100 px-2 py-1 rounded-lg transition">📋 Crear HC de esta teleconsulta</button>}
                      {t.estado === "esperando" && <button onClick={() => handleIniciarConsulta(t.id)} className="text-[10px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg transition">▶ Iniciar consulta</button>}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Nota normativa */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <p className="text-[10px] font-black text-blue-800 mb-1">📋 Marco normativo: Res. 2654 de 2019</p>
        <p className="text-[10px] text-blue-700">
          La telemedicina en Colombia está regulada por la Resolución 2654 de 2019. Para prestar este servicio como IPS habilitada se requiere: (1) inscribir la modalidad en el REPS, (2) tener consentimiento informado firmado por el paciente, (3) garantizar la confidencialidad de la comunicación, y (4) registrar la atención en la HC. Jitsi Meet utiliza cifrado end-to-end (SRTP/DTLS). Ningún dato clínico se almacena en sus servidores.
        </p>
      </div>
    </div>
  );
}
