import React from 'react';
import {
  Building2,
  LogOut,
} from 'lucide-react';
import { _secretariaPuede, _secretariaMedicoAsignado } from '../shared/data/planConfig';
import { _sha256 } from '../shared/lib/crypto';
import InputGroup from '../components/ui/InputGroup';

export default function CompaniesSection({ ctx }) {
  const {
    ARL_LIST,
    _syncCompanies,
    companies,
    companiesTab,
    currentUser,
    editingCompany,
    goBack,
    goTo,
    lista,
    newComp,
    p,
    patientsList,
    portalActivadoInfo,
    sedeForm,
    setCompanies,
    setCompaniesTab,
    setEditingCompany,
    setNewComp,
    setPortalActivadoInfo,
    setPortalEmpresaCodigo,
    setSedeForm,
    showAlert,
    showConfirm,
    u,
    usersList,
  } = ctx;

    if (
      currentUser?.role === "secretaria" &&
      !_secretariaMedicoAsignado(currentUser, currentUser?.user, usersList) &&
      !_secretariaPuede("empresas", currentUser, usersList)
    )
      return (
        <div className="min-h-screen bg-gray-50 font-sans">
          {/* navbar rendered by App.jsx */}
          <div className="max-w-xl mx-auto px-4 py-16 text-center">
            <div className="bg-amber-50 border-2 border-amber-300 rounded-2xl p-8 space-y-3">
              <div className="text-5xl">🔐</div>
              <p className="font-black text-amber-800 text-xl">
                Módulo restringido
              </p>
              <p className="text-amber-600 text-xs leading-relaxed">
                Solicita que el administrador habilite el permiso "Empresas" en
                tu perfil.
              </p>
              <button
                onClick={() => goBack()}
                className="mt-3 bg-amber-600 text-white px-5 py-2 rounded-lg text-sm font-bold"
              >
                ← Volver
              </button>
            </div>
          </div>
        </div>
      );
    // Calcular alertas de convenios próximos a vencer
    const hoy = new Date();
    const en30 = new Date(hoy);
    en30.setDate(en30.getDate() + 30);
    const conveniosAlerta = companies.filter(
      (c) =>
        c.convenioVencimiento &&
        new Date(c.convenioVencimiento) <= en30 &&
        new Date(c.convenioVencimiento) >= hoy
    );
    const medicos = usersList.filter(
      (u) =>
        ["medico", "administrador", "super_admin"].includes(u.role) &&
        u.activo !== false
    );
    // Secretaria: filtra empresas por médicos asignados
    const _visibleCompanies = (() => {
      if (currentUser?.role !== "secretaria") return companies;
      const secU = usersList.find(u => u.user === currentUser.user);
      const asig = secU?.medicosAsignados || [];
      if (asig.length === 0) return companies;
      return companies.filter(c =>
        !c.medicoResponsableId ||
        asig.includes(c.medicoResponsableId) ||
        (c.medicoIds || []).some(mid => asig.includes(mid))
      );
    })();
    // companiesTab, editingCompany are component-level state (avoid React #310)
    return (
      <div className="min-h-screen bg-gray-50 font-sans">
        {/* navbar rendered by App.jsx */}
        <div className="max-w-5xl mx-auto px-4 py-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-black text-purple-900 flex items-center gap-2">
              <Building2 className="w-5 h-5" /> Empresas / Convenios (
              {_visibleCompanies.length})
            </h2>
            <button
              onClick={() => goBack()}
              className="text-gray-500 font-bold text-sm flex items-center gap-1"
            >
              <LogOut className="rotate-180 w-4 h-4" /> Volver
            </button>
          </div>
          {/* Alerta convenios próximos a vencer */}
          {conveniosAlerta.length > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 mb-4 flex items-center gap-3">
              <span className="text-2xl">⚠️</span>
              <div>
                <p className="text-xs font-black text-amber-800">
                  {conveniosAlerta.length} convenio(s) próximo(s) a vencer:
                </p>
                <p className="text-[10px] text-amber-700">
                  {conveniosAlerta
                    .map((c) => `${c.nombre} (${c.convenioVencimiento})`)
                    .join(" · ")}
                </p>
              </div>
            </div>
          )}
          {/* Tabs */}
          <div className="flex gap-1 mb-4 bg-white rounded-xl p-1 shadow-sm border border-gray-100">
            {[
              { k: "lista", l: "🏢 Empresas" },
              { k: "nueva", l: "➕ Nueva Empresa" },
              { k: "convenios", l: "🤝 Convenios" },
            ].map((t) => (
              <button
                key={t.k}
                onClick={() => setCompaniesTab(t.k)}
                className={`flex-1 py-2 text-xs font-black rounded-lg transition ${
                  companiesTab === t.k
                    ? "bg-purple-700 text-white"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                {t.l}
              </button>
            ))}
          </div>

          {/* TAB: LISTA */}
          {companiesTab === "lista" && (
            <div className="space-y-3">
              {companies.length === 0 && (
                <div className="bg-white rounded-2xl p-8 text-center text-gray-400 text-sm">
                  Sin empresas registradas. Use ➕ Nueva Empresa.
                </div>
              )}
              {companies.map((c, i) => {
                const pac = patientsList.filter(
                  (p) => p.empresaId === c.id || p.empresaNit === c.nit
                ).length;
                const medResp = medicos.find(
                  (m) => m.user === c.medicoResponsableId
                );
                const vence = c.convenioVencimiento
                  ? new Date(c.convenioVencimiento)
                  : null;
                const venceProx = vence && vence <= en30 && vence >= hoy;
                const vencido = vence && vence < hoy;
                return (
                  <div
                    key={c.id || i}
                    className={`bg-white rounded-2xl shadow-sm border p-4 ${
                      vencido
                        ? "border-red-300"
                        : venceProx
                        ? "border-amber-300"
                        : "border-gray-100"
                    }`}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-black text-sm text-gray-800">
                          {c.nombre}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          NIT: {c.nit}
                          {c.dv ? `-${c.dv}` : ""} · {c.ciudad} ·{" "}
                          {c.actividad?.slice(0, 40)}
                        </p>
                        {/* FASE 2: multi-médico badges */}
                        <div className="flex flex-wrap gap-1 mt-0.5">
                          {medResp && (
                            <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                              👨‍⚕️ {medResp.name} ⭐
                            </span>
                          )}
                          {(c.medicoIds || [])
                            .filter((id) => id !== c.medicoResponsableId)
                            .slice(0, 2)
                            .map((id) => {
                              const m = medicos.find((x) => x.user === id);
                              return m ? (
                                <span
                                  key={id}
                                  className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full font-bold"
                                >
                                  👨‍⚕️ {m.name || m.user}
                                </span>
                              ) : null;
                            })}
                          {(c.medicoIds || []).filter(
                            (id) => id !== c.medicoResponsableId
                          ).length > 2 && (
                            <span className="text-[10px] bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                              +
                              {(c.medicoIds || []).filter(
                                (id) => id !== c.medicoResponsableId
                              ).length - 2}{" "}
                              más
                            </span>
                          )}
                          {(c.sedes || []).length > 0 && (
                            <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-bold">
                              🏢 {(c.sedes || []).length} sede(s)
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {vencido && (
                          <span className="text-[10px] px-2 py-0.5 bg-red-100 text-red-700 rounded-full font-black">
                            ⛔ Convenio vencido
                          </span>
                        )}
                        {venceProx && !vencido && (
                          <span className="text-[10px] px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full font-black">
                            ⚠️ Vence pronto
                          </span>
                        )}
                        <span className="text-[10px] text-gray-500">
                          {pac} paciente(s)
                        </span>
                        <button
                          onClick={() => setEditingCompany(c)}
                          className="px-2 py-1 bg-blue-100 text-blue-700 rounded-lg text-[10px] font-black hover:bg-blue-200"
                        >
                          ✏️ Editar
                        </button>
                        <button
                          onClick={() =>
                            showConfirm("¿Eliminar empresa?", () => {
                              const upd = companies.filter(
                                (x) => x.id !== c.id
                              );
                              setCompanies(upd);
                              _syncCompanies(upd);
                            })
                          }
                          className="px-2 py-1 bg-red-100 text-red-600 rounded-lg text-[10px] font-black hover:bg-red-200"
                        >
                          🗑️
                        </button>
                      </div>
                    </div>
                    {/* Tarifas rápidas */}
                    {(c.tarifaIngreso ||
                      c.tarifaPeriodico ||
                      c.tarifaConsulta) && (
                      <div className="mt-2 flex gap-2 flex-wrap">
                        {c.tarifaIngreso && (
                          <span className="text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 px-2 py-0.5 rounded-full font-bold">
                            Ingreso: $
                            {Number(c.tarifaIngreso).toLocaleString("es-CO")}
                          </span>
                        )}
                        {c.tarifaPeriodico && (
                          <span className="text-[10px] bg-blue-50 border border-blue-200 text-blue-700 px-2 py-0.5 rounded-full font-bold">
                            Periódico: $
                            {Number(c.tarifaPeriodico).toLocaleString("es-CO")}
                          </span>
                        )}
                        {c.tarifaEgreso && (
                          <span className="text-[10px] bg-purple-50 border border-purple-200 text-purple-700 px-2 py-0.5 rounded-full font-bold">
                            Egreso: $
                            {Number(c.tarifaEgreso).toLocaleString("es-CO")}
                          </span>
                        )}
                        {c.tarifaConsulta && (
                          <span className="text-[10px] bg-gray-50 border border-gray-200 text-gray-700 px-2 py-0.5 rounded-full font-bold">
                            Consulta: $
                            {Number(c.tarifaConsulta).toLocaleString("es-CO")}
                          </span>
                        )}
                        {c.condicionesPago && (
                          <span className="text-[10px] bg-orange-50 border border-orange-200 text-orange-700 px-2 py-0.5 rounded-full font-bold">
                            Pago: {c.condicionesPago}
                          </span>
                        )}
                      </div>
                    )}
                    {/* Portal status */}
                    <div className="mt-2 flex items-center gap-2 flex-wrap">
                      {c.portalActivo && c.portalCode ? (
                        <>
                          <span className="text-[10px] bg-indigo-100 border border-indigo-300 text-indigo-700 px-2 py-0.5 rounded-full font-black">
                            🌐 Portal ACTIVO
                          </span>
                          <span className="text-[10px] font-mono font-black text-indigo-800 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full">
                            {c.portalCode}
                          </span>
                          <button
                            onClick={() => {
                              if (navigator.clipboard) {
                                navigator.clipboard
                                  .writeText(c.portalCode)
                                  .then(() =>
                                    showAlert(
                                      "✅ Código " + c.portalCode + " copiado."
                                    )
                                  );
                              } else showAlert("Código: " + c.portalCode);
                            }}
                            className="text-[10px] bg-white border border-indigo-200 text-indigo-600 px-2 py-0.5 rounded-full font-bold hover:bg-indigo-50"
                          >
                            📋 Copiar código
                          </button>
                          <button
                            onClick={() => setPortalActivadoInfo(c)}
                            className="text-[10px] bg-white border border-indigo-200 text-indigo-600 px-2 py-0.5 rounded-full font-bold hover:bg-indigo-50"
                          >
                            📨 Ver instrucciones
                          </button>
                        </>
                      ) : c.portalActivo ? (
                        <span className="text-[10px] bg-amber-100 border border-amber-300 text-amber-700 px-2 py-0.5 rounded-full font-black">
                          🔑 Portal activo - sin código (editar para generar)
                        </span>
                      ) : (
                        <span className="text-[10px] bg-gray-100 border border-gray-200 text-gray-500 px-2 py-0.5 rounded-full font-bold">
                          🔒 Portal desactivado
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* TAB: NUEVA EMPRESA */}
          {companiesTab === "nueva" && (
            <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-5">
              <p className="text-xs font-black text-gray-700 uppercase mb-4">
                📋 Datos de la empresa
              </p>
              <div className="flex flex-wrap -mx-1.5">
                <InputGroup
                  label="Razón Social *"
                  name="nombre"
                  value={newComp.nombre}
                  onChange={(e) =>
                    setNewComp((p) => ({ ...p, nombre: e.target.value }))
                  }
                  required
                  width="w-1/2"
                />
                <InputGroup
                  label="NIT"
                  name="nit"
                  value={newComp.nit}
                  onChange={(e) =>
                    setNewComp((p) => ({ ...p, nit: e.target.value }))
                  }
                  width="w-1/4"
                />
                <InputGroup
                  label="DV"
                  name="dv"
                  value={newComp.dv}
                  onChange={(e) =>
                    setNewComp((p) => ({ ...p, dv: e.target.value }))
                  }
                  width="w-1/8 min-w-[70px]"
                />
                <InputGroup
                  label="Ciudad"
                  name="ciudad"
                  value={newComp.ciudad}
                  onChange={(e) =>
                    setNewComp((p) => ({ ...p, ciudad: e.target.value }))
                  }
                  width="w-1/4"
                />
                <InputGroup
                  label="Actividad Económica"
                  value={newComp.actividad}
                  onChange={(e) =>
                    setNewComp((p) => ({ ...p, actividad: e.target.value }))
                  }
                  width="w-1/2"
                />
                <InputGroup
                  label="Correo"
                  value={newComp.correo}
                  onChange={(e) =>
                    setNewComp((p) => ({ ...p, correo: e.target.value }))
                  }
                  width="w-1/2"
                />
                <InputGroup
                  label="Teléfono"
                  value={newComp.telefono}
                  onChange={(e) =>
                    setNewComp((p) => ({ ...p, telefono: e.target.value }))
                  }
                  width="w-1/4"
                />
                <InputGroup
                  label="ARL"
                  value={newComp.arl}
                  onChange={(e) =>
                    setNewComp((p) => ({ ...p, arl: e.target.value }))
                  }
                  width="w-1/4"
                  list="arl-list"
                />
                <InputGroup
                  label="Gerente / Contacto"
                  value={newComp.gerente}
                  onChange={(e) =>
                    setNewComp((p) => ({ ...p, gerente: e.target.value }))
                  }
                  width="w-1/2"
                />
              </div>
              <div className="border-t border-gray-100 pt-4 mt-2">
                <p className="text-xs font-black text-gray-700 uppercase mb-3">
                  🤝 Convenio
                </p>
                <div className="flex flex-wrap -mx-1.5">
                  <div className="px-1.5 mb-3 w-1/3">
                    <label className="block text-[10px] font-black text-gray-600 uppercase mb-1">
                      Médico responsable
                    </label>
                    <select
                      value={newComp.medicoResponsableId}
                      onChange={(e) =>
                        setNewComp((p) => ({
                          ...p,
                          medicoResponsableId: e.target.value,
                        }))
                      }
                      className="w-full p-1.5 border rounded-lg text-xs"
                    >
                      <option value="">- Sin asignar -</option>
                      {medicos.map((m) => (
                        <option key={m.user} value={m.user}>
                          {m.name || m.user}
                        </option>
                      ))}
                    </select>
                  </div>
                  <InputGroup
                    label="Tarifa Ingreso COP"
                    value={newComp.tarifaIngreso}
                    onChange={(e) =>
                      setNewComp((p) => ({
                        ...p,
                        tarifaIngreso: e.target.value,
                      }))
                    }
                    width="w-1/6"
                    type="number"
                  />
                  <InputGroup
                    label="Tarifa Periódico"
                    value={newComp.tarifaPeriodico}
                    onChange={(e) =>
                      setNewComp((p) => ({
                        ...p,
                        tarifaPeriodico: e.target.value,
                      }))
                    }
                    width="w-1/6"
                    type="number"
                  />
                  <InputGroup
                    label="Tarifa Egreso"
                    value={newComp.tarifaEgreso}
                    onChange={(e) =>
                      setNewComp((p) => ({
                        ...p,
                        tarifaEgreso: e.target.value,
                      }))
                    }
                    width="w-1/6"
                    type="number"
                  />
                  <InputGroup
                    label="Tarifa Consulta"
                    value={newComp.tarifaConsulta}
                    onChange={(e) =>
                      setNewComp((p) => ({
                        ...p,
                        tarifaConsulta: e.target.value,
                      }))
                    }
                    width="w-1/6"
                    type="number"
                  />
                  <div className="px-1.5 mb-3 w-1/4">
                    <label className="block text-[10px] font-black text-gray-600 uppercase mb-1">
                      Condición de pago
                    </label>
                    <select
                      value={newComp.condicionesPago}
                      onChange={(e) =>
                        setNewComp((p) => ({
                          ...p,
                          condicionesPago: e.target.value,
                        }))
                      }
                      className="w-full p-1.5 border rounded-lg text-xs"
                    >
                      {["contado", "30 días", "60 días", "90 días"].map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  </div>
                  <InputGroup
                    label="Inicio convenio"
                    value={newComp.convenioFecha}
                    onChange={(e) =>
                      setNewComp((p) => ({
                        ...p,
                        convenioFecha: e.target.value,
                      }))
                    }
                    width="w-1/4"
                    type="date"
                  />
                  <InputGroup
                    label="Vencimiento convenio"
                    value={newComp.convenioVencimiento}
                    onChange={(e) =>
                      setNewComp((p) => ({
                        ...p,
                        convenioVencimiento: e.target.value,
                      }))
                    }
                    width="w-1/4"
                    type="date"
                  />
                  <InputGroup
                    label="Descuento %"
                    value={newComp.descuento}
                    onChange={(e) =>
                      setNewComp((p) => ({ ...p, descuento: e.target.value }))
                    }
                    width="w-1/8 min-w-[80px]"
                    type="number"
                  />
                </div>
                <div className="flex gap-4 mt-1">
                  <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!newComp.portalActivo}
                      onChange={(e) =>
                        setNewComp((p) => ({
                          ...p,
                          portalActivo: e.target.checked,
                        }))
                      }
                      className="accent-purple-600"
                    />{" "}
                    Portal cliente activo
                  </label>
                  <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={!!newComp.facturacionAgrupada}
                      onChange={(e) =>
                        setNewComp((p) => ({
                          ...p,
                          facturacionAgrupada: e.target.checked,
                        }))
                      }
                      className="accent-purple-600"
                    />{" "}
                    Facturación agrupada
                  </label>
                </div>
              </div>
              {/* ── MULTI-MÉDICO (FASE 2) ── */}
              <div className="border-t border-gray-100 pt-4 mt-2">
                <p className="text-xs font-black text-gray-700 uppercase mb-2">
                  👨‍⚕️ Médicos asignados a esta empresa
                </p>
                <p className="text-[10px] text-gray-500 mb-2">
                  El médico responsable es el principal; los adicionales también
                  pueden atender pacientes de esta empresa.
                </p>
                <div className="flex flex-wrap gap-2">
                  {medicos.map((m) => (
                    <label
                      key={m.user}
                      className="flex items-center gap-1.5 text-xs cursor-pointer bg-indigo-50 border border-indigo-200 rounded-lg px-2 py-1"
                    >
                      <input
                        type="checkbox"
                        checked={
                          (newComp.medicoIds || []).includes(m.user) ||
                          newComp.medicoResponsableId === m.user
                        }
                        onChange={(e) => {
                          if (m.user === newComp.medicoResponsableId) return; // responsable siempre incluido
                          setNewComp((p) => {
                            const ids = p.medicoIds || [];
                            return {
                              ...p,
                              medicoIds: e.target.checked
                                ? [...ids, m.user]
                                : ids.filter((x) => x !== m.user),
                            };
                          });
                        }}
                        className="accent-indigo-600"
                        disabled={m.user === newComp.medicoResponsableId}
                      />
                      <span
                        className={
                          m.user === newComp.medicoResponsableId
                            ? "font-black text-indigo-700"
                            : "text-gray-700"
                        }
                      >
                        {m.name || m.user}
                        {m.user === newComp.medicoResponsableId && " ⭐"}
                      </span>
                    </label>
                  ))}
                  {medicos.length === 0 && (
                    <p className="text-xs text-gray-400 italic">
                      No hay médicos registrados aún.
                    </p>
                  )}
                </div>
              </div>
              {/* ── SEDES (FASE 2) ── */}
              <div className="border-t border-gray-100 pt-4 mt-2">
                <p className="text-xs font-black text-gray-700 uppercase mb-2">
                  🏢 Sedes de la empresa
                </p>
                <div className="space-y-1 mb-2">
                  {(newComp.sedes || []).map((s, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5"
                    >
                      <span className="text-xs font-bold text-blue-800">
                        {s.nombre} — {s.ciudad}
                      </span>
                      <button
                        onClick={() =>
                          setNewComp((p) => ({
                            ...p,
                            sedes: p.sedes.filter((_, j) => j !== i),
                          }))
                        }
                        className="text-red-500 hover:text-red-700 text-xs font-black"
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2 items-end">
                  <input
                    placeholder="Nombre sede"
                    value={sedeForm.nombre}
                    onChange={(e) =>
                      setSedeForm((p) => ({ ...p, nombre: e.target.value }))
                    }
                    className="border rounded-lg p-1.5 text-xs flex-1"
                  />
                  <input
                    placeholder="Ciudad"
                    value={sedeForm.ciudad}
                    onChange={(e) =>
                      setSedeForm((p) => ({ ...p, ciudad: e.target.value }))
                    }
                    className="border rounded-lg p-1.5 text-xs w-28"
                  />
                  <input
                    placeholder="Dirección"
                    value={sedeForm.direccion}
                    onChange={(e) =>
                      setSedeForm((p) => ({ ...p, direccion: e.target.value }))
                    }
                    className="border rounded-lg p-1.5 text-xs flex-1"
                  />
                  <button
                    onClick={() => {
                      if (!sedeForm.nombre) return;
                      setNewComp((p) => ({
                        ...p,
                        sedes: [...(p.sedes || []), { ...sedeForm }],
                      }));
                      setSedeForm({ nombre: "", ciudad: "", direccion: "" });
                    }}
                    className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-black hover:bg-blue-700"
                  >
                    + Sede
                  </button>
                </div>
              </div>
              {/* ── ADMIN DEL PORTAL (FASE 2) ── */}
              {newComp.portalActivo && (
                <div className="border-t border-purple-100 pt-4 mt-2 bg-purple-50 rounded-xl p-3">
                  <p className="text-xs font-black text-purple-700 uppercase mb-1">
                    🔐 Acceso Admin del Portal
                  </p>
                  <p className="text-[10px] text-purple-600 mb-2">
                    El admin de la empresa usará estas credenciales para
                    ingresar al portal y gestionar sus médicos/secretarias.
                  </p>
                  <div className="flex gap-2">
                    <div className="flex-1">
                      <label className="block text-[10px] font-black text-purple-700 uppercase mb-1">
                        Usuario admin
                      </label>
                      <input
                        value={newComp.portalAdminUser}
                        onChange={(e) =>
                          setNewComp((p) => ({
                            ...p,
                            portalAdminUser: e.target.value,
                          }))
                        }
                        placeholder="ej: admin_empresa"
                        className="w-full border border-purple-200 rounded-lg p-1.5 text-xs"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-[10px] font-black text-purple-700 uppercase mb-1">
                        Contraseña temporal
                      </label>
                      <input
                        type="password"
                        value={newComp.portalAdminPassPlain || ""}
                        onChange={(e) =>
                          setNewComp((p) => ({
                            ...p,
                            portalAdminPassPlain: e.target.value,
                          }))
                        }
                        placeholder="mín. 8 caracteres"
                        className="w-full border border-purple-200 rounded-lg p-1.5 text-xs"
                      />
                    </div>
                  </div>
                </div>
              )}
              <button
                onClick={async () => {
                  if (!newComp.nombre) {
                    showAlert("Ingrese la razón social.");
                    return;
                  }
                  // Auto-generar código de portal si está activo y no tiene código aún
                  let finalComp = {
                    ...newComp,
                    id: Date.now().toString(),
                    _userId: currentUser?.user,
                    orgId:
                      newComp.orgId || currentUser?.orgId || ORG_DEFAULT_ID,
                  };
                  // FASE 2: asegurar medicoIds incluye al responsable
                  if (
                    finalComp.medicoResponsableId &&
                    !(finalComp.medicoIds || []).includes(
                      finalComp.medicoResponsableId
                    )
                  ) {
                    finalComp.medicoIds = [
                      ...(finalComp.medicoIds || []),
                      finalComp.medicoResponsableId,
                    ];
                  }
                  // FASE 2: hashear contraseña admin portal
                  if (finalComp.portalAdminPassPlain) {
                    finalComp.portalAdminPassHash = await _sha256(
                      finalComp.portalAdminPassPlain
                    );
                    delete finalComp.portalAdminPassPlain;
                  }
                  if (finalComp.portalActivo && !finalComp.portalCode) {
                    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
                    const rand = (n) =>
                      Array.from(
                        { length: n },
                        () => chars[Math.floor(Math.random() * chars.length)]
                      ).join("");
                    finalComp.portalCode = `EMP-${rand(4)}-${rand(4)}`;
                  }
                  const upd = [...companies, finalComp];
                  setCompanies(upd);
                  _syncCompanies(upd);
                  setNewComp(initialCompanyState);
                  setSedeForm({ nombre: "", ciudad: "", direccion: "" });
                  if (finalComp.portalActivo) {
                    setPortalActivadoInfo(finalComp);
                    setCompaniesTab("lista");
                  } else {
                    showAlert("✅ Empresa registrada.");
                    setCompaniesTab("lista");
                  }
                }}
                className="w-full mt-4 bg-purple-700 hover:bg-purple-800 text-white py-2.5 rounded-xl text-sm font-black"
              >
                💾 Guardar Empresa
              </button>
            </div>
          )}

          {/* TAB: CONVENIOS RESUMEN */}
          {companiesTab === "convenios" && (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 mb-2">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                  <p className="text-xs font-black text-emerald-700">
                    Con convenio activo
                  </p>
                  <p className="text-2xl font-black text-emerald-800">
                    {
                      companies.filter(
                        (c) =>
                          c.convenioVencimiento &&
                          new Date(c.convenioVencimiento) >= hoy
                      ).length
                    }
                  </p>
                </div>
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                  <p className="text-xs font-black text-amber-700">
                    Próximos a vencer (&lt;30d)
                  </p>
                  <p className="text-2xl font-black text-amber-800">
                    {conveniosAlerta.length}
                  </p>
                </div>
                <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                  <p className="text-xs font-black text-red-700">
                    Sin convenio / vencido
                  </p>
                  <p className="text-2xl font-black text-red-800">
                    {
                      companies.filter(
                        (c) =>
                          !c.convenioVencimiento ||
                          new Date(c.convenioVencimiento) < hoy
                      ).length
                    }
                  </p>
                </div>
              </div>
              <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-gray-800 text-white">
                    <tr>
                      {[
                        "Empresa",
                        "Médico Resp.",
                        "Tarifa Ingreso",
                        "Vencimiento",
                        "Estado",
                      ].map((h) => (
                        <th key={h} className="p-2 text-left font-black">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {companies.map((c, i) => {
                      const med = medicos.find(
                        (m) => m.user === c.medicoResponsableId
                      );
                      const vence = c.convenioVencimiento
                        ? new Date(c.convenioVencimiento)
                        : null;
                      const estado = !vence
                        ? "Sin fecha"
                        : vence < hoy
                        ? "⛔ Vencido"
                        : vence <= en30
                        ? "⚠️ Próximo"
                        : "✅ Vigente";
                      return (
                        <tr
                          key={c.id || i}
                          className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                        >
                          <td className="p-2 font-bold">{c.nombre}</td>
                          <td className="p-2 text-gray-600">
                            {med?.name || "-"}
                          </td>
                          <td className="p-2">
                            {c.tarifaIngreso
                              ? "$" +
                                Number(c.tarifaIngreso).toLocaleString("es-CO")
                              : "-"}
                          </td>
                          <td className="p-2">
                            {c.convenioVencimiento || "-"}
                          </td>
                          <td className="p-2 font-bold">{estado}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* MODAL EDITAR EMPRESA */}
          {editingCompany && (
            <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="bg-purple-700 p-4 rounded-t-2xl flex justify-between items-center">
                  <p className="text-white font-black">
                    ✏️ Editar: {editingCompany.nombre}
                  </p>
                  <button
                    onClick={() => setEditingCompany(null)}
                    className="text-white font-black text-xl"
                  >
                    ✕
                  </button>
                </div>
                <div className="p-4">
                  <div className="flex flex-wrap -mx-1.5">
                    <InputGroup
                      label="Razón Social"
                      value={editingCompany.nombre}
                      onChange={(e) =>
                        setEditingCompany((p) => ({
                          ...p,
                          nombre: e.target.value,
                        }))
                      }
                      required
                      width="w-1/2"
                    />
                    <InputGroup
                      label="NIT"
                      value={editingCompany.nit}
                      onChange={(e) =>
                        setEditingCompany((p) => ({
                          ...p,
                          nit: e.target.value,
                        }))
                      }
                      width="w-1/4"
                    />
                    <InputGroup
                      label="Ciudad"
                      value={editingCompany.ciudad}
                      onChange={(e) =>
                        setEditingCompany((p) => ({
                          ...p,
                          ciudad: e.target.value,
                        }))
                      }
                      width="w-1/4"
                    />
                    <InputGroup
                      label="Correo"
                      value={editingCompany.correo || ""}
                      onChange={(e) =>
                        setEditingCompany((p) => ({
                          ...p,
                          correo: e.target.value,
                        }))
                      }
                      width="w-1/2"
                    />
                    <InputGroup
                      label="Teléfono"
                      value={editingCompany.telefono || ""}
                      onChange={(e) =>
                        setEditingCompany((p) => ({
                          ...p,
                          telefono: e.target.value,
                        }))
                      }
                      width="w-1/4"
                    />
                    <InputGroup
                      label="Gerente"
                      value={editingCompany.gerente || ""}
                      onChange={(e) =>
                        setEditingCompany((p) => ({
                          ...p,
                          gerente: e.target.value,
                        }))
                      }
                      width="w-1/4"
                    />
                  </div>
                  <div className="border-t pt-3 mt-1">
                    <p className="text-xs font-black text-gray-700 uppercase mb-2">
                      🤝 Convenio
                    </p>
                    <div className="flex flex-wrap -mx-1.5">
                      <div className="px-1.5 mb-2 w-1/2">
                        <label className="block text-[10px] font-black text-gray-600 uppercase mb-1">
                          Médico responsable
                        </label>
                        <select
                          value={editingCompany.medicoResponsableId || ""}
                          onChange={(e) =>
                            setEditingCompany((p) => ({
                              ...p,
                              medicoResponsableId: e.target.value,
                            }))
                          }
                          className="w-full p-1.5 border rounded-lg text-xs"
                        >
                          <option value="">- Sin asignar -</option>
                          {medicos.map((m) => (
                            <option key={m.user} value={m.user}>
                              {m.name || m.user}
                            </option>
                          ))}
                        </select>
                      </div>
                      <InputGroup
                        label="Tarifa Ingreso"
                        value={editingCompany.tarifaIngreso || ""}
                        onChange={(e) =>
                          setEditingCompany((p) => ({
                            ...p,
                            tarifaIngreso: e.target.value,
                          }))
                        }
                        width="w-1/4"
                        type="number"
                      />
                      <InputGroup
                        label="Tarifa Periódico"
                        value={editingCompany.tarifaPeriodico || ""}
                        onChange={(e) =>
                          setEditingCompany((p) => ({
                            ...p,
                            tarifaPeriodico: e.target.value,
                          }))
                        }
                        width="w-1/4"
                        type="number"
                      />
                      <InputGroup
                        label="Tarifa Egreso"
                        value={editingCompany.tarifaEgreso || ""}
                        onChange={(e) =>
                          setEditingCompany((p) => ({
                            ...p,
                            tarifaEgreso: e.target.value,
                          }))
                        }
                        width="w-1/4"
                        type="number"
                      />
                      <InputGroup
                        label="Tarifa Consulta"
                        value={editingCompany.tarifaConsulta || ""}
                        onChange={(e) =>
                          setEditingCompany((p) => ({
                            ...p,
                            tarifaConsulta: e.target.value,
                          }))
                        }
                        width="w-1/4"
                        type="number"
                      />
                      <InputGroup
                        label="Vencimiento"
                        value={editingCompany.convenioVencimiento || ""}
                        onChange={(e) =>
                          setEditingCompany((p) => ({
                            ...p,
                            convenioVencimiento: e.target.value,
                          }))
                        }
                        width="w-1/3"
                        type="date"
                      />
                      <div className="px-1.5 mb-2 w-1/3">
                        <label className="block text-[10px] font-black text-gray-600 uppercase mb-1">
                          Condición pago
                        </label>
                        <select
                          value={editingCompany.condicionesPago || "contado"}
                          onChange={(e) =>
                            setEditingCompany((p) => ({
                              ...p,
                              condicionesPago: e.target.value,
                            }))
                          }
                          className="w-full p-1.5 border rounded-lg text-xs"
                        >
                          {["contado", "30 días", "60 días", "90 días"].map(
                            (o) => (
                              <option key={o} value={o}>
                                {o}
                              </option>
                            )
                          )}
                        </select>
                      </div>
                    </div>
                    <div className="flex gap-4">
                      <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!editingCompany.portalActivo}
                          onChange={(e) =>
                            setEditingCompany((p) => ({
                              ...p,
                              portalActivo: e.target.checked,
                            }))
                          }
                          className="accent-purple-600"
                        />{" "}
                        Portal activo
                      </label>
                      <label className="flex items-center gap-1.5 text-xs font-bold cursor-pointer">
                        <input
                          type="checkbox"
                          checked={!!editingCompany.facturacionAgrupada}
                          onChange={(e) =>
                            setEditingCompany((p) => ({
                              ...p,
                              facturacionAgrupada: e.target.checked,
                            }))
                          }
                          className="accent-purple-600"
                        />{" "}
                        Facturación agrupada
                      </label>
                    </div>
                  </div>
                  {/* Portal code section in edit modal */}
                  {editingCompany.portalActivo && (
                    <div className="mt-3 bg-indigo-50 border border-indigo-200 rounded-xl p-3">
                      <p className="text-[10px] font-black text-indigo-700 uppercase mb-2">
                        🌐 Portal cliente
                      </p>
                      {editingCompany.portalCode ? (
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-black text-indigo-900 text-sm bg-white border border-indigo-300 px-3 py-1 rounded-lg flex-1 text-center">
                            {editingCompany.portalCode}
                          </span>
                          <button
                            onClick={() => {
                              const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
                              const rand = (n) =>
                                Array.from(
                                  { length: n },
                                  () =>
                                    chars[
                                      Math.floor(Math.random() * chars.length)
                                    ]
                                ).join("");
                              const newCode = `EMP-${rand(4)}-${rand(4)}`;
                              setEditingCompany((p) => ({
                                ...p,
                                portalCode: newCode,
                              }));
                              showAlert(
                                "🔄 Código regenerado: " +
                                  newCode +
                                  "\n\n⚠️ Guarda los cambios y envía el nuevo código a la empresa."
                              );
                            }}
                            className="px-3 py-1.5 bg-amber-100 text-amber-700 text-[10px] font-black rounded-lg hover:bg-amber-200"
                          >
                            🔄 Regenerar
                          </button>
                          <button
                            onClick={() => {
                              setPortalActivadoInfo(editingCompany);
                            }}
                            className="px-3 py-1.5 bg-indigo-100 text-indigo-700 text-[10px] font-black rounded-lg hover:bg-indigo-200"
                          >
                            📨 Enviar
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <p className="text-[10px] text-amber-700 flex-1">
                            Sin código generado - se creará al guardar
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                  {/* FASE 2: Multi-médico en editar empresa */}
                  <div className="border-t border-gray-100 pt-3 mt-2">
                    <p className="text-xs font-black text-gray-700 uppercase mb-2">
                      👨‍⚕️ Médicos asignados
                    </p>
                    <div className="flex flex-wrap gap-2">
                      {medicos.map((m) => (
                        <label
                          key={m.user}
                          className="flex items-center gap-1.5 text-xs cursor-pointer bg-indigo-50 border border-indigo-200 rounded-lg px-2 py-1"
                        >
                          <input
                            type="checkbox"
                            checked={
                              (editingCompany.medicoIds || []).includes(
                                m.user
                              ) || editingCompany.medicoResponsableId === m.user
                            }
                            onChange={(e) => {
                              if (m.user === editingCompany.medicoResponsableId)
                                return;
                              setEditingCompany((p) => {
                                const ids = p.medicoIds || [];
                                return {
                                  ...p,
                                  medicoIds: e.target.checked
                                    ? [...ids, m.user]
                                    : ids.filter((x) => x !== m.user),
                                };
                              });
                            }}
                            className="accent-indigo-600"
                            disabled={
                              m.user === editingCompany.medicoResponsableId
                            }
                          />
                          <span
                            className={
                              m.user === editingCompany.medicoResponsableId
                                ? "font-black text-indigo-700"
                                : "text-gray-700"
                            }
                          >
                            {m.name || m.user}
                            {m.user === editingCompany.medicoResponsableId &&
                              " ⭐"}
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                  {/* FASE 2: Sedes en editar empresa */}
                  <div className="border-t border-gray-100 pt-3 mt-2">
                    <p className="text-xs font-black text-gray-700 uppercase mb-2">
                      🏢 Sedes
                    </p>
                    <div className="space-y-1 mb-2">
                      {(editingCompany.sedes || []).map((s, i) => (
                        <div
                          key={i}
                          className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-lg px-3 py-1.5"
                        >
                          <span className="text-xs font-bold text-blue-800">
                            {s.nombre} — {s.ciudad}
                            {s.direccion && ` · ${s.direccion}`}
                          </span>
                          <button
                            onClick={() =>
                              setEditingCompany((p) => ({
                                ...p,
                                sedes: (p.sedes || []).filter(
                                  (_, j) => j !== i
                                ),
                              }))
                            }
                            className="text-red-500 text-xs font-black ml-2"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                    <div className="flex gap-2 items-end">
                      <input
                        placeholder="Nombre sede"
                        value={sedeForm.nombre}
                        onChange={(e) =>
                          setSedeForm((p) => ({ ...p, nombre: e.target.value }))
                        }
                        className="border rounded-lg p-1.5 text-xs flex-1"
                      />
                      <input
                        placeholder="Ciudad"
                        value={sedeForm.ciudad}
                        onChange={(e) =>
                          setSedeForm((p) => ({ ...p, ciudad: e.target.value }))
                        }
                        className="border rounded-lg p-1.5 text-xs w-24"
                      />
                      <button
                        onClick={() => {
                          if (!sedeForm.nombre) return;
                          setEditingCompany((p) => ({
                            ...p,
                            sedes: [...(p.sedes || []), { ...sedeForm }],
                          }));
                          setSedeForm({
                            nombre: "",
                            ciudad: "",
                            direccion: "",
                          });
                        }}
                        className="bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-black hover:bg-blue-700"
                      >
                        + Sede
                      </button>
                    </div>
                  </div>
                  {/* FASE 2: Admin portal en editar empresa */}
                  {editingCompany.portalActivo && (
                    <div className="border-t border-purple-100 pt-3 mt-2 bg-purple-50 rounded-xl p-3">
                      <p className="text-xs font-black text-purple-700 uppercase mb-1">
                        🔐 Admin del Portal
                      </p>
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-[10px] font-black text-purple-700 mb-1">
                            Usuario admin
                          </label>
                          <input
                            value={editingCompany.portalAdminUser || ""}
                            onChange={(e) =>
                              setEditingCompany((p) => ({
                                ...p,
                                portalAdminUser: e.target.value,
                              }))
                            }
                            placeholder="usuario_admin"
                            className="w-full border border-purple-200 rounded-lg p-1.5 text-xs"
                          />
                        </div>
                        <div className="flex-1">
                          <label className="block text-[10px] font-black text-purple-700 mb-1">
                            Nueva contraseña (vacío = sin cambio)
                          </label>
                          <input
                            type="password"
                            value={editingCompany.portalAdminPassPlain || ""}
                            onChange={(e) =>
                              setEditingCompany((p) => ({
                                ...p,
                                portalAdminPassPlain: e.target.value,
                              }))
                            }
                            placeholder="••••••••"
                            className="w-full border border-purple-200 rounded-lg p-1.5 text-xs"
                          />
                        </div>
                      </div>
                      {editingCompany.portalAdminPassHash &&
                        !editingCompany.portalAdminPassPlain && (
                          <p className="text-[10px] text-purple-500 mt-1">
                            ✅ Admin configurado. Dejar vacía la contraseña para
                            no cambiarla.
                          </p>
                        )}
                    </div>
                  )}
                  <button
                    onClick={async () => {
                      let saved = { ...editingCompany };
                      // FASE 2: medicoIds incluye responsable
                      if (
                        saved.medicoResponsableId &&
                        !(saved.medicoIds || []).includes(
                          saved.medicoResponsableId
                        )
                      ) {
                        saved.medicoIds = [
                          ...(saved.medicoIds || []),
                          saved.medicoResponsableId,
                        ];
                      }
                      // FASE 2: hashear contraseña admin portal si se proporcionó
                      if (saved.portalAdminPassPlain) {
                        saved.portalAdminPassHash = await _sha256(
                          saved.portalAdminPassPlain
                        );
                        delete saved.portalAdminPassPlain;
                      }
                      // Auto-generar código si portal activo y no tiene código
                      if (saved.portalActivo && !saved.portalCode) {
                        const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
                        const rand = (n) =>
                          Array.from(
                            { length: n },
                            () =>
                              chars[Math.floor(Math.random() * chars.length)]
                          ).join("");
                        saved.portalCode = `EMP-${rand(4)}-${rand(4)}`;
                      }
                      const upd = companies.map((c) =>
                        c.id === saved.id ? saved : c
                      );
                      setCompanies(upd);
                      _syncCompanies(upd);
                      setEditingCompany(null);
                      if (saved.portalActivo) {
                        setPortalActivadoInfo(saved);
                      } else {
                        showAlert("✅ Empresa actualizada.");
                      }
                    }}
                    className="w-full mt-4 bg-purple-700 hover:bg-purple-800 text-white py-2.5 rounded-xl text-sm font-black"
                  >
                    💾 Guardar cambios
                  </button>
                </div>
              </div>
            </div>
          )}
          <datalist id="arl-list">
            {ARL_LIST.map((o) => (
              <option key={o} value={o} />
            ))}
          </datalist>
        </div>

        {/* ═══ MODAL PORTAL ACTIVADO ═══ */}
        {portalActivadoInfo &&
          (() => {
            const baseUrl = window.location.href.split("#")[0];
            const portalUrl = `${baseUrl}#portalempresa?code=${portalActivadoInfo.portalCode}`;
            const msgWhatsapp = [
              `🏢 *Portal SISO OcupaSalud - ${portalActivadoInfo.nombre}*`,
              ``,
              `Estimado cliente, su portal de seguimiento médico ya está disponible.`,
              ``,
              `📋 *¿Qué puede ver en su portal?*`,
              `✅ Listado de trabajadores evaluados`,
              `✅ Conceptos de aptitud laboral`,
              `✅ Estado de cuentas y pagos`,
              `✅ Trabajadores con restricciones activas`,
              `🔒 Los diagnósticos médicos son CONFIDENCIALES y no se muestran`,
              ``,
              `*Opción 1 - Enlace directo (recomendado):*`,
              portalUrl,
              ``,
              `*Opción 2 - Acceso manual:*`,
              `1. Abrir SISO OcupaSalud`,
              `2. Inicio → botón 🏢 Portal Empresa`,
              `3. Escribir código: *${portalActivadoInfo.portalCode}*`,
              `   (o su NIT: ${portalActivadoInfo.nit})`,
              ``,
              `Saludos,`,
              `${currentUser?.name || "Su médico ocupacional"}`,
            ].join("\n");
            return (
              <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4 overflow-y-auto">
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl my-4">
                  {/* Header */}
                  <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-5 rounded-t-2xl">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="text-white font-black text-lg">
                          🎉 ¡Portal empresa activado!
                        </p>
                        <p className="text-indigo-200 text-sm font-bold">
                          {portalActivadoInfo.nombre}
                        </p>
                        <p className="text-indigo-300 text-[11px]">
                          NIT: {portalActivadoInfo.nit}
                          {portalActivadoInfo.dv
                            ? `-${portalActivadoInfo.dv}`
                            : ""}
                        </p>
                      </div>
                      <button
                        onClick={() => setPortalActivadoInfo(null)}
                        className="text-indigo-200 hover:text-white text-xl font-black"
                      >
                        ✕
                      </button>
                    </div>
                  </div>
                  <div className="p-5 space-y-4 overflow-y-auto max-h-[75vh]">
                    {/* ─── CÓMO FUNCIONA ─── */}
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                      <p className="text-xs font-black text-blue-800 mb-1">
                        📌 ¿Cómo funciona el portal por empresa?
                      </p>
                      <p className="text-[11px] text-blue-700 leading-relaxed">
                        SISO usa <strong>un portal inteligente</strong> que cada
                        empresa accede con su código exclusivo. Al ingresar el
                        código, el portal filtra y muestra{" "}
                        <strong>únicamente los datos de esa empresa</strong>.
                        Ninguna empresa puede ver datos de otra.
                      </p>
                    </div>

                    {/* ─── CÓDIGO ─── */}
                    <div className="bg-indigo-50 border-2 border-indigo-400 rounded-xl p-4">
                      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-wider mb-2 text-center">
                        🔑 Código de acceso exclusivo
                      </p>
                      <div className="flex items-center gap-2 mb-2">
                        <p className="text-3xl font-black text-indigo-900 tracking-[0.25em] font-mono flex-1 text-center bg-white border border-indigo-200 rounded-lg py-2">
                          {portalActivadoInfo.portalCode}
                        </p>
                        <button
                          onClick={() => {
                            if (navigator.clipboard) {
                              navigator.clipboard
                                .writeText(portalActivadoInfo.portalCode)
                                .then(() => showAlert("✅ Código copiado"));
                            } else
                              showAlert(
                                "Código: " + portalActivadoInfo.portalCode
                              );
                          }}
                          className="px-3 py-2 bg-indigo-600 text-white text-[10px] font-black rounded-lg hover:bg-indigo-700 whitespace-nowrap"
                        >
                          📋 Copiar
                        </button>
                      </div>
                      <p className="text-[10px] text-indigo-500 text-center">
                        Código único e intransferible para{" "}
                        <strong>{portalActivadoInfo.nombre}</strong>
                      </p>
                    </div>

                    {/* ─── URL DIRECTA ─── */}
                    <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
                      <p className="text-[10px] font-black text-emerald-700 uppercase mb-2">
                        🔗 Enlace directo (recomendado - 1 click para entrar)
                      </p>
                      <div className="flex items-center gap-2">
                        <p className="text-[10px] text-emerald-800 font-mono bg-white border border-emerald-200 rounded-lg px-2 py-1.5 flex-1 truncate">
                          {portalUrl}
                        </p>
                        <button
                          onClick={() => {
                            if (navigator.clipboard) {
                              navigator.clipboard
                                .writeText(portalUrl)
                                .then(() =>
                                  showAlert(
                                    "✅ Enlace copiado.\nPuede pegarlo en WhatsApp o correo."
                                  )
                                );
                            } else showAlert("Enlace: " + portalUrl);
                          }}
                          className="px-3 py-1.5 bg-emerald-600 text-white text-[10px] font-black rounded-lg hover:bg-emerald-700 whitespace-nowrap"
                        >
                          📋 Copiar
                        </button>
                      </div>
                      <p className="text-[10px] text-emerald-600 mt-1">
                        Al abrir este enlace el código se pre-carga - la empresa
                        solo presiona "Acceder"
                      </p>
                    </div>

                    {/* ─── QUÉ VE ─── */}
                    <div>
                      <p className="text-[10px] font-black text-gray-600 uppercase mb-2">
                        Lo que verá <strong>{portalActivadoInfo.nombre}</strong>
                        :
                      </p>
                      <div className="grid grid-cols-3 gap-2">
                        {[
                          {
                            icon: "👥",
                            label: "Trabajadores",
                            desc: "Nombres, cargos y aptitud",
                          },
                          {
                            icon: "💳",
                            label: "Cuentas",
                            desc: "Facturas y estado de pagos",
                          },
                          {
                            icon: "⛔",
                            label: "Restricciones",
                            desc: "Trabajadores no aptos",
                          },
                        ].map((item) => (
                          <div
                            key={item.label}
                            className="bg-gray-50 border border-gray-100 rounded-xl p-3 text-center"
                          >
                            <p className="text-xl mb-1">{item.icon}</p>
                            <p className="text-[10px] font-black text-gray-700">
                              {item.label}
                            </p>
                            <p className="text-[9px] text-gray-400 mt-0.5">
                              {item.desc}
                            </p>
                          </div>
                        ))}
                      </div>
                      <p className="text-[10px] text-red-600 font-bold text-center mt-2">
                        🔒 Diagnósticos clínicos = CONFIDENCIALES - nunca
                        visibles (Art. 16 Res. 1843/2025)
                      </p>
                    </div>

                    {/* ─── PRÓXIMOS PASOS ─── */}
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <p className="text-[10px] font-black text-amber-800 uppercase mb-2">
                        📌 Próximos pasos
                      </p>
                      <div className="space-y-2">
                        {[
                          {
                            n: "1",
                            txt: `Copie el mensaje de abajo y envíelo al gerente o contacto de ${portalActivadoInfo.nombre} por WhatsApp o correo`,
                          },
                          {
                            n: "2",
                            txt: "La empresa abre el enlace directo (o ingresa el código manualmente en Portal Empresa)",
                          },
                          {
                            n: "3",
                            txt: "Verán en tiempo real sus trabajadores evaluados, aptitudes y estado de cuentas",
                          },
                          {
                            n: "4",
                            txt: "Cada nueva HC cerrada de esta empresa aparecerá automáticamente en su portal",
                          },
                        ].map((s) => (
                          <div key={s.n} className="flex gap-2 items-start">
                            <span className="min-w-[20px] h-5 w-5 bg-amber-400 text-white text-[10px] font-black rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                              {s.n}
                            </span>
                            <p className="text-[11px] text-amber-800">
                              {s.txt}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* ─── BOTONES ─── */}
                    <button
                      onClick={() => {
                        if (navigator.clipboard) {
                          navigator.clipboard
                            .writeText(msgWhatsapp)
                            .then(() =>
                              showAlert(
                                "✅ Mensaje copiado.\n\nPéguelo en WhatsApp, correo o Teams."
                              )
                            );
                        } else {
                          const ta = document.createElement("textarea");
                          ta.value = msgWhatsapp;
                          document.body.appendChild(ta);
                          ta.select();
                          document.execCommand("copy");
                          document.body.removeChild(ta);
                          showAlert("✅ Copiado.");
                        }
                      }}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-black rounded-xl"
                    >
                      📱 Copiar mensaje completo para WhatsApp / Email
                    </button>

                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setPortalActivadoInfo(null);
                          setPortalEmpresaCodigo(portalActivadoInfo.portalCode);
                          goTo("portalempresa");
                        }}
                        className="flex-1 py-2.5 bg-indigo-100 text-indigo-700 text-xs font-black rounded-xl hover:bg-indigo-200"
                      >
                        🌐 Vista previa del portal
                      </button>
                      <button
                        onClick={() => setPortalActivadoInfo(null)}
                        className="flex-1 py-2.5 bg-gray-100 text-gray-600 text-xs font-black rounded-xl hover:bg-gray-200"
                      >
                        ✓ Cerrar
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}
      </div>
    );
}
