import React from 'react';
import {
  Activity,
  Save,
  Trash2,
  LogOut,
  UserPlus,
  GraduationCap,
  UploadCloud,
  FileSignature,
  HardDrive,
  UserCheck,
  Lock,
  Banknote,
  Receipt,
  Pencil,
  X,
  Shield,
} from 'lucide-react';
import LicenciasTab from '../components/panels/LicenciasTab';
import { _sbSet, _sbDelete, _sbGetAll, _compKey, _compKeyCloud, _patKeyCloud } from '../shared/lib/supabase';
import { _sha256, _pbkdf2Hash } from '../shared/lib/crypto';
import { _totpGenSecret, _totpGetQRCodeUrl } from '../shared/lib/totp';
import { ORG_DEFAULT_ID, SECRETARIA_PERMISOS_DEFAULT, _isAdminEmpresa } from '../shared/data/planConfig';
import { DEFAULT_DOCTOR_DATA } from '../shared/data/catalogs';
import { _validarContrasena } from '../shared/lib/security';

export default function UsersSection({ ctx }) {
  const {
    _isAdmin,
    _patKey,
    _sync,
    _syncCompanies,
    _syncPatients,
    activeUserMgmtTab,
    auditLog,
    companies,
    cotizaciones,
    currentUser,
    data,
    doctorSignature,
    editForm,
    goBack,
    lista,
    medicoTurnoActivo,
    newUserForm,
    orgsList,
    p,
    patientsList,
    pendingActivationPlan,
    sbCloudData,
    sbLoading,
    setActiveUserMgmtTab,
    setAuditLog,
    setCompanies,
    setCurrentUser,
    setDoctorSignature,
    setEditForm,
    setMedicoTurnoActivo,
    setNewUserForm,
    setPatientsList,
    setPendingActivationPlan,
    setSbCloudData,
    setSbLoading,
    setUserEditId,
    setUsersList,
    setView,
    showAlert,
    showConfirm,
    showPrompt,
    supabase,
    teleconsultas,
    tipoExamen,
    u,
    userEditId,
    usersList,
  } = ctx;

    // Médico (sin empresa): solo puede ver/editar su propio perfil
    if (currentUser?.role === "medico" && !currentUser?.empresaId) {
      const me = usersList.find((u) => u.user === currentUser?.user);
      if (me && !userEditId) {
        setTimeout(() => {
          setUserEditId(me.id || me.user);
          setEditForm({
            ...me,
            doctorData: { ...DEFAULT_DOCTOR_DATA, ...(me.doctorData || {}) },
          });
        }, 0);
      }
      if (activeUserMgmtTab !== "list")
        setTimeout(() => setActiveUserMgmtTab("list"), 0);
    }
    // Médico de empresa: puede ver su perfil y la lista de usuarios de su empresa (solo lectura)
    if (currentUser?.role === "medico" && currentUser?.empresaId) {
      if (activeUserMgmtTab !== "list")
        setTimeout(() => setActiveUserMgmtTab("list"), 0);
    }
    const startEdit = (u) => {
      setUserEditId(u.id || u.user);
      setEditForm({
        ...u,
        doctorData: { ...DEFAULT_DOCTOR_DATA, ...(u.doctorData || {}) },
      });
    };
    const saveEdit = () => {
      // FIX M-06: validar complejidad de contraseña si se cambia
      const saveUser = async () => {
        let userData = { ...editForm };
        if (editForm.pass && editForm.pass.length > 0) {
          const pw = editForm.pass;
          const { valida: pwVal2, errores: pwErr2 } = _validarContrasena(pw);
          if (!pwVal2) {
            showAlert(
              "⚠️ Contraseña no cumple la política:\n• " + pwErr2.join("\n• ")
            );
            return;
          }
          const { hash: pwHash, salt: pwSalt } = await _pbkdf2Hash(pw);
          userData.passHash = pwHash;
          userData.passSalt = pwSalt;
          delete userData.pass; // nunca guardar texto plano
        }
        const upd = usersList.map((u) => (u.id === userEditId ? userData : u));
        setUsersList(upd);
        _sync("siso_users", JSON.stringify(upd));
        // ── SYNC INMEDIATO A SUPABASE (aplica para todos los usuarios activos) ──
        _sbSet("siso_users", upd);
        // ── Si es secretaria: guardar permisos en clave dedicada para recarga en tiempo real ──
        if (userData.role === "secretaria") {
          const permKey = `siso_permisos_${userData.user}`;
          const permData = {
            secretariaPermisos: userData.secretariaPermisos || SECRETARIA_PERMISOS_DEFAULT,
            medicosAsignados: userData.medicosAsignados || [],
            updatedAt: new Date().toISOString(),
            updatedBy: currentUser?.user || "admin",
          };
          _sbSet(permKey, permData);
          _ls.setItem(permKey, JSON.stringify(permData));
        }
        // ── Si el usuario editó su propio perfil, actualizar currentUser en memoria ──
        if (
          userData.id === currentUser?.id ||
          userData.user === currentUser?.user
        ) {
          setCurrentUser((prev) => ({ ...prev, ...userData }));
          if (userData.doctorData) {
            _sbSet(`siso_doctor_data_${userData.user}`, userData.doctorData);
          }
          if (userData.doctorData?.signature) {
            setDoctorSignature(userData.doctorData.signature);
            _sync("siso_doctor_signature", userData.doctorData.signature);
            _sbSet("siso_doctor_signature", userData.doctorData.signature);
          }
        }
        setUserEditId(null);
        showAlert("✅ Perfil guardado. Los cambios se aplican de inmediato para " + (userData.name || userData.user) + ".");
      };
      saveUser();
    };
    const dd = editForm.doctorData || {};
    const setDD = (field, val) =>
      setEditForm((p) => ({
        ...p,
        doctorData: { ...(p.doctorData || {}), [field]: val },
      }));
    return (
      <div className="min-h-screen bg-gray-50 font-sans p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-black text-violet-900 flex items-center gap-2">
              <UserCheck className="w-5 h-5" />{" "}
              {_isAdmin(currentUser?.role)
                ? "Gestión de Usuarios y Perfiles Médicos"
                : currentUser?.role === "admin_empresa"
                ? "Gestión de Equipo IPS"
                : "Mi Perfil Profesional"}
            </h2>
            <button
              onClick={() => {
                if (currentUser?.role === "medico") {
                  setView("dashboard");
                } else {
                  goBack();
                }
              }}
              className="text-gray-500 font-bold text-sm flex items-center gap-1 hover:text-gray-700"
            >
              <LogOut className="rotate-180 w-4 h-4" /> Volver
            </button>
          </div>
          <div className="flex gap-2 mb-6 border-b border-gray-200 flex-wrap">
            {[
              {
                k: "list",
                l:
                  currentUser?.role === "admin_empresa"
                    ? "👥 Equipo IPS"
                    : "Mi Perfil",
                showFor: "all",
              },
              { k: "new", l: "➕ Crear Usuario", showFor: "admin" },
              { k: "reasignacion", l: "🔀 Reasignación", showFor: "admin" },
              { k: "licencias", l: "💼 Licencias", showFor: "admin" },
              { k: "auditoria", l: "📋 Auditoría", showFor: "admin" },
              { k: "storage", l: "💾 Almacenamiento", showFor: "admin" },
            ]
              .filter(
                ({ showFor }) =>
                  showFor === "all" ||
                  _isAdmin(currentUser?.role) ||
                  _isAdminEmpresa(currentUser?.role)
              )
              .map(({ k, l }) => (
                <button
                  key={k}
                  onClick={() => {
                    setActiveUserMgmtTab(k);
                    setUserEditId(null);
                  }}
                  className={`px-4 py-2 text-sm font-bold rounded-t-lg border-b-2 transition ${
                    activeUserMgmtTab === k
                      ? "border-violet-600 text-violet-700 bg-violet-50"
                      : "border-transparent text-gray-500 hover:text-gray-700"
                  }`}
                >
                  {l}
                </button>
              ))}
          </div>
          {/* ── LISTA USUARIOS ── */}
          {activeUserMgmtTab === "list" &&
            !userEditId &&
            currentUser?.role === "medico" &&
            !currentUser?.empresaId &&
            (() => {
              const me = usersList.find(
                (u) => u.id === currentUser?.id || u.user === currentUser?.user
              );
              if (me) {
                setTimeout(() => startEdit(me), 0);
              }
              return (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-10 h-10 border-4 border-violet-200 border-t-violet-600 rounded-full animate-spin" />
                  <p className="text-sm text-gray-400 font-bold">
                    Cargando tu perfil...
                  </p>
                </div>
              );
            })()}
          {activeUserMgmtTab === "list" &&
            !userEditId &&
            (currentUser?.role !== "medico" || currentUser?.empresaId) && (
              <div className="space-y-3">
                {/* ── IPS banner en lista de usuarios ── */}
                {currentUser?.role === "admin_empresa" &&
                  (() => {
                    const _miEmpU = companies.find(
                      (c) => c.id === currentUser.empresaId
                    );
                    return (
                      <div className="bg-teal-50 border border-teal-200 rounded-xl p-3 mb-2">
                        <p className="text-xs font-black text-teal-700">
                          🏥 Equipo IPS: {_miEmpU?.nombre || "Empresa"}
                        </p>
                        <p className="text-[10px] text-teal-500">
                          Cree médicos y secretarias que ingresarán al sistema
                          con sus propias credenciales, vinculados a esta
                          empresa.
                        </p>
                      </div>
                    );
                  })()}
                {usersList
                  .filter((u) =>
                    // ── IPS: admin_empresa solo ve usuarios de su empresa ──
                    currentUser?.role === "admin_empresa"
                      ? u.empresaId === currentUser.empresaId ||
                        u.user === currentUser.user
                      : currentUser?.role === "medico" && currentUser?.empresaId
                      ? u.empresaId === currentUser.empresaId ||
                        u.user === currentUser.user
                      : _isAdmin(currentUser?.role) ||
                        u.user === currentUser?.user
                  )
                  .map((u, i) => (
                    <div
                      key={u.id}
                      className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-md transition"
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-full bg-violet-100 flex items-center justify-center text-violet-700 font-black text-lg">
                            {u.name?.charAt(0) || "U"}
                          </div>
                          <div>
                            <p className="font-black text-base text-gray-900">
                              {u.name}
                            </p>
                            <p className="text-sm text-gray-500 font-mono">
                              @{u.user}
                            </p>
                            <span
                              className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                u.role === "super_admin"
                                  ? "bg-purple-100 text-purple-800"
                                  : u.role === "admin_empresa"
                                  ? "bg-teal-100 text-teal-800"
                                  : u.role === "administrador"
                                  ? "bg-red-100 text-red-700"
                                  : u.role === "secretaria"
                                  ? "bg-orange-100 text-orange-700"
                                  : "bg-blue-100 text-blue-700"
                              }`}
                            >
                              {u.role === "super_admin"
                                ? "⭐ Super Admin"
                                : u.role === "admin_empresa"
                                ? "🏥 Admin IPS"
                                : u.role === "administrador"
                                ? "Administrador"
                                : u.role === "secretaria"
                                ? "Secretaria"
                                : "Médico"}
                            </span>
                            {u.activo === false && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full font-bold bg-gray-200 text-gray-500 ml-1">
                                ⏸ Inactivo
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-2">
                          {/* Médico puede editar su propio perfil; admin puede editar cualquiera */}
                          {(u.user === currentUser?.user ||
                            _isAdmin(currentUser?.role)) && (
                            <button
                              onClick={() => startEdit(u)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-black flex items-center gap-1 transition ${
                                u.user === currentUser?.user
                                  ? "bg-violet-600 text-white hover:bg-violet-700"
                                  : "bg-violet-50 text-violet-700 border border-violet-200 hover:bg-violet-100"
                              }`}
                            >
                              <Pencil className="w-3 h-3" />
                              {u.user === currentUser?.user
                                ? "✏️ Mi Perfil"
                                : "✏️ Editar perfil"}
                            </button>
                          )}
                          {/* Solo admin puede activar/desactivar y eliminar usuarios (no a sí mismo) */}
                          {_isAdmin(currentUser?.role) &&
                            u.user !== currentUser?.user && (
                              <button
                                title={
                                  u.activo === false
                                    ? "Activar usuario"
                                    : "Desactivar usuario"
                                }
                                onClick={() => {
                                  const upd = usersList.map((x) =>
                                    x.id === u.id
                                      ? {
                                          ...x,
                                          activo:
                                            u.activo === false ? true : false,
                                        }
                                      : x
                                  );
                                  setUsersList(upd);
                                  _sync("siso_users", JSON.stringify(upd));
                                  showAlert(
                                    u.activo === false
                                      ? `✅ Usuario @${u.user} activado.`
                                      : `⏸️ Usuario @${u.user} desactivado. No podrá iniciar sesión.`
                                  );
                                }}
                                className={`p-1.5 rounded-lg text-xs font-bold flex items-center gap-1 ${
                                  u.activo === false
                                    ? "bg-green-50 text-green-600 hover:bg-green-100"
                                    : "bg-yellow-50 text-yellow-600 hover:bg-yellow-100"
                                }`}
                              >
                                {u.activo === false ? (
                                  <span className="text-[10px]">▶ Activar</span>
                                ) : (
                                  <span className="text-[10px]">
                                    ⏸ Desactivar
                                  </span>
                                )}
                              </button>
                            )}
                          {_isAdmin(currentUser?.role) &&
                            u.user !== currentUser?.user &&
                            usersList.length > 1 && (
                              <button
                                onClick={() =>
                                  showConfirm("¿Eliminar usuario?", () => {
                                    const upd = usersList.filter(
                                      (x) => x.id !== u.id
                                    );
                                    setUsersList(upd);
                                    _sync("siso_users", JSON.stringify(upd));
                                    showAlert("Usuario eliminado.");
                                  })
                                }
                                className="p-1.5 text-red-400 hover:text-red-600 rounded-lg hover:bg-red-50"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            )}
                        </div>
                      </div>
                      {u.doctorData && (
                        <div className="mt-3 grid grid-cols-3 gap-2 text-[11px] text-gray-500 bg-gray-50 rounded-xl p-3 border border-gray-100">
                          <div>
                            <span className="font-bold text-gray-700">CC:</span>{" "}
                            {u.doctorData.cedula}
                          </div>
                          <div>
                            <span className="font-bold text-gray-700">
                              Licencia:
                            </span>{" "}
                            {u.doctorData.licencia}
                          </div>
                          <div>
                            <span className="font-bold text-gray-700">
                              Cel:
                            </span>{" "}
                            {u.doctorData.celular}
                          </div>
                          <div>
                            <span className="font-bold text-gray-700">
                              Banco:
                            </span>{" "}
                            {u.doctorData.banco}
                          </div>
                          <div>
                            <span className="font-bold text-gray-700">
                              Cuenta:
                            </span>{" "}
                            {u.doctorData.numeroCuenta}
                          </div>
                          <div>
                            <span className="font-bold text-gray-700">
                              Tarifa examen:
                            </span>{" "}
                            $
                            {parseInt(
                              u.doctorData.tarifaExamenOcup || 0
                            ).toLocaleString("es-CO")}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            )}
          {/* ── EDITAR USUARIO (perfil completo) ── */}
          {activeUserMgmtTab === "list" && userEditId && (
            <div className="bg-white rounded-2xl shadow-lg p-6">
              {/* Banner: quién se está editando */}
              {_isAdmin(currentUser?.role) &&
                editForm.user !== currentUser?.user && (
                  <div className="mb-4 flex items-center gap-3 bg-amber-50 border-2 border-amber-300 rounded-xl px-4 py-3">
                    <span className="text-amber-600 text-xl">⚙️</span>
                    <div>
                      <p className="text-xs font-black text-amber-800 uppercase">
                        Editando perfil de otro usuario
                      </p>
                      <p className="text-sm font-bold text-amber-900">
                        @{editForm.user} - {editForm.name}
                      </p>
                    </div>
                    <button
                      onClick={() => setUserEditId(null)}
                      className="ml-auto text-amber-500 hover:text-amber-700 text-xs font-bold underline"
                    >
                      ← Volver a la lista
                    </button>
                  </div>
                )}
              <div className="flex justify-between items-center mb-5">
                <h3 className="font-black text-lg text-violet-900 flex items-center gap-2">
                  <Pencil className="w-4 h-4" /> Editar Perfil: {editForm.name}
                </h3>
                <button
                  onClick={() => setUserEditId(null)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
              {/* Acceso */}
              <div className="bg-violet-50 rounded-xl p-4 mb-4 border border-violet-100">
                <p className="text-xs font-black text-violet-800 uppercase mb-3 flex items-center gap-1">
                  <Lock className="w-3 h-3" /> Datos de Acceso
                  {!_isAdmin(currentUser?.role) && (
                    <span className="text-[9px] font-normal text-violet-500 normal-case ml-1">
                      (Solo puedes cambiar tu contraseña y datos profesionales)
                    </span>
                  )}
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">
                      Nombre Completo
                    </label>
                    <input
                      value={editForm.name || ""}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, name: e.target.value }))
                      }
                      disabled={
                        currentUser?.role !== "administrador" &&
                        editForm.user !== currentUser?.user
                      }
                      className="w-full p-2 border rounded-lg text-sm disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">
                      Usuario
                    </label>
                    <input
                      value={editForm.user || ""}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, user: e.target.value }))
                      }
                      disabled={currentUser?.role !== "administrador"}
                      className="w-full p-2 border rounded-lg text-sm font-mono disabled:bg-gray-100 disabled:text-gray-400"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">
                      Nueva Contraseña
                    </label>
                    <input
                      type="password"
                      value={editForm.pass || ""}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, pass: e.target.value }))
                      }
                      className="w-full p-2 border rounded-lg text-sm"
                      placeholder="Dejar igual si no cambia"
                    />
                    {editForm.pass && editForm.pass.length > 0 && (
                      <p
                        className={`text-[10px] mt-0.5 font-semibold ${
                          editForm.pass.length >= 8 &&
                          (/[A-Z]/.test(editForm.pass) ||
                            /[0-9]/.test(editForm.pass))
                            ? "text-emerald-600"
                            : "text-red-500"
                        }`}
                      >
                        {editForm.pass.length < 8
                          ? `⚠ Mín. 8 caracteres`
                          : !/[A-Z]/.test(editForm.pass) &&
                            !/[0-9]/.test(editForm.pass)
                          ? "⚠ Agrega mayúscula o número"
                          : "✅ Contraseña segura"}
                      </p>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">
                      Rol
                    </label>
                    <select
                      value={editForm.role || "medico"}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, role: e.target.value }))
                      }
                      disabled={!_isAdmin(currentUser?.role)}
                      className="w-full p-2 border rounded-lg text-sm disabled:bg-gray-100 disabled:text-gray-400"
                    >
                      {currentUser?.role === "super_admin" && (
                        <option value="super_admin">⭐ Super Admin</option>
                      )}
                      <option value="administrador">Administrador</option>
                      <option value="medico">Médico</option>
                      <option value="secretaria">Secretaria</option>
                    </select>
                  </div>
                </div>
                {/* FASE 2 Componente 10: % Honorarios (solo para médicos) */}
                {editForm.role === "medico" && _isAdmin(currentUser?.role) && (
                  <div className="bg-teal-50 rounded-xl p-3 border border-teal-200 mt-2">
                    <p className="text-xs font-black text-teal-700 mb-1">
                      💰 Distribución de Honorarios (hook futuro)
                    </p>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={0}
                        max={100}
                        value={editForm.porcentajeHonorarios ?? 100}
                        onChange={(e) =>
                          setEditForm((p) => ({
                            ...p,
                            porcentajeHonorarios: Number(e.target.value),
                          }))
                        }
                        className="flex-1 accent-teal-600"
                      />
                      <span className="font-black text-teal-700 text-sm w-16 text-right">
                        {editForm.porcentajeHonorarios ?? 100}% médico
                      </span>
                    </div>
                    <p className="text-[10px] text-teal-500 mt-1">
                      Clínica: {100 - (editForm.porcentajeHonorarios ?? 100)}% —
                      El cálculo automático se activará en fase futura.
                    </p>
                  </div>
                )}
                {/* FASE 2: orgId del usuario (solo super_admin puede cambiar) */}
                {currentUser?.role === "super_admin" && (
                  <div className="mt-2">
                    <label className="block text-xs font-bold text-gray-600 mb-1">
                      🏢 Organización
                    </label>
                    <select
                      value={editForm.orgId || ORG_DEFAULT_ID}
                      onChange={(e) =>
                        setEditForm((p) => ({ ...p, orgId: e.target.value }))
                      }
                      className="w-full p-2 border rounded-lg text-sm"
                    >
                      {orgsList.map((o) => (
                        <option key={o.orgId} value={o.orgId}>
                          {o.orgName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              {/* ── 🔐 PERMISOS DE SECRETARIA - solo admin puede ver/editar ── */}
              {_isAdmin(currentUser?.role) &&
                editForm.role === "secretaria" && (
                  <div className="bg-amber-50 rounded-xl p-4 mb-4 border-2 border-amber-300">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">🔐</span>
                      <div>
                        <p className="text-xs font-black text-amber-800 uppercase">
                          Permisos de Secretaria
                        </p>
                        <p className="text-[10px] text-amber-600">
                          Solo el administrador puede activar o desactivar
                          módulos. Por defecto todo está BLOQUEADO.
                        </p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                      {Object.entries({
                        agenda: {
                          label: "🗓️ Agenda del Día",
                          desc: "Ver y gestionar citas",
                        },
                        bill: {
                          label: "🧾 Cuentas de Cobro",
                          desc: "Generar y ver facturas",
                        },
                        propuestas: {
                          label: "📄 Propuestas Económicas",
                          desc: "Crear cotizaciones",
                        },
                        telemedicina: {
                          label: "🩺 Telemedicina",
                          desc: "Acceder a teleconsultas",
                        },
                        empresas: {
                          label: "🏢 Empresas",
                          desc: "Ver y editar clientes",
                        },
                        pacientes_lista: {
                          label: "👥 Lista de Pacientes",
                          desc: "Ver expedientes (solo lectura)",
                        },
                        pacientes_crear: {
                          label: "➕ Crear Pacientes",
                          desc: "Registrar nuevos pacientes",
                        },
                        reporte: {
                          label: "📊 Reportes",
                          desc: "Ver reportes epidemiológicos",
                        },
                        sve: {
                          label: "🔬 SVE",
                          desc: "Ver vigilancia epidemiológica",
                        },
                        caja: {
                          label: "💰 Módulo Financiero",
                          desc: "Caja diaria e ingresos",
                        },
                        adjuntos: {
                          label: "📎 Adjuntos HC",
                          desc: "Subir archivos a HC",
                        },
                        cuentas_cobro: {
                          label: "💳 Estado Cuentas",
                          desc: "Ver cuentas pendientes",
                        },
                      }).map(([key, { label, desc }]) => {
                        const permisos =
                          editForm.secretariaPermisos ||
                          SECRETARIA_PERMISOS_DEFAULT;
                        const isOn = permisos[key] === true;
                        return (
                          <button
                            key={key}
                            onClick={() =>
                              setEditForm((p) => ({
                                ...p,
                                secretariaPermisos: {
                                  ...(p.secretariaPermisos ||
                                    SECRETARIA_PERMISOS_DEFAULT),
                                  [key]: !isOn,
                                },
                              }))
                            }
                            className={`p-2.5 rounded-xl border-2 text-left transition select-none ${
                              isOn
                                ? "border-emerald-400 bg-emerald-50"
                                : "border-gray-200 bg-white hover:border-amber-300"
                            }`}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-black text-gray-800">
                                {label}
                              </span>
                              <span
                                className={`text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                                  isOn
                                    ? "bg-emerald-500 text-white"
                                    : "bg-gray-200 text-gray-500"
                                }`}
                              >
                                {isOn ? "ON" : "OFF"}
                              </span>
                            </div>
                            <p className="text-[10px] text-gray-500">{desc}</p>
                          </button>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-amber-700 mt-3 font-bold">
                      ⚠️ Recuerda guardar los cambios para que los permisos
                      tengan efecto.
                    </p>
                    {/* Médicos asignados */}
                    <div className="mt-4 pt-3 border-t border-amber-200">
                      <p className="text-xs font-black text-amber-800 mb-2">
                        👨‍⚕️ Médicos asignados a esta secretaria
                      </p>
                      <p className="text-[10px] text-amber-600 mb-2">
                        Si no selecciona ninguno, la secretaria verá pacientes
                        de TODOS los médicos.
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {usersList
                          .filter(
                            (u) =>
                              [
                                "medico",
                                "administrador",
                                "super_admin",
                              ].includes(u.role) && u.activo !== false
                          )
                          .map((med) => {
                            const asignados = editForm.medicosAsignados || [];
                            const seleccionado = asignados.includes(med.user);
                            return (
                              <button
                                key={med.user}
                                onClick={() =>
                                  setEditForm((p) => ({
                                    ...p,
                                    medicosAsignados: seleccionado
                                      ? (p.medicosAsignados || []).filter(
                                          (id) => id !== med.user
                                        )
                                      : [
                                          ...(p.medicosAsignados || []),
                                          med.user,
                                        ],
                                  }))
                                }
                                className={`px-3 py-1.5 rounded-xl border-2 text-xs font-bold transition ${
                                  seleccionado
                                    ? "border-blue-500 bg-blue-50 text-blue-800"
                                    : "border-gray-200 bg-white text-gray-600 hover:border-blue-300"
                                }`}
                              >
                                {seleccionado ? "✅ " : ""}
                                {med.name || med.user}
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  </div>
                )}

              {/* B-18: Configuración 2FA */}
              {(_isAdmin(currentUser?.role) ||
                currentUser?.user === editForm.user) && (
                <div className="bg-indigo-50 rounded-xl p-4 mb-4 border border-indigo-100">
                  <p className="text-xs font-black text-indigo-800 uppercase mb-3 flex items-center gap-2">
                    <Lock className="w-3.5 h-3.5" /> Autenticación 2FA (TOTP) -
                    Res. 3100/2019
                  </p>
                  {editForm.twoFA?.enabled ? (
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-xs font-bold text-emerald-700">
                          ✅ 2FA Activo
                        </p>
                        <p className="text-[10px] text-gray-500">
                          Código requerido en cada inicio de sesión
                        </p>
                      </div>
                      <button
                        onClick={() =>
                          setEditForm((p) => ({
                            ...p,
                            twoFA: { enabled: false, secret: "" },
                          }))
                        }
                        className="px-3 py-1.5 bg-red-100 text-red-700 text-xs font-bold rounded-lg hover:bg-red-200"
                      >
                        🔓 Desactivar 2FA
                      </button>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-gray-600">
                        2FA no configurado. Active para mayor seguridad.
                      </p>
                      <button
                        onClick={() => {
                          const secret = _totpGenSecret();
                          setEditForm((p) => ({
                            ...p,
                            twoFA: { enabled: true, secret },
                          }));
                          showAlert(
                            "✅ 2FA activado. Secret: " +
                              secret +
                              "\n\nEscanee el código QR con Google Authenticator / Authy.\n\n⚠ Guarde este código en lugar seguro."
                          );
                        }}
                        className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black rounded-lg"
                      >
                        🔐 Activar 2FA
                      </button>
                    </div>
                  )}
                  {editForm.twoFA?.enabled && editForm.twoFA?.secret && (
                    <div className="mt-3 p-3 bg-white rounded-lg border border-indigo-200 space-y-2">
                      <p className="text-[10px] font-bold text-gray-700">
                        Escanee con su app autenticadora:
                      </p>
                      <img
                        src={_totpGetQRCodeUrl(
                          editForm.twoFA.secret,
                          editForm.user || "usuario"
                        )}
                        alt="QR 2FA"
                        className="w-36 h-36 rounded"
                        onError={(e) => {
                          e.target.style.display = "none";
                        }}
                      />
                      <p className="text-[9px] text-gray-500">Clave manual:</p>
                      <code className="text-[10px] bg-gray-100 px-2 py-1 rounded font-mono font-black text-indigo-700 break-all">
                        {editForm.twoFA.secret}
                      </code>
                    </div>
                  )}
                </div>
              )}
              {/* Datos profesionales */}
              <div className="bg-blue-50 rounded-xl p-4 mb-4 border border-blue-100">
                <p className="text-xs font-black text-blue-800 uppercase mb-3 flex items-center gap-1">
                  <GraduationCap className="w-3 h-3" /> Perfil Profesional
                  (aparece en documentos)
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">
                      Nombre completo (documentos)
                    </label>
                    <input
                      value={dd.nombre || ""}
                      onChange={(e) => setDD("nombre", e.target.value)}
                      className="w-full p-2 border rounded-lg text-sm font-bold uppercase"
                      placeholder="DR. NOMBRE APELLIDO"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">
                      Cédula
                    </label>
                    <input
                      value={dd.cedula || ""}
                      onChange={(e) => setDD("cedula", e.target.value)}
                      className="w-full p-2 border rounded-lg text-sm"
                      placeholder="1.000.000.000 de Ciudad"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-600 mb-1">
                      Título / Especialidad
                    </label>
                    <input
                      value={dd.titulo || ""}
                      onChange={(e) => setDD("titulo", e.target.value)}
                      className="w-full p-2 border rounded-lg text-sm"
                      placeholder="Especialista en..."
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">
                      Registro Médico (RM / Tarjeta Profesional)
                    </label>
                    <input
                      value={dd.licencia || ""}
                      onChange={(e) => setDD("licencia", e.target.value)}
                      className="w-full p-2 border-2 border-emerald-300 rounded-lg text-sm focus:border-emerald-500"
                      placeholder="Ej: TP-12345-6789 o No. Tarjeta Profesional"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">
                      Ciudad
                    </label>
                    <input
                      value={dd.ciudad || ""}
                      onChange={(e) => setDD("ciudad", e.target.value)}
                      className="w-full p-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">
                      Celular
                    </label>
                    <input
                      value={dd.celular || ""}
                      onChange={(e) => setDD("celular", e.target.value)}
                      className="w-full p-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">
                      Email
                    </label>
                    <input
                      value={dd.email || ""}
                      onChange={(e) => setDD("email", e.target.value)}
                      className="w-full p-2 border rounded-lg text-sm"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-600 mb-1">
                      Dirección consultorio
                    </label>
                    <input
                      value={dd.direccion || ""}
                      onChange={(e) => setDD("direccion", e.target.value)}
                      className="w-full p-2 border rounded-lg text-sm"
                    />
                  </div>
                  {/* B-F1-02: Foto del médico */}
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-600 mb-2">
                      📷 Foto de perfil del médico
                    </label>
                    <div className="flex items-center gap-4">
                      {dd.fotoPerfil ? (
                        <div className="relative">
                          <img
                            src={dd.fotoPerfil}
                            alt="Foto médico"
                            className="w-20 h-20 rounded-full object-cover border-2 border-blue-300 shadow"
                          />
                          <button
                            type="button"
                            onClick={() => setDD("fotoPerfil", null)}
                            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-[10px] font-black flex items-center justify-center hover:bg-red-600"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <div className="w-20 h-20 rounded-full border-2 border-dashed border-blue-300 flex items-center justify-center bg-white text-2xl">
                          👤
                        </div>
                      )}
                      <label className="cursor-pointer">
                        <span className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-black rounded-lg">
                          {dd.fotoPerfil ? "🔄 Cambiar foto" : "📁 Subir foto"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => {
                            const file = e.target.files[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = (ev) => {
                              const img = new window.Image();
                              img.onload = () => {
                                const canvas = document.createElement("canvas");
                                const maxSize = 200;
                                const ratio = Math.min(
                                  maxSize / img.width,
                                  maxSize / img.height,
                                  1
                                );
                                canvas.width = Math.round(img.width * ratio);
                                canvas.height = Math.round(img.height * ratio);
                                canvas
                                  .getContext("2d")
                                  .drawImage(
                                    img,
                                    0,
                                    0,
                                    canvas.width,
                                    canvas.height
                                  );
                                setDD(
                                  "fotoPerfil",
                                  canvas.toDataURL("image/jpeg", 0.8)
                                );
                              };
                              img.src = ev.target.result;
                            };
                            reader.readAsDataURL(file);
                            e.target.value = "";
                          }}
                        />
                      </label>
                      <p className="text-[10px] text-gray-500">
                        JPG/PNG · Máx 200×200px · Se guarda en el perfil
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              {/* Datos financieros */}
              <div className="bg-emerald-50 rounded-xl p-4 mb-4 border border-emerald-100">
                <p className="text-xs font-black text-emerald-800 uppercase mb-3 flex items-center gap-1">
                  <Banknote className="w-3 h-3" /> Datos Financieros (Cuentas de
                  Cobro)
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">
                      Banco
                    </label>
                    <input
                      value={dd.banco || ""}
                      onChange={(e) => setDD("banco", e.target.value)}
                      className="w-full p-2 border rounded-lg text-sm"
                      placeholder="BANCOLOMBIA"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">
                      Tipo de Cuenta
                    </label>
                    <select
                      value={dd.tipoCuenta || "Ahorros"}
                      onChange={(e) => setDD("tipoCuenta", e.target.value)}
                      className="w-full p-2 border rounded-lg text-sm"
                    >
                      <option>Ahorros</option>
                      <option>Corriente</option>
                      <option>Nequi</option>
                      <option>Daviplata</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">
                      Número de Cuenta
                    </label>
                    <input
                      value={dd.numeroCuenta || ""}
                      onChange={(e) => setDD("numeroCuenta", e.target.value)}
                      className="w-full p-2 border rounded-lg text-sm font-mono"
                      placeholder="261-617858-81"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">
                      RUT / NIT
                    </label>
                    <input
                      value={dd.rut || ""}
                      onChange={(e) => setDD("rut", e.target.value)}
                      className="w-full p-2 border rounded-lg text-sm"
                      placeholder="1061750704-1"
                    />
                  </div>
                  <div className="col-span-2">
                    <label className="block text-xs font-bold text-gray-600 mb-1">
                      Régimen tributario
                    </label>
                    <input
                      value={dd.regimen || ""}
                      onChange={(e) => setDD("regimen", e.target.value)}
                      className="w-full p-2 border rounded-lg text-sm"
                      placeholder="Simple -- Art. 383 E.T."
                    />
                  </div>
                </div>
              </div>
              {/* Tarifas */}
              <div className="bg-orange-50 rounded-xl p-4 mb-5 border border-orange-100">
                <p className="text-xs font-black text-orange-800 uppercase mb-3 flex items-center gap-1">
                  <Receipt className="w-3 h-3" /> Tarifas para Propuestas
                  Económicas
                </p>
                <div className="grid grid-cols-4 gap-3">
                  {[
                    { f: "tarifaExamenOcup", l: "Examen ocupacional" },
                    { f: "tarifaInforme", l: "Informe de salud" },
                    { f: "tarifaDiaPVE", l: "PVE / día" },
                    { f: "tarifaHora", l: "Hora consulta" },
                  ].map((t) => (
                    <div key={t.f}>
                      <label className="block text-xs font-bold text-gray-600 mb-1">
                        {t.l}
                      </label>
                      <div className="relative">
                        <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-bold">
                          $
                        </span>
                        <input
                          type="number"
                          value={dd[t.f] || ""}
                          onChange={(e) => setDD(t.f, e.target.value)}
                          className="w-full pl-5 p-2 border rounded-lg text-sm font-mono"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              {/* ── Firma Digital ── */}
              <div className="bg-violet-50 rounded-xl p-4 mb-5 border border-violet-200">
                <p className="text-xs font-black text-violet-800 uppercase mb-3 flex items-center gap-2">
                  <FileSignature className="w-3.5 h-3.5" /> Firma Digital del
                  Profesional
                  <span className="text-[9px] font-normal text-violet-500 normal-case">
                    (aparece en HC, Certificados, Fórmulas, Informes y
                    Propuestas)
                  </span>
                </p>
                <div className="flex items-center gap-5">
                  {/* Preview */}
                  <div className="w-48 h-24 border-2 border-dashed border-violet-300 rounded-xl flex items-center justify-center bg-white overflow-hidden flex-shrink-0">
                    {editForm.doctorData?.signature || doctorSignature ? (
                      <img
                        src={editForm.doctorData?.signature || doctorSignature}
                        alt="Firma"
                        className="max-h-full max-w-full object-contain p-1"
                      />
                    ) : (
                      <div className="text-center">
                        <FileSignature className="w-6 h-6 text-gray-300 mx-auto mb-1" />
                        <p className="text-[10px] text-gray-400">
                          Sin firma cargada
                        </p>
                      </div>
                    )}
                  </div>
                  {/* Acciones */}
                  <div className="flex-1 space-y-2">
                    <input
                      type="file"
                      accept="image/*"
                      style={{ display: "none" }}
                      id="editUserSigInput"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (!file) return;
                        const r = new FileReader();
                        r.onloadend = () => {
                          const sig = r.result;
                          setEditForm((p) => ({
                            ...p,
                            doctorData: {
                              ...(p.doctorData || {}),
                              signature: sig,
                            },
                          }));
                          // Si es el usuario actual, actualizar firma activa también
                          if (
                            currentUser?.id === editForm.id ||
                            currentUser?.user === editForm.user
                          ) {
                            setDoctorSignature(sig);
                            _sync("siso_doctor_signature", sig);
                          }
                        };
                        r.readAsDataURL(file);
                        e.target.value = null;
                      }}
                    />
                    <button
                      onClick={() =>
                        document.getElementById("editUserSigInput").click()
                      }
                      className="w-full bg-violet-600 text-white px-4 py-2.5 rounded-xl text-sm font-bold hover:bg-violet-700 flex items-center justify-center gap-2 shadow"
                    >
                      <UploadCloud className="w-4 h-4" /> Subir Firma (PNG /
                      JPG)
                    </button>
                    {(editForm.doctorData?.signature || doctorSignature) && (
                      <button
                        onClick={() => {
                          setEditForm((p) => ({
                            ...p,
                            doctorData: {
                              ...(p.doctorData || {}),
                              signature: null,
                            },
                          }));
                          if (
                            currentUser?.id === editForm.id ||
                            currentUser?.user === editForm.user
                          ) {
                            setDoctorSignature(null);
                            _ls.removeItem("siso_doctor_signature");
                          }
                        }}
                        className="w-full bg-white text-red-500 border border-red-200 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-red-50 flex items-center justify-center gap-1"
                      >
                        <X className="w-3 h-3" /> Eliminar firma actual
                      </button>
                    )}
                    <p className="text-[9px] text-gray-400 text-center">
                      Recomendado: PNG fondo transparente · máx. 2 MB
                    </p>
                  </div>
                </div>
              </div>
              <button
                onClick={saveEdit}
                className="w-full bg-violet-600 text-white py-3 rounded-xl font-black text-sm hover:bg-violet-700 flex items-center justify-center gap-2"
              >
                <Save className="w-4 h-4" /> Guardar Perfil Completo
              </button>
            </div>
          )}
          {/* ── TAB LICENCIAS (solo admin) ── */}
          {activeUserMgmtTab === "licencias" && _isAdmin(currentUser?.role) && (
            <LicenciasTab
              usersList={usersList}
              setUsersList={setUsersList}
              patientsList={patientsList}
              currentUser={currentUser}
              setCurrentUser={setCurrentUser}
              _sync={_sync}
              pendingActivationPlan={pendingActivationPlan}
              setPendingActivationPlan={setPendingActivationPlan}
            />
          )}
          {/* ── CREAR USUARIO ── */}
          {/* ── NORMATIVO: Res. 1918/2009 Art.8 - Registro de Auditoría ── */}
          {activeUserMgmtTab === "auditoria" && (
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="text-sm font-black text-gray-800 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-violet-600" /> Registro de
                    Auditoría de Accesos
                  </h3>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    Res. 1918/2009 Art. 8 · {auditLog.length} registros · Máximo
                    500
                  </p>
                </div>
                <button
                  onClick={() => {
                    // FIX M-05: solo admin puede borrar el log de auditoría
                    if (currentUser?.role !== "administrador") {
                      showAlert(
                        "⛔ Solo el administrador puede limpiar el registro de auditoría."
                      );
                      return;
                    }
                    if (
                      window.confirm(
                        "¿Limpiar el log de auditoría? Esta acción quedará registrada y no se puede deshacer."
                      )
                    ) {
                      // Registrar el evento de borrado ANTES de ejecutarlo
                      const entradaBorrado = {
                        id: Date.now(),
                        fecha: new Date().toISOString(),
                        usuario: currentUser?.user || "desconocido",
                        accion: "BORRADO_AUDIT_LOG",
                        pacienteId: null,
                        tipo: "SEGURIDAD",
                      };
                      const logFinal = [entradaBorrado];
                      setAuditLog(logFinal);
                      _sync("siso_audit_log", JSON.stringify(logFinal));
                    }
                  }}
                  className="text-xs text-red-400 hover:text-red-600 font-bold border border-red-200 px-3 py-1.5 rounded-lg"
                >
                  {_isAdmin(currentUser?.role)
                    ? "Limpiar log"
                    : "🔒 Solo admin"}
                </button>
              </div>
              {auditLog.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <Shield className="w-10 h-10 mx-auto mb-2 opacity-30" />
                  <p className="font-bold text-sm">
                    Sin registros de auditoría aún
                  </p>
                  <p className="text-xs">
                    Las acciones se registran automáticamente
                  </p>
                </div>
              ) : (
                <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50 border-b border-gray-200">
                      <tr>
                        <th className="p-2 text-left font-bold text-gray-500 uppercase">
                          Fecha / Hora
                        </th>
                        <th className="p-2 text-left font-bold text-gray-500 uppercase">
                          Usuario
                        </th>
                        <th className="p-2 text-left font-bold text-gray-500 uppercase">
                          Acción
                        </th>
                        <th className="p-2 text-left font-bold text-gray-500 uppercase">
                          ID Paciente
                        </th>
                        <th className="p-2 text-left font-bold text-gray-500 uppercase">
                          Tipo
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {auditLog.map((entry, i) => (
                        <tr
                          key={entry.id}
                          className={i % 2 === 0 ? "bg-white" : "bg-gray-50"}
                        >
                          <td className="p-2 font-mono text-[10px] text-gray-500">
                            {new Date(entry.fecha).toLocaleString("es-CO")}
                          </td>
                          <td className="p-2">
                            <p className="font-bold text-violet-700 text-[10px]">
                              {entry.usuario}
                            </p>
                            {entry.nombreUsuario && (
                              <p className="text-[9px] text-gray-400">
                                {entry.nombreUsuario} · {entry.rol || ""}
                              </p>
                            )}
                          </td>
                          <td className="p-2">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-black ${
                                entry.accion === "Login"
                                  ? "bg-blue-100 text-blue-700"
                                  : entry.accion === "Cierre"
                                  ? "bg-red-100 text-red-700"
                                  : entry.accion === "Guardado"
                                  ? "bg-emerald-100 text-emerald-700"
                                  : entry.accion === "Edicion"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : "bg-gray-100 text-gray-700"
                              }`}
                            >
                              {entry.accion}
                            </span>
                          </td>
                          <td className="p-2 font-mono text-[10px] text-gray-400">
                            {entry.pacienteId
                              ? "···" + String(entry.pacienteId).slice(-6)
                              : "-"}
                          </td>
                          <td className="p-2 text-gray-500">
                            {entry.tipo || "-"}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {activeUserMgmtTab === "new" && (
            <div className="bg-white rounded-2xl shadow-lg p-6 max-w-3xl overflow-y-auto max-h-[90vh]">
              <h3 className="font-black text-base text-violet-800 mb-4 flex items-center gap-2">
                <UserPlus className="w-4 h-4" /> Nuevo Usuario Médico -- Perfil
                Completo
              </h3>
              <p className="text-xs text-blue-600 bg-blue-50 rounded-lg p-2 mb-4">
                Complete todos los datos ahora para que Cuentas de Cobro y
                Propuesta Económica queden prellenadas automáticamente.
              </p>
              {/* ── Acceso ── */}
              <p className="text-[10px] font-black text-violet-700 uppercase border-b border-violet-200 pb-1 mb-3">
                Datos de Acceso
              </p>
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="col-span-2">
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    Nombre Completo *
                  </label>
                  <input
                    value={newUserForm.name || ""}
                    onChange={(e) =>
                      setNewUserForm((p) => ({ ...p, name: e.target.value }))
                    }
                    className="w-full p-2 border rounded-lg text-sm"
                    placeholder="Dr. Nombre Completo Apellidos"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    Usuario *
                  </label>
                  <input
                    value={newUserForm.user || ""}
                    onChange={(e) =>
                      setNewUserForm((p) => ({ ...p, user: e.target.value }))
                    }
                    className="w-full p-2 border rounded-lg text-sm font-mono"
                    placeholder="usuario123"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    Contraseña *
                  </label>
                  <input
                    type="password"
                    value={newUserForm.pass || ""}
                    onChange={(e) =>
                      setNewUserForm((p) => ({ ...p, pass: e.target.value }))
                    }
                    className="w-full p-2 border rounded-lg text-sm"
                    placeholder="••••••••"
                  />
                  {newUserForm.pass && (
                    <p
                      className={`text-[10px] mt-0.5 font-semibold ${
                        newUserForm.pass.length >= 8 &&
                        (/[A-Z]/.test(newUserForm.pass) ||
                          /[0-9]/.test(newUserForm.pass))
                          ? "text-emerald-600"
                          : "text-red-500"
                      }`}
                    >
                      {newUserForm.pass.length < 8
                        ? `⚠ Mín. 8 caracteres (${newUserForm.pass.length}/8)`
                        : !/[A-Z]/.test(newUserForm.pass) &&
                          !/[0-9]/.test(newUserForm.pass)
                        ? "⚠ Agrega mayúscula o número"
                        : "✅ Contraseña segura"}
                    </p>
                  )}
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-600 mb-1">
                    Rol
                  </label>
                  <select
                    value={newUserForm.role || "medico"}
                    onChange={(e) =>
                      setNewUserForm((p) => ({ ...p, role: e.target.value }))
                    }
                    className="w-full p-2 border rounded-lg text-sm"
                  >
                    {currentUser?.role === "admin_empresa" ? (
                      <>
                        <option value="medico">Médico</option>
                        <option value="secretaria">Secretaria</option>
                      </>
                    ) : (
                      <>
                        {currentUser?.role === "super_admin" && (
                          <option value="super_admin">⭐ Super Admin</option>
                        )}
                        <option value="administrador">Administrador</option>
                        <option value="medico">Médico</option>
                        <option value="secretaria">Secretaria</option>
                      </>
                    )}
                  </select>
                </div>
                {/* FASE 2: orgId del nuevo usuario (solo super_admin puede elegir) */}
                {currentUser?.role === "super_admin" && (
                  <div>
                    <label className="block text-xs font-bold text-gray-600 mb-1">
                      🏢 Organización
                    </label>
                    <select
                      value={newUserForm.orgId || ORG_DEFAULT_ID}
                      onChange={(e) =>
                        setNewUserForm((p) => ({ ...p, orgId: e.target.value }))
                      }
                      className="w-full p-2 border rounded-lg text-sm"
                    >
                      {orgsList.map((o) => (
                        <option key={o.orgId} value={o.orgId}>
                          {o.orgName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
              {/* ── Permisos de Secretaria - nueva secretaria ── */}
              {newUserForm.role === "secretaria" && (
                <div className="bg-amber-50 rounded-xl p-4 mb-4 border-2 border-amber-300">
                  <p className="text-xs font-black text-amber-800 uppercase mb-1">
                    🔐 Permisos de Secretaria
                  </p>
                  <p className="text-[10px] text-amber-600 mb-3">
                    Seleccione los módulos a los que tendrá acceso. Todo
                    bloqueado por defecto.
                  </p>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                    {Object.entries({
                      agenda: "🗓️ Agenda",
                      bill: "🧾 Cuentas de Cobro",
                      propuestas: "📄 Propuestas",
                      telemedicina: "🩺 Telemedicina",
                      empresas: "🏢 Empresas",
                      pacientes_lista: "👥 Lista Pacientes",
                      pacientes_crear: "➕ Crear Pacientes",
                      reporte: "📊 Reportes",
                      sve: "🔬 SVE",
                      caja: "💰 Financiero",
                      adjuntos: "📎 Adjuntos",
                      cuentas_cobro: "💳 Cuentas",
                    }).map(([key, label]) => {
                      const permisos =
                        newUserForm.secretariaPermisos ||
                        SECRETARIA_PERMISOS_DEFAULT;
                      const isOn = permisos[key] === true;
                      return (
                        <button
                          key={key}
                          onClick={() =>
                            setNewUserForm((p) => ({
                              ...p,
                              secretariaPermisos: {
                                ...(p.secretariaPermisos ||
                                  SECRETARIA_PERMISOS_DEFAULT),
                                [key]: !isOn,
                              },
                            }))
                          }
                          className={`p-2 rounded-xl border-2 text-left text-xs font-bold transition ${
                            isOn
                              ? "border-emerald-400 bg-emerald-50 text-emerald-800"
                              : "border-gray-200 bg-white text-gray-500 hover:border-amber-300"
                          }`}
                        >
                          {label} {isOn ? "✅" : ""}
                        </button>
                      );
                    })}
                  </div>
                  <p className="text-[10px] text-amber-700 font-black mb-2">
                    👨‍⚕️ Médicos asignados (dejar vacío = todos):
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {usersList
                      .filter(
                        (u) =>
                          ["medico", "administrador", "super_admin"].includes(
                            u.role
                          ) && u.activo !== false
                      )
                      .map((med) => {
                        const sel = (
                          newUserForm.medicosAsignados || []
                        ).includes(med.user);
                        return (
                          <button
                            key={med.user}
                            onClick={() =>
                              setNewUserForm((p) => ({
                                ...p,
                                medicosAsignados: sel
                                  ? (p.medicosAsignados || []).filter(
                                      (id) => id !== med.user
                                    )
                                  : [...(p.medicosAsignados || []), med.user],
                              }))
                            }
                            className={`px-2 py-1 rounded-xl border text-xs font-bold ${
                              sel
                                ? "border-blue-500 bg-blue-50 text-blue-800"
                                : "border-gray-200 bg-white text-gray-500"
                            }`}
                          >
                            {sel ? "✅ " : ""}
                            {med.name || med.user}
                          </button>
                        );
                      })}
                  </div>
                </div>
              )}
              {/* ── Datos Profesionales ── */}
              {(["medico", "administrador", "super_admin"].includes(
                newUserForm.role
              ) ||
                !newUserForm.role) && (
                <>
                  <p className="text-[10px] font-black text-violet-700 uppercase border-b border-violet-200 pb-1 mb-3">
                    Datos Profesionales (para Firmas y Documentos)
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-gray-600 mb-1">
                        Cédula
                      </label>
                      <input
                        value={newUserForm.doctorData?.cedula || ""}
                        onChange={(e) =>
                          setNewUserForm((p) => ({
                            ...p,
                            doctorData: {
                              ...(p.doctorData || {}),
                              cedula: e.target.value,
                            },
                          }))
                        }
                        className="w-full p-2 border rounded-lg text-sm"
                        placeholder="1.234.567.890 de Ciudad"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-gray-600 mb-1">
                        Título / Especialidad
                      </label>
                      <input
                        value={newUserForm.doctorData?.titulo || ""}
                        onChange={(e) =>
                          setNewUserForm((p) => ({
                            ...p,
                            doctorData: {
                              ...(p.doctorData || {}),
                              titulo: e.target.value,
                            },
                          }))
                        }
                        className="w-full p-2 border rounded-lg text-sm"
                        placeholder="Esp. Gerencia SST / Médico Ocupacional..."
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">
                        Registro Médico (RM / Tarjeta Profesional)
                      </label>
                      <input
                        value={newUserForm.doctorData?.licencia || ""}
                        onChange={(e) =>
                          setNewUserForm((p) => ({
                            ...p,
                            doctorData: {
                              ...(p.doctorData || {}),
                              licencia: e.target.value,
                            },
                          }))
                        }
                        className="w-full p-2 border-2 border-emerald-300 rounded-lg text-sm focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                        placeholder="Ej: TP-12345-6789 o No. Tarjeta Profesional"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">
                        Ciudad
                      </label>
                      <input
                        value={newUserForm.doctorData?.ciudad || ""}
                        onChange={(e) =>
                          setNewUserForm((p) => ({
                            ...p,
                            doctorData: {
                              ...(p.doctorData || {}),
                              ciudad: e.target.value,
                            },
                          }))
                        }
                        className="w-full p-2 border rounded-lg text-sm"
                        placeholder="Ciudad - Departamento"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">
                        Celular
                      </label>
                      <input
                        value={newUserForm.doctorData?.celular || ""}
                        onChange={(e) =>
                          setNewUserForm((p) => ({
                            ...p,
                            doctorData: {
                              ...(p.doctorData || {}),
                              celular: e.target.value,
                            },
                          }))
                        }
                        className="w-full p-2 border rounded-lg text-sm"
                        placeholder="3XXXXXXXXX"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">
                        Email profesional
                      </label>
                      <input
                        value={newUserForm.doctorData?.email || ""}
                        onChange={(e) =>
                          setNewUserForm((p) => ({
                            ...p,
                            doctorData: {
                              ...(p.doctorData || {}),
                              email: e.target.value,
                            },
                          }))
                        }
                        className="w-full p-2 border rounded-lg text-sm"
                        placeholder="correo@dominio.com"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-gray-600 mb-1">
                        Dirección
                      </label>
                      <input
                        value={newUserForm.doctorData?.direccion || ""}
                        onChange={(e) =>
                          setNewUserForm((p) => ({
                            ...p,
                            doctorData: {
                              ...(p.doctorData || {}),
                              direccion: e.target.value,
                            },
                          }))
                        }
                        className="w-full p-2 border rounded-lg text-sm"
                        placeholder="Calle XX N° X-XX, Ciudad"
                      />
                    </div>
                  </div>
                  {/* ── Datos Financieros (Cuentas de Cobro / Propuesta Económica) ── */}
                  <p className="text-[10px] font-black text-violet-700 uppercase border-b border-violet-200 pb-1 mb-3">
                    Datos Financieros (Cuentas de Cobro y Propuesta Económica)
                  </p>
                  <div className="grid grid-cols-2 gap-3 mb-4">
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">
                        Banco
                      </label>
                      <input
                        value={newUserForm.doctorData?.banco || ""}
                        onChange={(e) =>
                          setNewUserForm((p) => ({
                            ...p,
                            doctorData: {
                              ...(p.doctorData || {}),
                              banco: e.target.value,
                            },
                          }))
                        }
                        className="w-full p-2 border rounded-lg text-sm"
                        placeholder="BANCOLOMBIA"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">
                        Tipo de Cuenta
                      </label>
                      <select
                        value={newUserForm.doctorData?.tipoCuenta || "Ahorros"}
                        onChange={(e) =>
                          setNewUserForm((p) => ({
                            ...p,
                            doctorData: {
                              ...(p.doctorData || {}),
                              tipoCuenta: e.target.value,
                            },
                          }))
                        }
                        className="w-full p-2 border rounded-lg text-sm"
                      >
                        <option>Ahorros</option>
                        <option>Corriente</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">
                        No. Cuenta
                      </label>
                      <input
                        value={newUserForm.doctorData?.numeroCuenta || ""}
                        onChange={(e) =>
                          setNewUserForm((p) => ({
                            ...p,
                            doctorData: {
                              ...(p.doctorData || {}),
                              numeroCuenta: e.target.value,
                            },
                          }))
                        }
                        className="w-full p-2 border rounded-lg text-sm"
                        placeholder="XXX-XXXXXXX-XX"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">
                        RUT / NIT
                      </label>
                      <input
                        value={newUserForm.doctorData?.rut || ""}
                        onChange={(e) =>
                          setNewUserForm((p) => ({
                            ...p,
                            doctorData: {
                              ...(p.doctorData || {}),
                              rut: e.target.value,
                            },
                          }))
                        }
                        className="w-full p-2 border rounded-lg text-sm"
                        placeholder="XXXXXXXXXX-X"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-xs font-bold text-gray-600 mb-1">
                        Régimen Tributario
                      </label>
                      <input
                        value={newUserForm.doctorData?.regimen || ""}
                        onChange={(e) =>
                          setNewUserForm((p) => ({
                            ...p,
                            doctorData: {
                              ...(p.doctorData || {}),
                              regimen: e.target.value,
                            },
                          }))
                        }
                        className="w-full p-2 border rounded-lg text-sm"
                        placeholder="Simple / DRME / Otro"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">
                        Tarifa por Hora ($)
                      </label>
                      <input
                        type="number"
                        value={newUserForm.doctorData?.tarifaHora || ""}
                        onChange={(e) =>
                          setNewUserForm((p) => ({
                            ...p,
                            doctorData: {
                              ...(p.doctorData || {}),
                              tarifaHora: e.target.value,
                            },
                          }))
                        }
                        className="w-full p-2 border rounded-lg text-sm"
                        placeholder="120000"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">
                        Tarifa Examen Ocup ($)
                      </label>
                      <input
                        type="number"
                        value={newUserForm.doctorData?.tarifaExamenOcup || ""}
                        onChange={(e) =>
                          setNewUserForm((p) => ({
                            ...p,
                            doctorData: {
                              ...(p.doctorData || {}),
                              tarifaExamenOcup: e.target.value,
                            },
                          }))
                        }
                        className="w-full p-2 border rounded-lg text-sm"
                        placeholder="90000"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">
                        Tarifa Informe ($)
                      </label>
                      <input
                        type="number"
                        value={newUserForm.doctorData?.tarifaInforme || ""}
                        onChange={(e) =>
                          setNewUserForm((p) => ({
                            ...p,
                            doctorData: {
                              ...(p.doctorData || {}),
                              tarifaInforme: e.target.value,
                            },
                          }))
                        }
                        className="w-full p-2 border rounded-lg text-sm"
                        placeholder="250000"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-bold text-gray-600 mb-1">
                        Tarifa Día PVE ($)
                      </label>
                      <input
                        type="number"
                        value={newUserForm.doctorData?.tarifaDiaPVE || ""}
                        onChange={(e) =>
                          setNewUserForm((p) => ({
                            ...p,
                            doctorData: {
                              ...(p.doctorData || {}),
                              tarifaDiaPVE: e.target.value,
                            },
                          }))
                        }
                        className="w-full p-2 border rounded-lg text-sm"
                        placeholder="350000"
                      />
                    </div>
                  </div>
                </>
              )}
              {/* ── Firma del médico ── */}
              {(["medico", "administrador", "super_admin"].includes(
                newUserForm.role
              ) ||
                !newUserForm.role) && (
                <div className="mb-4">
                  <p className="text-[10px] font-black text-violet-700 uppercase border-b border-violet-200 pb-1 mb-3">
                    Firma Digital (aparece en HC, Certificados, Informes y
                    Propuestas)
                  </p>
                  <div className="flex items-center gap-4">
                    <div className="w-36 h-20 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center bg-gray-50 overflow-hidden">
                      {newUserForm.doctorData?.signature ? (
                        <img
                          src={newUserForm.doctorData.signature}
                          alt="Firma"
                          className="max-h-full max-w-full object-contain p-1"
                        />
                      ) : (
                        <p className="text-[9px] text-gray-400 text-center px-2">
                          Sin firma
                          <br />
                          cargada
                        </p>
                      )}
                    </div>
                    <div className="flex-1">
                      <input
                        type="file"
                        accept="image/*"
                        style={{ display: "none" }}
                        id="newUserSigInput"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (!file) return;
                          const r = new FileReader();
                          r.onloadend = () =>
                            setNewUserForm((p) => ({
                              ...p,
                              doctorData: {
                                ...(p.doctorData || {}),
                                signature: r.result,
                              },
                            }));
                          r.readAsDataURL(file);
                          e.target.value = null;
                        }}
                      />
                      <button
                        onClick={() =>
                          document.getElementById("newUserSigInput").click()
                        }
                        className="w-full bg-violet-50 text-violet-700 border border-violet-300 px-3 py-2 rounded-lg text-xs font-bold hover:bg-violet-100 flex items-center justify-center gap-2 mb-2"
                      >
                        <UploadCloud className="w-3.5 h-3.5" /> Subir Firma
                        (PNG/JPG)
                      </button>
                      {newUserForm.doctorData?.signature && (
                        <button
                          onClick={() =>
                            setNewUserForm((p) => ({
                              ...p,
                              doctorData: {
                                ...(p.doctorData || {}),
                                signature: null,
                              },
                            }))
                          }
                          className="w-full bg-red-50 text-red-600 border border-red-200 px-3 py-1.5 rounded-lg text-xs font-bold hover:bg-red-100 flex items-center justify-center gap-1"
                        >
                          <X className="w-3 h-3" /> Eliminar firma
                        </button>
                      )}
                      <p className="text-[9px] text-gray-400 mt-1">
                        Se recomienda imagen PNG fondo transparente
                      </p>
                    </div>
                  </div>
                </div>
              )}
              <button
                onClick={() => {
                  if (
                    !newUserForm.name ||
                    !newUserForm.user ||
                    !newUserForm.pass
                  ) {
                    showAlert("Complete los campos obligatorios (*).");
                    return;
                  }
                  // FIX M-06: validar complejidad de contraseña
                  const pw = newUserForm.pass;
                  if (pw.length < 8) {
                    showAlert(
                      "⚠️ La contraseña debe tener mínimo 8 caracteres."
                    );
                    return;
                  }
                  if (!/[A-Z]/.test(pw) && !/[0-9]/.test(pw)) {
                    showAlert(
                      "⚠️ La contraseña debe incluir al menos una mayúscula o un número."
                    );
                    return;
                  }
                  if (usersList.find((u) => u.user === newUserForm.user)) {
                    showAlert("El nombre de usuario ya existe.");
                    return;
                  }
                  const doctorData = {
                    ...DEFAULT_DOCTOR_DATA,
                    nombre: newUserForm.name.toUpperCase(),
                    ...(newUserForm.doctorData || {}),
                  };
                  // SEGURIDAD: hashear contraseña antes de guardar
                  _sha256(newUserForm.pass).then((hash) => {
                    const secureUser = { ...newUserForm, passHash: hash };
                    delete secureUser.pass;
                    // ── IPS: admin_empresa auto-asigna empresaId + orgId a los usuarios que crea ──
                    if (
                      currentUser?.role === "admin_empresa" &&
                      currentUser.empresaId
                    ) {
                      secureUser.empresaId = currentUser.empresaId;
                      secureUser.orgId = currentUser.orgId || ORG_DEFAULT_ID;
                      secureUser.mustChangePassword = true;
                      // Agregar médico al medicoIds de la empresa
                      if (secureUser.role === "medico") {
                        const _empIdx = companies.findIndex(
                          (c) => c.id === currentUser.empresaId
                        );
                        if (_empIdx >= 0) {
                          const _updComps = [...companies];
                          _updComps[_empIdx] = {
                            ..._updComps[_empIdx],
                            medicoIds: [
                              ...new Set([
                                ...(_updComps[_empIdx].medicoIds || []),
                                secureUser.user,
                              ]),
                            ],
                          };
                          setCompanies(_updComps);
                          _syncCompanies(_updComps);
                        }
                      }
                    }
                    const updSec = [
                      ...usersList,
                      { ...secureUser, id: Date.now(), doctorData },
                    ];
                    setUsersList(updSec);
                    _sync("siso_users", JSON.stringify(updSec));
                    // Sincronizar nuevo usuario a Supabase inmediatamente
                    _sbSet("siso_users", updSec).then((ok) => {
                      if (ok)
                        showAlert(
                          "✅ Usuario creado y guardado en la nube correctamente."
                        );
                      else
                        showAlert(
                          "✅ Usuario creado localmente. Se sincronizará cuando haya conexión."
                        );
                    });
                  });
                  setNewUserForm({
                    user: "",
                    pass: "",
                    name: "",
                    role: "medico",
                    license: "libre",
                    secretariaPermisos: { ...SECRETARIA_PERMISOS_DEFAULT },
                    medicosAsignados: [],
                    doctorData: {},
                  });
                  setActiveUserMgmtTab("list");
                  showAlert(
                    "✅ Usuario creado con todos sus datos profesionales y financieros."
                  );
                }}
                className="w-full bg-violet-600 text-white py-3 rounded-xl font-bold text-sm hover:bg-violet-700 mt-2 flex items-center justify-center gap-2"
              >
                <UserPlus className="w-4 h-4" /> Crear Usuario Completo
              </button>
            </div>
          )}
          {/* ══ FASE 2 — PANEL REASIGNACIÓN DE PACIENTES ══ */}
          {activeUserMgmtTab === "reasignacion" &&
            _isAdmin(currentUser?.role) &&
            (() => {
              const myOrgId = currentUser?.orgId || ORG_DEFAULT_ID;
              const sinMedico = patientsList.filter(
                (p) =>
                  !p._medicoId &&
                  !p._archivado &&
                  (currentUser?.role === "super_admin" ||
                    (p._orgId || ORG_DEFAULT_ID) === myOrgId)
              );
              const conMedico = patientsList.filter(
                (p) =>
                  p._medicoId &&
                  !p._archivado &&
                  (currentUser?.role === "super_admin" ||
                    (p._orgId || ORG_DEFAULT_ID) === myOrgId)
              );
              const medicos = usersList.filter(
                (u) =>
                  (u.role === "medico" ||
                    u.role === "administrador" ||
                    u.role === "super_admin") &&
                  u.activo !== false &&
                  (currentUser?.role === "super_admin" ||
                    (u.orgId || ORG_DEFAULT_ID) === myOrgId)
              );
              // Distribución equitativa: calcula cuántos le tocan a cada médico
              const distribuirEquitativamente = () => {
                if (!medicos.length || !sinMedico.length) return;
                const updated = patientsList.map((p) => {
                  if (p._medicoId || p._archivado) return p;
                  if (
                    (p._orgId || ORG_DEFAULT_ID) !== myOrgId &&
                    currentUser?.role !== "super_admin"
                  )
                    return p;
                  return p;
                });
                let idx = 0;
                const asignados = sinMedico.map((p) => {
                  // Preferir médico que ya trató al paciente (misma empresa o historial)
                  const medAnterior = patientsList.find(
                    (hp) =>
                      hp._medicoId && hp.cedula === p.cedula && hp.id !== p.id
                  );
                  const medId =
                    medAnterior?._medicoId &&
                    medicos.find((m) => m.user === medAnterior._medicoId)
                      ? medAnterior._medicoId
                      : medicos[idx % medicos.length].user;
                  if (!medAnterior?._medicoId) idx++;
                  return { ...p, _medicoId: medId };
                });
                const final = patientsList.map(
                  (p) => asignados.find((a) => a.id === p.id) || p
                );
                setPatientsList(final);
                _syncPatients(final);
                showAlert(
                  `✅ ${sinMedico.length} pacientes distribuidos entre ${medicos.length} médicos.`
                );
              };
              return (
                <div className="space-y-6">
                  {/* Cabecera */}
                  <div className="bg-gradient-to-r from-teal-50 to-cyan-50 rounded-2xl p-5 border border-teal-200">
                    <h3 className="font-black text-teal-800 text-lg flex items-center gap-2 mb-1">
                      🔀 Panel de Reasignación de Pacientes
                    </h3>
                    <p className="text-sm text-teal-700">
                      Asigna pacientes sin médico, redistribuye equitativamente
                      y gestiona la continuidad del cuidado. · Org:{" "}
                      <strong>
                        {orgsList.find((o) => o.orgId === myOrgId)?.orgName ||
                          myOrgId}
                      </strong>
                    </p>
                    <div className="flex gap-3 mt-3 flex-wrap">
                      <div className="bg-white rounded-xl px-4 py-2 border border-teal-200 text-center">
                        <p className="text-2xl font-black text-red-600">
                          {sinMedico.length}
                        </p>
                        <p className="text-[10px] text-gray-500">Sin médico</p>
                      </div>
                      <div className="bg-white rounded-xl px-4 py-2 border border-teal-200 text-center">
                        <p className="text-2xl font-black text-green-600">
                          {conMedico.length}
                        </p>
                        <p className="text-[10px] text-gray-500">Asignados</p>
                      </div>
                      <div className="bg-white rounded-xl px-4 py-2 border border-teal-200 text-center">
                        <p className="text-2xl font-black text-blue-600">
                          {medicos.length}
                        </p>
                        <p className="text-[10px] text-gray-500">
                          Médicos activos
                        </p>
                      </div>
                      {sinMedico.length > 0 && (
                        <button
                          onClick={distribuirEquitativamente}
                          className="ml-auto bg-teal-600 text-white px-4 py-2 rounded-xl text-sm font-black hover:bg-teal-700 flex items-center gap-2"
                        >
                          ⚖️ Distribuir equitativamente
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Médico de Turno */}
                  <div className="bg-amber-50 rounded-xl p-4 border border-amber-200">
                    <p className="text-xs font-black text-amber-700 mb-2">
                      🩺 Médico de Turno Activo
                    </p>
                    <div className="flex gap-2 flex-wrap">
                      <select
                        value={medicoTurnoActivo}
                        onChange={(e) => {
                          setMedicoTurnoActivo(e.target.value);
                          try {
                            localStorage.setItem(
                              "siso_medico_turno",
                              e.target.value
                            );
                          } catch {
                            /**/
                          }
                        }}
                        className="flex-1 p-2 border rounded-lg text-sm min-w-[200px]"
                      >
                        <option value="">— Sin turno activo —</option>
                        {medicos.map((m) => (
                          <option key={m.user} value={m.user}>
                            {m.name}
                          </option>
                        ))}
                      </select>
                      <span
                        className={`text-xs px-3 py-2 rounded-lg font-bold ${
                          medicoTurnoActivo
                            ? "bg-green-100 text-green-700"
                            : "bg-gray-100 text-gray-500"
                        }`}
                      >
                        {medicoTurnoActivo
                          ? `✅ Turno: ${
                              medicos.find((m) => m.user === medicoTurnoActivo)
                                ?.name || medicoTurnoActivo
                            }`
                          : "Sin turno asignado"}
                      </span>
                    </div>
                    <p className="text-[10px] text-amber-600 mt-1">
                      Los pacientes nuevos se sugerirán para asignar a este
                      médico.
                    </p>
                  </div>

                  {/* Tabla pacientes sin médico */}
                  {sinMedico.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                      <p className="text-3xl mb-2">✅</p>
                      <p className="font-bold">
                        Todos los pacientes tienen médico asignado
                      </p>
                    </div>
                  ) : (
                    <div>
                      <h4 className="font-black text-red-700 mb-3 text-sm">
                        ⚠️ Pacientes sin médico asignado ({sinMedico.length})
                      </h4>
                      <div className="overflow-x-auto rounded-xl border border-red-100">
                        <table className="w-full text-sm">
                          <thead className="bg-red-50">
                            <tr>
                              <th className="p-2 text-left text-xs font-black text-red-700">
                                Paciente
                              </th>
                              <th className="p-2 text-left text-xs font-black text-red-700">
                                Empresa
                              </th>
                              <th className="p-2 text-left text-xs font-black text-red-700">
                                Tipo HC
                              </th>
                              <th className="p-2 text-xs font-black text-red-700">
                                Asignar a
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {sinMedico.slice(0, 50).map((p) => {
                              // Detectar si este paciente ya fue atendido por algún médico antes (continuidad)
                              const medPrevio = patientsList.find(
                                (hp) =>
                                  hp._medicoId &&
                                  hp.cedula === p.cedula &&
                                  hp.id !== p.id
                              );
                              return (
                                <tr
                                  key={p.id}
                                  className="border-t border-red-50 hover:bg-red-50/40"
                                >
                                  <td className="p-2">
                                    <p className="font-bold text-xs">
                                      {p.nombre || p.paciente || "Sin nombre"}
                                    </p>
                                    <p className="text-[10px] text-gray-400">
                                      {p.cedula || "Sin cédula"}
                                    </p>
                                    {medPrevio && (
                                      <span className="text-[9px] bg-blue-100 text-blue-700 px-1 rounded">
                                        Antes:{" "}
                                        {medicos.find(
                                          (m) => m.user === medPrevio._medicoId
                                        )?.name || medPrevio._medicoId}
                                      </span>
                                    )}
                                  </td>
                                  <td className="p-2 text-xs text-gray-600">
                                    {p.empresa || "—"}
                                  </td>
                                  <td className="p-2 text-xs text-gray-600">
                                    {p.tipoExamen || p.type || "—"}
                                  </td>
                                  <td className="p-2">
                                    <select
                                      defaultValue={
                                        medPrevio?._medicoId ||
                                        medicoTurnoActivo ||
                                        ""
                                      }
                                      onChange={(e) => {
                                        const upd = patientsList.map((x) =>
                                          x.id === p.id
                                            ? {
                                                ...x,
                                                _medicoId: e.target.value,
                                              }
                                            : x
                                        );
                                        setPatientsList(upd);
                                        _syncPatients(upd);
                                      }}
                                      className="w-full text-xs p-1 border rounded"
                                    >
                                      <option value="">— Sin asignar —</option>
                                      {medicos.map((m) => (
                                        <option key={m.user} value={m.user}>
                                          {m.name}
                                        </option>
                                      ))}
                                    </select>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}

          {/* ── GESTIÓN DE ALMACENAMIENTO ── */}
          {activeUserMgmtTab === "storage" &&
            (() => {
              // Cargar datos reales desde Supabase al abrir el panel
              const loadSbData = () => {
                setSbLoading(true);
                _sbGetAll()
                  .then((cloud) => {
                    setSbCloudData(cloud || {});
                    setSbLoading(false);
                  })
                  .catch(() => {
                    setSbLoading(false);
                    setSbCloudData({});
                  });
              };
              // Calcular stats por usuario usando datos de Supabase + localStorage como fallback
              const stats = usersList.map((u) => {
                const cloudKey = `siso_patients_${u.user}`;
                const localKey = `siso_db_patients_${u.user}`;
                // Preferir Supabase; si no hay datos cargados aún, usar localStorage
                let pats = [];
                let source = "local";
                if (sbCloudData && sbCloudData[cloudKey]?.value) {
                  pats = Array.isArray(sbCloudData[cloudKey].value)
                    ? sbCloudData[cloudKey].value
                    : [];
                  source = "supabase";
                } else {
                  const raw = _ls.getItem(localKey) || "[]";
                  try {
                    pats = JSON.parse(raw);
                  } catch {}
                  source = "local";
                }
                // También revisar si tiene pacientes con la clave genérica legacy
                if (pats.length === 0 && sbCloudData) {
                  const legacyKey = "siso_db_patients";
                  if (sbCloudData[legacyKey]?.value) {
                    const legacyPats = Array.isArray(
                      sbCloudData[legacyKey].value
                    )
                      ? sbCloudData[legacyKey].value
                      : [];
                    pats = legacyPats.filter(
                      (p) => p._medicoId === u.user || !p._medicoId
                    );
                    if (pats.length > 0) source = "supabase-legacy";
                  }
                }
                const rawStr = JSON.stringify(pats);
                const bytes = new Blob([rawStr]).size;
                const kb = (bytes / 1024).toFixed(1);
                const mb = (bytes / (1024 * 1024)).toFixed(3);
                const certs = pats.filter(
                  (p) => p.estadoHistoria === "Cerrada" || p.codigoVerificacion
                ).length;
                const moves = auditLog.filter((a) => a.usuario === u.user);
                return {
                  ...u,
                  bytes,
                  kb,
                  mb,
                  total: pats.length,
                  certs,
                  moves,
                  source,
                };
              });
              const totalBytes = stats.reduce((s, u) => s + u.bytes, 0);
              const totalKB = (totalBytes / 1024).toFixed(1);
              const totalMB = (totalBytes / (1024 * 1024)).toFixed(3);
              const allMoves = stats
                .flatMap((u) =>
                  u.moves.map((m) => ({ ...m, uName: u.name, uLogin: u.user }))
                )
                .sort((a, b) => b.id - a.id)
                .slice(0, 100);
              return (
                <div className="space-y-5">
                  {/* Encabezado + botón recargar */}
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-black text-violet-900 flex items-center gap-2 text-sm">
                        <HardDrive className="w-4 h-4" /> Gestión del
                        Almacenamiento - Supabase
                      </h3>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {sbCloudData
                          ? `${
                              Object.keys(sbCloudData).length
                            } claves en Supabase · datos reales`
                          : "Cargando desde Supabase..."}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <button
                        onClick={loadSbData}
                        disabled={sbLoading}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-violet-600 text-white rounded-lg text-xs font-bold hover:bg-violet-700 disabled:opacity-50"
                      >
                        {sbLoading ? "⏳ Cargando..." : "🔄 Recargar Supabase"}
                      </button>
                      {!sbCloudData && !sbLoading && (
                        <button onClick={loadSbData} className="hidden" />
                      )}
                      <div className="bg-violet-50 border border-violet-200 rounded-xl px-4 py-2 text-center min-w-[100px]">
                        <p className="text-[10px] text-violet-500 font-black uppercase">
                          Total
                        </p>
                        <p className="text-xl font-black text-violet-700">
                          {totalKB} <span className="text-xs">KB</span>
                        </p>
                        <p className="text-[10px] text-gray-400">
                          {totalMB} MB
                        </p>
                      </div>
                    </div>
                  </div>
                  {/* Aviso si no ha cargado Supabase */}
                  {!sbCloudData && !sbLoading && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3">
                      <span className="text-2xl">☁️</span>
                      <div>
                        <p className="font-black text-amber-800 text-sm">
                          Datos de Supabase no cargados
                        </p>
                        <p className="text-xs text-amber-600 mt-0.5">
                          Haga clic en "Recargar Supabase" para ver los datos
                          reales de todos los usuarios. Los valores mostrados
                          son del almacenamiento local.
                        </p>
                      </div>
                    </div>
                  )}
                  {/* Resumen de perfiles */}
                  <div className="grid grid-cols-3 gap-3">
                    {[
                      {
                        label: "Total usuarios",
                        value: usersList.length,
                        color: "violet",
                        icon: "👥",
                      },
                      {
                        label: "Activos",
                        value: usersList.filter((u) => u.activo !== false)
                          .length,
                        color: "emerald",
                        icon: "✅",
                      },
                      {
                        label: "Inactivos",
                        value: usersList.filter((u) => u.activo === false)
                          .length,
                        color: "gray",
                        icon: "⏸️",
                      },
                    ].map((card) => (
                      <div
                        key={card.label}
                        className={`bg-white border border-${card.color}-100 rounded-xl p-4 text-center shadow-sm`}
                      >
                        <p className="text-2xl">{card.icon}</p>
                        <p
                          className={`text-2xl font-black text-${card.color}-600`}
                        >
                          {card.value}
                        </p>
                        <p className="text-[10px] text-gray-500 font-bold uppercase">
                          {card.label}
                        </p>
                      </div>
                    ))}
                  </div>
                  {/* Tabla por usuario */}
                  <div className="overflow-x-auto rounded-xl border border-gray-100 shadow-sm">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-violet-50 text-violet-700 font-black uppercase text-[10px]">
                          <th className="p-3 text-left">Usuario</th>
                          <th className="p-3 text-left">Rol</th>
                          <th className="p-3 text-center">Estado</th>
                          <th className="p-3 text-center">Pacientes</th>
                          <th className="p-3 text-center">Certificados</th>
                          <th className="p-3 text-center">Almacenamiento</th>
                          <th className="p-3 text-center">Movimientos</th>
                          <th className="p-3 text-center">Fuente</th>
                          <th className="p-3 text-center">Acciones</th>
                        </tr>
                      </thead>
                      <tbody>
                        {stats.map((u, i) => (
                          <tr
                            key={u.user}
                            className={`border-b border-gray-50 ${
                              i % 2 === 0 ? "bg-white" : "bg-gray-50/50"
                            }`}
                          >
                            <td className="p-3">
                              <p className="font-black text-gray-900">
                                {u.name}
                              </p>
                              <p className="text-[10px] font-mono text-gray-400">
                                @{u.user}
                              </p>
                            </td>
                            <td className="p-3">
                              <span
                                className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                                  u.role === "super_admin"
                                    ? "bg-purple-100 text-purple-800"
                                    : u.role === "administrador"
                                    ? "bg-red-100 text-red-700"
                                    : u.role === "secretaria"
                                    ? "bg-orange-100 text-orange-700"
                                    : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {u.role === "super_admin"
                                  ? "⭐ Super Admin"
                                  : u.role === "administrador"
                                  ? "Administrador"
                                  : u.role === "secretaria"
                                  ? "Secretaria"
                                  : "Médico"}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              {u.activo === false ? (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-gray-200 text-gray-500 font-bold">
                                  ⏸ Inactivo
                                </span>
                              ) : (
                                <span className="text-[10px] px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-bold">
                                  ✅ Activo
                                </span>
                              )}
                            </td>
                            <td className="p-3 text-center">
                              <span className="text-2xl font-black text-teal-600">
                                {u.total}
                              </span>
                              <p className="text-[10px] text-gray-400">
                                registros
                              </p>
                            </td>
                            <td className="p-3 text-center">
                              <span className="text-2xl font-black text-emerald-600">
                                {u.certs}
                              </span>
                              <p className="text-[10px] text-gray-400">
                                emitidos
                              </p>
                            </td>
                            <td className="p-3 text-center min-w-[110px]">
                              <p className="font-black text-violet-700">
                                {u.kb} KB
                              </p>
                              <p className="text-[10px] text-gray-400 mb-1">
                                {u.mb} MB
                              </p>
                              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-2 rounded-full bg-gradient-to-r from-violet-400 to-violet-600 transition-all"
                                  style={{
                                    width:
                                      totalBytes > 0
                                        ? `${Math.min(
                                            100,
                                            (u.bytes / totalBytes) * 100
                                          )}%`
                                        : "0%",
                                  }}
                                />
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              <span className="text-2xl font-black text-blue-600">
                                {u.moves.length}
                              </span>
                              <p className="text-[10px] text-gray-400">
                                acciones
                              </p>
                            </td>
                            <td className="p-3 text-center">
                              <span
                                className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${
                                  u.source === "supabase"
                                    ? "bg-green-100 text-green-700"
                                    : u.source === "supabase-legacy"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-gray-100 text-gray-500"
                                }`}
                              >
                                {u.source === "supabase"
                                  ? "☁️ Supabase"
                                  : u.source === "supabase-legacy"
                                  ? "☁️ Legacy"
                                  : "💾 Local"}
                              </span>
                            </td>
                            <td className="p-3 text-center">
                              <div className="flex flex-col gap-1.5 items-center">
                                <button
                                  title="Descargar base de datos de pacientes"
                                  onClick={() => {
                                    showPrompt(
                                      "Código de administrador (9207) para descargar:",
                                      (inputCode) => {
                                        if (
                                          (inputCode || "").trim() !== "9207"
                                        ) {
                                          showAlert(
                                            "⛔ Código incorrecto. Use el código 9207."
                                          );
                                          return;
                                        }
                                        const cloudKey = `siso_patients_${u.user}`;
                                        const localKey = `siso_db_patients_${u.user}`;
                                        let pats = [];
                                        if (
                                          sbCloudData &&
                                          sbCloudData[cloudKey]?.value
                                        ) {
                                          pats = Array.isArray(
                                            sbCloudData[cloudKey].value
                                          )
                                            ? sbCloudData[cloudKey].value
                                            : [];
                                        } else {
                                          const raw =
                                            _ls.getItem(localKey) || "[]";
                                          try {
                                            pats = JSON.parse(raw);
                                          } catch {}
                                        }
                                        const _patStr = JSON.stringify(
                                          pats,
                                          null,
                                          2
                                        );
                                        const _patB64 = btoa(
                                          unescape(encodeURIComponent(_patStr))
                                        );
                                        const a = document.createElement("a");
                                        a.href =
                                          "data:application/json;base64," +
                                          _patB64;
                                        a.download = `pacientes_${u.user}_${
                                          new Date().toISOString().split("T")[0]
                                        }.json`;
                                        a.click();
                                        document.body &&
                                          document.body.removeChild &&
                                          a.parentNode &&
                                          a.parentNode.removeChild(a);
                                        const entry = {
                                          id: Date.now(),
                                          fecha: new Date().toISOString(),
                                          usuario: currentUser?.user,
                                          accion: "Descarga DB",
                                          pacienteId: `usuario:${u.user}`,
                                          tipo: "admin",
                                        };
                                        setAuditLog((prev) => {
                                          const n = [entry, ...prev].slice(
                                            0,
                                            500
                                          );
                                          _sync(
                                            "siso_audit_log",
                                            JSON.stringify(n)
                                          );
                                          return n;
                                        });
                                      }
                                    );
                                  }}
                                  className="px-2 py-1 bg-blue-50 text-blue-700 rounded-lg text-[10px] font-bold hover:bg-blue-100 flex items-center gap-1 whitespace-nowrap"
                                >
                                  ⬇ Descargar
                                </button>
                                <button
                                  title="Eliminar TODOS los datos de este usuario (pacientes, empresas, facturas)"
                                  onClick={() => {
                                    showPrompt(
                                      `⚠️ ELIMINACIÓN TOTAL de @${u.user}. Ingrese código 9207 para confirmar:`,
                                      (inputCode) => {
                                        if (
                                          (inputCode || "").trim() !== "9207"
                                        ) {
                                          showAlert(
                                            "⛔ Código incorrecto. El código de eliminación es 9207."
                                          );
                                          return;
                                        }
                                        showConfirm(
                                          `¿Eliminar ABSOLUTAMENTE TODOS los datos de @${u.user}? Pacientes, empresas, facturas. Esta acción NO se puede deshacer.`,
                                          () => {
                                            // Claves locales a eliminar
                                            const localKeys = [
                                              _patKey(u.user),
                                              _compKey(u.user),
                                              `siso_saved_bills_${u.user}`,
                                              `siso_saved_reports_${u.user}`,
                                              `siso_active_form_${u.user}`,
                                              "siso_db_patients", // legacy key
                                              "siso_companies", // legacy key
                                            ];
                                            // Claves Supabase a eliminar
                                            const cloudKeys = [
                                              _patKeyCloud(u.user),
                                              _compKeyCloud(u.user),
                                              `siso_bills_${u.user}`,
                                              `siso_reports_${u.user}`,
                                              `siso_ai_keys_${u.user}`,
                                              `siso_portal_doc_${u.user}`,
                                              `siso_doctor_signature_${u.user}`,
                                              "siso_db_patients", // legacy cloud key
                                              "siso_companies", // legacy cloud key
                                            ];
                                            // 1. Borrar localStorage
                                            localKeys.forEach((k) =>
                                              _ls.removeItem(k)
                                            );
                                            // 2. Borrar en React state si es el usuario activo
                                            if (currentUser?.user === u.user) {
                                              setPatientsList([]);
                                              setCompanies([]);
                                            }
                                            // 3. Borrar en Supabase - DELETE real de cada clave
                                            const deleteAll = cloudKeys.map(
                                              (k) => _sbDelete(k)
                                            );
                                            Promise.all(deleteAll).then(
                                              (results) => {
                                                const ok =
                                                  results.every(Boolean);
                                                // 4. Actualizar sbCloudData local para reflejar borrado
                                                setSbCloudData((prev) => {
                                                  if (!prev) return prev;
                                                  const updated = { ...prev };
                                                  cloudKeys.forEach((k) => {
                                                    delete updated[k];
                                                  });
                                                  return updated;
                                                });
                                                // 5. Registrar en auditoría
                                                const entry = {
                                                  id: Date.now(),
                                                  fecha:
                                                    new Date().toISOString(),
                                                  usuario: currentUser?.user,
                                                  accion: "Eliminación Total",
                                                  pacienteId: `usuario:${u.user}`,
                                                  tipo: "admin",
                                                };
                                                setAuditLog((prev) => {
                                                  const n = [
                                                    entry,
                                                    ...prev,
                                                  ].slice(0, 500);
                                                  _sync(
                                                    "siso_audit_log",
                                                    JSON.stringify(n)
                                                  );
                                                  return n;
                                                });
                                                showAlert(
                                                  ok
                                                    ? `✅ Todos los datos de @${u.user} eliminados de Supabase y memoria.`
                                                    : `⚠️ Eliminación parcial: algunos datos en Supabase no pudieron borrarse. Reintente.`
                                                );
                                              }
                                            );
                                          }
                                        );
                                      }
                                    );
                                  }}
                                  className="px-2 py-1 bg-red-50 text-red-600 rounded-lg text-[10px] font-bold hover:bg-red-100 flex items-center gap-1 whitespace-nowrap"
                                >
                                  🗑 Eliminar todo
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {/* Log movimientos */}
                  <div>
                    <h4 className="text-xs font-black text-gray-700 mb-3 flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-violet-500" />{" "}
                      Últimos movimientos por usuario
                    </h4>
                    <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                      {allMoves.length === 0 ? (
                        <p className="text-center text-gray-400 text-xs py-6">
                          Sin movimientos registrados aún
                        </p>
                      ) : (
                        allMoves.map((m, idx) => (
                          <div
                            key={idx}
                            className="bg-white border border-gray-100 rounded-lg p-2.5 flex items-center gap-3 hover:border-violet-200 transition"
                          >
                            <div className="bg-violet-50 rounded-lg p-1.5 flex-shrink-0">
                              <Activity className="w-3 h-3 text-violet-500" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span className="font-black text-[11px] text-gray-900">
                                  {m.uName}
                                </span>
                                <span className="text-[10px] font-mono text-violet-600 bg-violet-50 px-1.5 py-0.5 rounded">
                                  @{m.uLogin}
                                </span>
                                <span className="text-[10px] font-semibold text-gray-500 bg-gray-100 px-1.5 py-0.5 rounded">
                                  {m.accion}
                                </span>
                              </div>
                              <p className="text-[10px] text-gray-400 mt-0.5">
                                {new Date(m.fecha).toLocaleString("es-CO")}
                              </p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
        </div>
      </div>
    );
}
