// src/pages/Planes.jsx
// Planes y precios — comparación completa de planes, FAQ, activación
import React from 'react';
import { PLAN_CONFIG, _isAdmin } from '../shared/data/planConfig.js';

export default function Planes({
  currentUser,
  goTo,
  goBack,
  showAlert,
  setPendingActivationPlan,
  setActiveUserMgmtTab,
  setUserEditId,
}) {
  const planOrder = ["libre", "starter", "pro", "clinica"];
  const currentPlan = currentUser?.license || "libre";
  const features = [
    { label: "HC Ocupacional", libre: true, starter: true, pro: true, clinica: true },
    { label: "HC General", libre: true, starter: true, pro: true, clinica: true },
    { label: "Firma digital + QR", libre: true, starter: true, pro: true, clinica: true },
    { label: "Portal Trabajador", libre: true, starter: true, pro: true, clinica: true },
    { label: "Habeas Data (Ley 1581)", libre: true, starter: true, pro: true, clinica: true },
    { label: "Verificacion externa", libre: true, starter: true, pro: true, clinica: true },
    { label: "Backup / Restaurar", libre: true, starter: true, pro: true, clinica: true },
    { label: "Offline (PWA)", libre: true, starter: true, pro: true, clinica: true },
    { label: "Limite HC", libre: "30 total", starter: "200/mes", pro: "Ilimitadas", clinica: "Ilimitadas" },
    { label: "Empresas", libre: "5", starter: "30", pro: "Ilimitadas", clinica: "Ilimitadas" },
    { label: "Agenda de citas", libre: false, starter: true, pro: true, clinica: true },
    { label: "Propuestas Economicas", libre: false, starter: true, pro: true, clinica: true },
    { label: "Cuentas de Cobro", libre: false, starter: true, pro: true, clinica: true },
    { label: "Solicitud de Examenes", libre: false, starter: true, pro: true, clinica: true },
    { label: "Certificado de Incapacidad", libre: false, starter: true, pro: true, clinica: true },
    { label: "Reportes Epidemiologicos", libre: false, starter: true, pro: true, clinica: true },
    { label: "Sync Supabase (nube)", libre: false, starter: true, pro: true, clinica: true },
    { label: "SVE (programas)", libre: false, starter: "2 programas", pro: "7 programas", clinica: "7 programas" },
    { label: "Telemedicina", libre: false, starter: "10 ses/mes", pro: "Ilimitada", clinica: "Ilimitada" },
    { label: "Modulo ARL (AT/EL)", libre: false, starter: false, pro: true, clinica: true },
    { label: "IA - Analisis HC", libre: false, starter: false, pro: true, clinica: true },
    { label: "IA - Resumen clinico", libre: false, starter: false, pro: true, clinica: true },
    { label: "IA - Reporte empresa", libre: false, starter: false, pro: true, clinica: true },
    { label: "FHIR R4 (Res. 1888/2025)", libre: false, starter: false, pro: true, clinica: true },
    { label: "RIPS JSON v2 export", libre: false, starter: false, pro: true, clinica: true },
    { label: "Factura electronica DIAN", libre: false, starter: false, pro: true, clinica: true },
    { label: "Adjuntos clinicos", libre: false, starter: false, pro: true, clinica: true },
    { label: "Auditoria completa", libre: false, starter: false, pro: true, clinica: true },
    { label: "2FA (doble factor)", libre: false, starter: false, pro: true, clinica: true },
    { label: "Multi-usuario", libre: "1", starter: "1 medico", pro: "1 medico", clinica: "3 base + $45K c/u extra" },
    { label: "Almacenamiento nube", libre: "Local", starter: "500 MB", pro: "3 GB", clinica: "10 GB" },
  ];
  const planColors2 = {
    libre: { bg: "bg-gray-600", light: "bg-gray-50", text: "text-gray-700" },
    starter: { bg: "bg-teal-600", light: "bg-teal-50", text: "text-teal-700" },
    pro: { bg: "bg-blue-600", light: "bg-blue-50", text: "text-blue-700" },
    clinica: { bg: "bg-purple-600", light: "bg-purple-50", text: "text-purple-700" },
  };
  const renderCell = (val) => {
    if (val === true) return <span className="text-emerald-500 font-black text-base">&#x2713;</span>;
    if (val === false) return <span className="text-gray-300 text-base">-</span>;
    return <span className="text-xs font-bold text-gray-700">{val}</span>;
  };
  const handleActivate = (pk) => {
    if (_isAdmin(currentUser?.role)) {
      if (setPendingActivationPlan) setPendingActivationPlan(pk);
      if (setActiveUserMgmtTab) setActiveUserMgmtTab("licencias");
      if (setUserEditId) setUserEditId(null);
      goTo("users");
    } else {
      const plan = PLAN_CONFIG[pk];
      showAlert("Para activar el plan " + plan.label + ", comunicate con el administrador.\n\nPrecio: " + plan.priceLabel);
    }
  };
  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <h1 className="text-2xl font-black text-gray-800 mb-1">Planes y Precios</h1>
        <p className="text-gray-500 text-sm">Elige el plan que mejor se ajuste a tu practica medica. Sin permanencia.</p>
      </div>
      {/* Profesionales */}
      <div className="mb-2">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xl">&#x1F468;&#x200D;&#x2695;&#xFE0F;</span>
          <div><h2 className="font-black text-gray-800 text-base">Para Profesionales - Medico Individual</h2><p className="text-xs text-gray-400">Un solo medico trabajando de forma independiente</p></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {["libre", "starter", "pro"].map(pk => {
            const plan = PLAN_CONFIG[pk]; const c = planColors2[pk]; const isCurrent = pk === currentPlan;
            return (
              <div key={pk} className={"rounded-2xl border-2 overflow-hidden " + (isCurrent ? "border-blue-400 shadow-lg ring-2 ring-blue-100" : "border-gray-100 shadow-sm")}>
                {isCurrent && <div className="bg-blue-600 text-white text-[10px] font-black text-center py-1 tracking-widest">PLAN ACTUAL</div>}
                <div className={c.bg + " px-4 py-4 text-center"}><p className="text-white font-black text-base">{plan.label}</p><p className="text-white/80 text-[11px] mt-0.5">{plan.priceLabel}</p></div>
                <div className={c.light + " px-4 py-4 space-y-1.5"}>
                  <p className="text-xs text-gray-600"><span className="font-black">HC:</span> {plan.maxHC < 9999 ? plan.maxHC + " total/mes" : "Ilimitadas"}</p>
                  <p className="text-xs text-gray-600"><span className="font-black">Empresas:</span> {plan.maxEmpresas < 9999 ? plan.maxEmpresas : "Infinitas"}</p>
                  <p className="text-xs text-gray-600"><span className="font-black">Medicos:</span> {plan.maxMedicos}</p>
                  <p className="text-xs text-gray-600"><span className="font-black">SVE:</span> {plan.maxSVEprogramas === 0 ? "-" : plan.maxSVEprogramas + " prog."}</p>
                  <p className="text-xs text-gray-600"><span className="font-black">Nube:</span> {plan.storageMB === 0 ? "Local" : plan.storageMB >= 1024 ? (plan.storageMB / 1024) + "GB" : plan.storageMB + "MB"}</p>
                </div>
                <div className="px-4 pb-4">{isCurrent ? (<div className="w-full text-center py-2 bg-emerald-100 text-emerald-700 rounded-xl text-xs font-black">Plan actual</div>) : (<button onClick={() => handleActivate(pk)} className={"w-full py-2 " + c.bg + " text-white rounded-xl text-xs font-black hover:opacity-90 transition"}>{_isAdmin(currentUser?.role) ? "Activar para usuario" : plan.price === 0 ? "Plan actual gratis" : "Suscribirme"}</button>)}</div>
              </div>
            );
          })}
        </div>
      </div>
      {/* Clinica */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <span className="text-xl">&#x1F3E2;</span>
          <div><h2 className="font-black text-gray-800 text-base">Para Empresas - Clinica / IPS / Multi-medico</h2><p className="text-xs text-gray-400">Multiples medicos, secretarias y modulos avanzados</p></div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {(() => { const pk = "clinica"; const plan = PLAN_CONFIG[pk]; const c = planColors2[pk]; const isCurrent = pk === currentPlan;
            return (
              <div className={"rounded-2xl border-2 overflow-hidden " + (isCurrent ? "border-purple-400 shadow-lg ring-2 ring-purple-100" : "border-purple-100 shadow-sm")}>
                {isCurrent && <div className="bg-purple-600 text-white text-[10px] font-black text-center py-1 tracking-widest">PLAN ACTUAL</div>}
                <div className={c.bg + " px-6 py-5 flex justify-between items-center"}>
                  <div><p className="text-white font-black text-lg">{plan.label}</p><p className="text-white/80 text-sm mt-0.5">{plan.priceLabel}</p></div>
                  <div className="text-right text-white/80 text-xs space-y-1"><p>Medicos ilimitados</p><p>Secretarias ilimitadas</p><p>HC ilimitadas</p><p>Todas las funciones</p></div>
                </div>
                <div className="px-6 py-4 grid grid-cols-2 gap-2">
                  {[["Medicos","Ilimitados"],["Secretarias","Ilimitadas"],["HC/mes","Ilimitadas"],["Empresas","Ilimitadas"],["SVE","7 programas"],["Nube",(plan.storageMB/1024)+"GB"],["Telemedicina","Ilimitada"],["IA","Incluido"],["Portal Empresa","Incluido"],["DIAN","Incluido"],["FHIR R4","Incluido"],["Soporte","Prioritario"]].map(([k,v]) => (
                    <div key={k} className="flex justify-between items-center text-xs py-1 border-b border-gray-50"><span className="text-gray-600 font-bold">{k}</span><span className="font-black text-gray-800">{v}</span></div>
                  ))}
                </div>
                <div className="px-6 pb-5">{isCurrent ? (<div className="w-full text-center py-3 bg-emerald-100 text-emerald-700 rounded-xl text-sm font-black">Plan actual activo</div>) : (<button onClick={() => handleActivate(pk)} className={c.bg + " w-full py-3 text-white rounded-xl text-sm font-black hover:opacity-90 transition"}>{_isAdmin(currentUser?.role) ? "Activar Plan Clinica" : "Contactar para activar"}</button>)}</div>
              </div>
            );
          })()}
          <div className="rounded-2xl border-2 border-dashed border-purple-200 bg-purple-50/50 p-6 flex flex-col justify-center items-center text-center gap-3">
            <span className="text-4xl">&#x1F91D;</span>
            <p className="font-black text-purple-800">Necesita un plan personalizado?</p>
            <p className="text-xs text-purple-600">Para IPS grandes, multiples sedes o necesidades especificas, ofrecemos planes a medida.</p>
            <button onClick={() => showAlert("Para un plan personalizado, comuniquese al:\n\nsiso@ocupasalud.com\n+57 300 XXX XXXX")} className="px-5 py-2.5 bg-purple-700 text-white text-sm font-black rounded-xl hover:bg-purple-800 transition">Solicitar cotizacion</button>
          </div>
        </div>
      </div>
      {/* Tabla comparativa */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-8">
        <div className="px-4 py-3 border-b border-gray-100"><h2 className="font-black text-gray-800 text-sm">Comparacion detallada de funciones</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="bg-gray-50"><th className="text-left px-4 py-3 font-black text-gray-600 w-1/3">Funcion</th>
              {planOrder.map(pk => <th key={pk} className={"text-center px-3 py-3 font-black " + planColors2[pk].text + (pk === currentPlan ? " bg-blue-50" : "")}>{PLAN_CONFIG[pk].label}</th>)}
            </tr></thead>
            <tbody>{features.map((f, i) => (<tr key={f.label} className={i % 2 === 0 ? "bg-white" : "bg-gray-50/40"}><td className="px-4 py-2 text-gray-700 font-bold">{f.label}</td>
              {planOrder.map(pk => <td key={pk} className={"text-center px-3 py-2" + (pk === currentPlan ? " bg-blue-50/50" : "")}>{renderCell(f[pk])}</td>)}
            </tr>))}</tbody>
          </table>
        </div>
      </div>
      {/* FAQ */}
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 text-xs space-y-2">
        <p className="font-black text-amber-800 text-sm">Preguntas frecuentes</p>
        {[["Mis datos se borran si no pago?", "No. Sus HC, pacientes y empresas siempre son suyos."],["Hay permanencia?", "No. Puede cancelar cuando quiera sin penalidad."],["Puedo bajar de plan?", "Si. El plan Libre siempre esta disponible."],["Como pago?", "Transferencia, Nequi o Daviplata. Comuniquese con el administrador."]].map(([q, a]) => (<div key={q}><p className="font-bold text-amber-800">{q}</p><p className="text-amber-700 ml-3">{a}</p></div>))}
      </div>
    </div>
  );
}
