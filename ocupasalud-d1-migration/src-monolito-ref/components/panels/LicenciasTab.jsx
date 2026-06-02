// src/components/panels/LicenciasTab.jsx
import React from 'react';
import { PLAN_CONFIG } from '../../data/planConfig.js';
import { _validarContrasena } from '../ui/FortalezaPass.jsx';
import _FortalezaPass from '../ui/FortalezaPass.jsx';
import { _sha256, _H, _pbkdf2Hash, _hashSync, _verifyPassword, _auditLog, _rl } from '../../utils/security.js';
import { Clock, Users, CheckCircle2, AlertCircle, Lock, Shield, RefreshCw, Plus, ChevronDown, Trash2 } from 'lucide-react';

const LicenciasTab = ({
  usersList,
  setUsersList,
  patientsList,
  currentUser,
  setCurrentUser,
  _sync,
  pendingActivationPlan,
  setPendingActivationPlan,
}) => {
  // ══ GUARD: solo administrador puede gestionar licencias ══
  if (currentUser?.role !== "administrador") {
    return (
      <div className="bg-red-50 border-2 border-red-300 rounded-2xl p-8 text-center space-y-3">
        <div className="text-4xl">🔒</div>
        <p className="font-black text-red-800 text-lg">Acceso denegado</p>
        <p className="text-red-600 text-sm">
          La gestión de planes y licencias es{" "}
          <strong>exclusiva del administrador</strong>.
        </p>
        <p className="text-red-500 text-xs">
          Si necesitas un cambio de plan, comunícate con el administrador de tu
          cuenta.
        </p>
      </div>
    );
  }

  const [licEditId, setLicEditId] = React.useState(null);
  const [licForm, setLicForm] = React.useState({});
  const [licSaved, setLicSaved] = React.useState(false);
  const [licErrors, setLicErrors] = React.useState([]); // validación método de pago

  const planOrder = ["libre", "starter", "pro", "clinica"];
  const planColors = {
    libre: "gray",
    starter: "teal",
    pro: "blue",
    clinica: "purple",
  };

  // ── Auto-apertura cuando viene de "Activar para usuario" en renderPlanes ──
  React.useEffect(() => {
    if (!pendingActivationPlan) return;
    // Abrir el primer usuario que no sea el admin activo, o el primero de la lista
    const target =
      usersList.find((u) => u.activo !== false && u.user !== "drcucalon") ||
      usersList.find((u) => u.activo !== false);
    if (target) {
      const today = new Date().toISOString().split("T")[0];
      const exp = new Date();
      exp.setMonth(exp.getMonth() + 1);
      setLicEditId(target.id || target.user);
      setLicForm({
        license: pendingActivationPlan,
        licenseStarted: today,
        licenseExpiry: exp.toISOString().split("T")[0],
        monto: PLAN_CONFIG[pendingActivationPlan]?.price || 0,
        formaPago: "Transferencia",
        tipo: "manual",
        notas: "",
      });
    }
  }, [pendingActivationPlan]);

  const openEdit = (u) => {
    setLicEditId(u.id || u.user);
    setLicForm({
      license: u.license || "libre",
      licenseExpiry: u.licenseExpiry || "",
      licenseStarted:
        u.licenseStarted || new Date().toISOString().split("T")[0],
      monto: "",
      formaPago: "Transferencia",
      tipo: "manual",
      notas: "",
    });
    setLicSaved(false);
    if (pendingActivationPlan) setPendingActivationPlan(null); // limpiar luego de abrir
  };

  const saveLic = (u) => {
    // ══ VALIDACIÓN ESTRICTA POR MÉTODO DE PAGO ══
    const errors = [];
    const monto = Number(licForm.monto) || 0;
    const planPrecio = PLAN_CONFIG[licForm.license]?.price || 0;

    if (licForm.license !== "libre") {
      // 1. Planes de pago: monto requerido salvo prueba/cortesía
      if (["manual", "referido"].includes(licForm.tipo)) {
        if (!licForm.monto || monto <= 0)
          errors.push(
            "💰 El monto cobrado es obligatorio para activación manual o referido."
          );
        if (monto < planPrecio * 0.5)
          errors.push(
            `💰 El monto ($${monto.toLocaleString(
              "es-CO"
            )}) parece muy bajo para el plan ${
              PLAN_CONFIG[licForm.license]?.label
            } ($${planPrecio.toLocaleString("es-CO")}/mes). Verifica.`
          );
      }
      // 2. Cortesía: requiere nota de justificación
      if (licForm.tipo === "cortesia") {
        if (!licForm.notas || licForm.notas.trim().length < 10)
          errors.push(
            "📝 Las activaciones por cortesía requieren justificación en las notas (mínimo 10 caracteres)."
          );
      }
      // 3. Transferencia/Nequi/Daviplata: requieren método y monto
      if (
        ["Transferencia", "Nequi", "Daviplata"].includes(licForm.formaPago) &&
        licForm.tipo !== "prueba" &&
        licForm.tipo !== "cortesia"
      ) {
        if (!licForm.monto || monto <= 0)
          errors.push(
            `📲 ${licForm.formaPago}: debes registrar el monto recibido para confirmar el pago.`
          );
      }
      // 4. Fecha de vencimiento requerida para planes de pago
      if (!licForm.licenseExpiry)
        errors.push("📅 Define una fecha de vencimiento para el plan.");
      // 5. Prueba: máx. 30 días
      if (licForm.tipo === "prueba" && licForm.licenseExpiry) {
        const dias = Math.ceil(
          (new Date(licForm.licenseExpiry) - new Date()) / 86400000
        );
        const maxPrueba = PLAN_CONFIG[licForm.license]?.trialDays || 15;
        if (dias > maxPrueba)
          errors.push(
            `⏰ Período de prueba máximo: ${maxPrueba} días. Ajusta la fecha de vencimiento.`
          );
      }
    }

    if (errors.length > 0) {
      setLicErrors(errors);
      return;
    }
    setLicErrors([]);

    const today = new Date().toISOString().split("T")[0];
    const upd = usersList.map((usr) =>
      usr.id === u.id || usr.user === u.user
        ? {
            ...usr,
            license: licForm.license,
            licenseExpiry: licForm.licenseExpiry || null,
            licenseStarted: licForm.licenseStarted || today,
          }
        : usr
    );
    setUsersList(upd);
    _sync("siso_users", JSON.stringify(upd));
    _sbSet("siso_users", upd); // sync inmediato a nube
    if (currentUser?.user === u.user) {
      setCurrentUser((prev) => ({
        ...prev,
        license: licForm.license,
        licenseExpiry: licForm.licenseExpiry || null,
        licenseStarted: licForm.licenseStarted || new Date().toISOString().split("T")[0],
      }));
    }
    setLicSaved(true);
    setPendingActivationPlan(null);
    setTimeout(() => {
      setLicEditId(null);
      setLicSaved(false);
    }, 1400);
  };

  const getDaysLeft = (u) => {
    if (!u.licenseExpiry || u.license === "libre") return null;
    return Math.ceil((new Date(u.licenseExpiry) - new Date()) / 86400000);
  };

  const getStatusBadge = (u) => {
    const plan = PLAN_CONFIG[u.license || "libre"];
    const d = getDaysLeft(u);
    if (!u.license || u.license === "libre")
      return (
        <span className="text-[10px] font-black text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
          🆓 Libre
        </span>
      );
    if (d !== null && d < 0)
      return (
        <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
          ❌ Vencido
        </span>
      );
    if (d !== null && d <= 7)
      return (
        <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
          ⏰ Vence en {d}d
        </span>
      );
    const hcU = _contarHC(patientsList, u.user);
    if (plan.maxHC < 9999) {
      const pct = hcU / plan.maxHC;
      if (pct >= 1)
        return (
          <span className="text-[10px] font-black text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
            🔴 Límite HC
          </span>
        );
      if (pct >= 0.8)
        return (
          <span className="text-[10px] font-black text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full">
            🟡 80% HC
          </span>
        );
    }
    return (
      <span className="text-[10px] font-black text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full">
        ✅ Activo
      </span>
    );
  };

  const activeUsers = usersList.filter((u) => u.activo !== false);
  const ingresos = activeUsers.reduce(
    (s, u) => s + (PLAN_CONFIG[u.license || "libre"]?.price || 0),
    0
  );
  const vencenProx = activeUsers.filter((u) => {
    if (!u.licenseExpiry || !u.license || u.license === "libre") return false;
    const d = Math.ceil((new Date(u.licenseExpiry) - new Date()) / 86400000);
    return d >= 0 && d <= 7;
  });
  const pendingPlan = PLAN_CONFIG[pendingActivationPlan];

  return (
    <div className="space-y-5">
      {/* ── BANNER GUÍA: aparece cuando viene desde "Activar para usuario" ── */}
      {pendingActivationPlan && pendingPlan && (
        <div className="bg-blue-600 text-white rounded-xl px-5 py-4 flex items-start gap-4">
          <div className="text-3xl mt-0.5">🎯</div>
          <div className="flex-1">
            <p className="font-black text-base">
              Activando plan {pendingPlan.label} - {pendingPlan.priceLabel}
            </p>
            <p className="text-blue-100 text-sm mt-1">
              Se ha abierto automáticamente el editor del primer usuario.
              <br />
              <strong>¿Cómo funciona?</strong> Selecciona el usuario, confirma
              las fechas, el monto recibido y haz clic en{" "}
              <em>"💾 Guardar cambios"</em>.
            </p>
            <ol className="text-blue-100 text-xs mt-2 space-y-0.5 list-decimal list-inside">
              <li>
                Verifica que el plan seleccionado sea{" "}
                <strong>{pendingPlan.label}</strong>
              </li>
              <li>
                Ajusta la fecha de vencimiento (por defecto: 1 mes desde hoy)
              </li>
              <li>Ingresa el monto cobrado y la forma de pago</li>
              <li>
                Haz clic en <strong>💾 Guardar cambios</strong>
              </li>
            </ol>
          </div>
          <button
            onClick={() => setPendingActivationPlan(null)}
            className="text-blue-200 hover:text-white text-lg font-black leading-none"
          >
            ✕
          </button>
        </div>
      )}

      {/* ── MÉTRICAS ── */}
      <div className="grid grid-cols-3 gap-4">
        {[
          {
            icon: "💰",
            label: "Ingresos estimados/mes",
            value: `$${ingresos.toLocaleString("es-CO")} COP`,
            sub: `${
              activeUsers.filter((u) => u.license && u.license !== "libre")
                .length
            } usuarios de pago`,
            bg: "bg-emerald-900",
          },
          {
            icon: "👥",
            label: "Usuarios activos",
            value: `${activeUsers.length} usuarios`,
            sub: `L:${
              activeUsers.filter((u) => !u.license || u.license === "libre")
                .length
            }  S:${
              activeUsers.filter((u) => u.license === "starter").length
            }  P:${activeUsers.filter((u) => u.license === "pro").length}  C:${
              activeUsers.filter((u) => u.license === "clinica").length
            }`,
            bg: "bg-slate-800",
          },
          {
            icon: "⏰",
            label: "Vencen en 7 días",
            value: `${vencenProx.length} usuarios`,
            sub:
              vencenProx.map((u) => u.name || u.user).join(", ") || "Ninguno",
            bg: "bg-amber-800",
          },
        ].map((m) => (
          <div key={m.label} className={`${m.bg} rounded-xl p-4 text-white`}>
            <p className="text-2xl mb-1">{m.icon}</p>
            <p className="text-lg font-black">{m.value}</p>
            <p className="text-xs opacity-70 mt-0.5">{m.label}</p>
            <p className="text-[10px] opacity-50 mt-1 truncate">{m.sub}</p>
          </div>
        ))}
      </div>

      {/* ── TABLA DE USUARIOS ── */}
      <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-2">
          <span className="text-sm font-black text-gray-800">
            👥 Usuarios y Planes
          </span>
          <span className="text-xs text-gray-400">
            - Clic en ⚙️ Editar para asignar o cambiar el plan de un usuario
          </span>
        </div>
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50">
              <th className="text-left px-3 py-2 font-black text-gray-600">
                Usuario
              </th>
              <th className="text-left px-3 py-2 font-black text-gray-600">
                Plan actual
              </th>
              <th className="text-center px-3 py-2 font-black text-gray-600">
                HC usadas
              </th>
              <th className="text-center px-3 py-2 font-black text-gray-600">
                Vence
              </th>
              <th className="text-center px-3 py-2 font-black text-gray-600">
                Estado
              </th>
              <th className="text-center px-3 py-2 font-black text-gray-600">
                Acción
              </th>
            </tr>
          </thead>
          <tbody>
            {activeUsers.map((u, i) => {
              const plan = PLAN_CONFIG[u.license || "libre"];
              const hcU = _contarHC(patientsList, u.user);
              const dLeft = getDaysLeft(u);
              const isEditing = licEditId === (u.id || u.user);
              const col = planColors[u.license || "libre"];
              return (
                <React.Fragment key={u.user}>
                  <tr
                    className={`border-t border-gray-50 ${
                      isEditing
                        ? "bg-blue-50"
                        : i % 2 === 0
                        ? "bg-white"
                        : "bg-gray-50/30"
                    }`}
                  >
                    <td className="px-3 py-2.5">
                      <p className="font-black text-gray-800">
                        {u.name || u.user}
                      </p>
                      <p className="text-gray-400">
                        @{u.user} · {u.role}
                      </p>
                    </td>
                    <td className="px-3 py-2.5">
                      <span
                        className={`font-black text-${col}-700 bg-${col}-50 px-2 py-0.5 rounded-full text-[11px]`}
                      >
                        {plan.label}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span
                        className={
                          plan.maxHC < 9999 && hcU / plan.maxHC >= 0.8
                            ? "font-black text-amber-600"
                            : "text-gray-600"
                        }
                      >
                        {hcU}
                        {plan.maxHC < 9999 ? `/${plan.maxHC}` : ""}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-center text-gray-500 text-[11px]">
                      {u.licenseExpiry && u.license !== "libre" ? (
                        dLeft !== null ? (
                          dLeft < 0 ? (
                            <span className="text-red-500 font-black">
                              Vencido
                            </span>
                          ) : (
                            <span
                              className={
                                dLeft <= 7 ? "text-amber-600 font-black" : ""
                              }
                            >
                              {new Date(u.licenseExpiry).toLocaleDateString(
                                "es-CO"
                              )}
                            </span>
                          )
                        ) : (
                          "-"
                        )
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      {getStatusBadge(u)}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <button
                        onClick={() =>
                          isEditing ? setLicEditId(null) : openEdit(u)
                        }
                        className={`text-[11px] font-black px-2 py-1 rounded-lg transition ${
                          isEditing
                            ? "bg-gray-200 text-gray-600"
                            : "text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100"
                        }`}
                      >
                        {isEditing ? "✕ Cerrar" : "⚙️ Editar"}
                      </button>
                    </td>
                  </tr>

                  {/* ── PANEL EDITOR INLINE ── */}
                  {isEditing && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-5 bg-blue-50 border-t border-blue-100"
                      >
                        <p className="text-[10px] font-black text-blue-800 uppercase mb-3">
                          Editando licencia de {u.name || u.user}
                        </p>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {/* Plan */}
                          <div>
                            <label className="block text-[10px] font-black text-gray-600 mb-1">
                              Plan a activar
                            </label>
                            <select
                              value={licForm.license}
                              onChange={(e) =>
                                setLicForm((p) => ({
                                  ...p,
                                  license: e.target.value,
                                }))
                              }
                              className="w-full p-2 border-2 border-blue-300 rounded-lg text-xs bg-white font-bold focus:outline-none focus:border-blue-500"
                            >
                              {planOrder.map((pk) => (
                                <option key={pk} value={pk}>
                                  {PLAN_CONFIG[pk].label} -{" "}
                                  {PLAN_CONFIG[pk].priceLabel}
                                </option>
                              ))}
                            </select>
                          </div>
                          {/* Fecha inicio */}
                          <div>
                            <label className="block text-[10px] font-black text-gray-600 mb-1">
                              Fecha de inicio
                            </label>
                            <input
                              type="date"
                              value={licForm.licenseStarted}
                              onChange={(e) =>
                                setLicForm((p) => ({
                                  ...p,
                                  licenseStarted: e.target.value,
                                }))
                              }
                              className="w-full p-2 border border-gray-200 rounded-lg text-xs"
                            />
                          </div>
                          {/* Fecha vencimiento */}
                          <div>
                            <label className="block text-[10px] font-black text-gray-600 mb-1">
                              Fecha vencimiento
                            </label>
                            <input
                              type="date"
                              value={licForm.licenseExpiry}
                              onChange={(e) =>
                                setLicForm((p) => ({
                                  ...p,
                                  licenseExpiry: e.target.value,
                                }))
                              }
                              className="w-full p-2 border border-gray-200 rounded-lg text-xs"
                            />
                          </div>
                          {/* Tipo */}
                          <div>
                            <label className="block text-[10px] font-black text-gray-600 mb-1">
                              Tipo de activación
                            </label>
                            <select
                              value={licForm.tipo}
                              onChange={(e) =>
                                setLicForm((p) => ({
                                  ...p,
                                  tipo: e.target.value,
                                }))
                              }
                              className="w-full p-2 border border-gray-200 rounded-lg text-xs bg-white"
                            >
                              <option value="manual">
                                Manual (pago verificado)
                              </option>
                              <option value="prueba">Prueba gratuita</option>
                              <option value="referido">Referido</option>
                              <option value="cortesia">Cortesía</option>
                            </select>
                          </div>
                          {/* Monto */}
                          <div>
                            <label className="block text-[10px] font-black text-gray-600 mb-1">
                              Monto cobrado (COP)
                            </label>
                            <input
                              type="number"
                              value={licForm.monto}
                              onChange={(e) =>
                                setLicForm((p) => ({
                                  ...p,
                                  monto: e.target.value,
                                }))
                              }
                              placeholder={
                                PLAN_CONFIG[licForm.license]?.price || 0
                              }
                              className="w-full p-2 border border-gray-200 rounded-lg text-xs"
                            />
                          </div>
                          {/* Forma de pago */}
                          <div>
                            <label className="block text-[10px] font-black text-gray-600 mb-1">
                              Forma de pago
                            </label>
                            <select
                              value={licForm.formaPago}
                              onChange={(e) =>
                                setLicForm((p) => ({
                                  ...p,
                                  formaPago: e.target.value,
                                }))
                              }
                              className="w-full p-2 border border-gray-200 rounded-lg text-xs bg-white"
                            >
                              <option>Transferencia</option>
                              <option>Nequi</option>
                              <option>Daviplata</option>
                              <option>Efectivo</option>
                              <option>Cortesía</option>
                            </select>
                          </div>
                          {/* Restricciones por método de pago */}
                          <div className="col-span-2 md:col-span-3 bg-blue-50 rounded-lg p-3 border border-blue-200">
                            <p className="text-[10px] font-black text-blue-800 uppercase mb-2">
                              📋 Restricciones según método de pago y tipo de
                              activación
                            </p>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                              {[
                                {
                                  tipo: "Transferencia / Nequi / Daviplata",
                                  rule: "Monto cobrado obligatorio. Se registra para control de ingresos.",
                                },
                                {
                                  tipo: "Efectivo",
                                  rule: "Monto recomendado. Verificar recibo físico.",
                                },
                                {
                                  tipo: "Manual (pago verificado)",
                                  rule: "Requiere monto ≥ 50% del precio del plan.",
                                },
                                {
                                  tipo: "Prueba gratuita",
                                  rule: `Máx. ${
                                    PLAN_CONFIG[licForm.license]?.trialDays ||
                                    15
                                  } días. Monto = $0. Sin restricción de nota.`,
                                },
                                {
                                  tipo: "Referido",
                                  rule: "Requiere monto cobrado. Anota quién refirió en notas.",
                                },
                                {
                                  tipo: "Cortesía",
                                  rule: "Monto = $0 permitido PERO notas con justificación son OBLIGATORIAS (≥10 caracteres).",
                                },
                              ].map((r) => (
                                <div
                                  key={r.tipo}
                                  className={`text-[10px] py-1 ${
                                    licForm.formaPago ===
                                      r.tipo.split(" / ")[0] ||
                                    licForm.tipo ===
                                      r.tipo
                                        .split("(")[0]
                                        .trim()
                                        .toLowerCase()
                                        .replace(" ", "_")
                                      ? "text-blue-800 font-bold"
                                      : "text-blue-600"
                                  }`}
                                >
                                  <span className="font-black">
                                    • {r.tipo}:
                                  </span>{" "}
                                  {r.rule}
                                </div>
                              ))}
                            </div>
                          </div>
                          {/* Notas */}
                          <div className="col-span-2 md:col-span-3">
                            <label className="block text-[10px] font-black text-gray-600 mb-1">
                              Notas internas{" "}
                              {licForm.tipo === "cortesia" ? (
                                <span className="text-red-600">
                                  * OBLIGATORIO para cortesía
                                </span>
                              ) : (
                                "(recomendado)"
                              )}
                            </label>
                            <input
                              value={licForm.notas}
                              onChange={(e) => {
                                setLicForm((p) => ({
                                  ...p,
                                  notas: e.target.value,
                                }));
                                setLicErrors([]);
                              }}
                              placeholder={
                                licForm.tipo === "cortesia"
                                  ? "Ej: Cortesía por ser médico fundador del proyecto."
                                  : "Ej: Pago recibido Nequi 300 123 4567 · Referido por Dr. Pérez"
                              }
                              className={`w-full p-2 border rounded-lg text-xs ${
                                licForm.tipo === "cortesia"
                                  ? "border-red-300 bg-red-50"
                                  : "border-gray-200"
                              }`}
                            />
                          </div>
                        </div>
                        {/* Errores de validación */}
                        {licErrors.length > 0 && (
                          <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3 space-y-1">
                            <p className="text-xs font-black text-red-800 mb-1">
                              ⛔ Corrige los siguientes errores antes de
                              guardar:
                            </p>
                            {licErrors.map((e, i) => (
                              <p key={i} className="text-xs text-red-700">
                                • {e}
                              </p>
                            ))}
                          </div>
                        )}
                        {/* Botones de acción */}
                        <div className="flex flex-wrap gap-2 mt-4">
                          <button
                            onClick={() => {
                              setLicErrors([]);
                              saveLic(u);
                            }}
                            className={`px-5 py-2 rounded-lg text-xs font-black transition ${
                              licSaved
                                ? "bg-emerald-500 text-white"
                                : "bg-blue-600 hover:bg-blue-700 text-white"
                            }`}
                          >
                            {licSaved ? "✅ ¡Guardado!" : "💾 Guardar cambios"}
                          </button>
                          <button
                            onClick={() => {
                              setLicEditId(null);
                              setPendingActivationPlan(null);
                            }}
                            className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-xs font-bold hover:bg-gray-200 transition"
                          >
                            Cancelar
                          </button>
                          {licForm.license !== "libre" && (
                            <button
                              onClick={() => {
                                const hoy = new Date();
                                hoy.setDate(
                                  hoy.getDate() +
                                    (PLAN_CONFIG[licForm.license]?.trialDays ||
                                      15)
                                );
                                setLicForm((p) => ({
                                  ...p,
                                  licenseExpiry: hoy
                                    .toISOString()
                                    .split("T")[0],
                                  tipo: "prueba",
                                }));
                              }}
                              className="bg-amber-100 text-amber-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-amber-200 transition"
                            >
                              🎁 +
                              {PLAN_CONFIG[licForm.license]?.trialDays || 15}d
                              prueba
                            </button>
                          )}
                          {licForm.license !== "libre" && (
                            <button
                              onClick={() => {
                                const hoy = new Date();
                                hoy.setMonth(hoy.getMonth() + 1);
                                setLicForm((p) => ({
                                  ...p,
                                  licenseExpiry: hoy
                                    .toISOString()
                                    .split("T")[0],
                                }));
                              }}
                              className="bg-emerald-100 text-emerald-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-emerald-200 transition"
                            >
                              +1 mes
                            </button>
                          )}
                          {licForm.license !== "libre" && (
                            <button
                              onClick={() => {
                                const hoy = new Date();
                                hoy.setFullYear(hoy.getFullYear() + 1);
                                setLicForm((p) => ({
                                  ...p,
                                  licenseExpiry: hoy
                                    .toISOString()
                                    .split("T")[0],
                                }));
                              }}
                              className="bg-purple-100 text-purple-700 px-4 py-2 rounded-lg text-xs font-bold hover:bg-purple-200 transition"
                            >
                              +1 año
                            </button>
                          )}
                        </div>
                        {/* Resumen de lo que se va a guardar */}
                        <div className="mt-3 p-3 bg-white rounded-lg border border-blue-200 text-xs text-gray-600 flex flex-wrap gap-4">
                          <span>
                            📋 Plan:{" "}
                            <strong className="text-blue-700">
                              {PLAN_CONFIG[licForm.license]?.label}
                            </strong>
                          </span>
                          <span>
                            📅 Vence:{" "}
                            <strong>
                              {licForm.licenseExpiry || "sin fecha"}
                            </strong>
                          </span>
                          <span>
                            💳 Pago: <strong>{licForm.formaPago}</strong>
                          </span>
                          {licForm.monto > 0 && (
                            <span>
                              💰{" "}
                              <strong>
                                ${Number(licForm.monto).toLocaleString("es-CO")}{" "}
                                COP
                              </strong>
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default LicenciasTab;
