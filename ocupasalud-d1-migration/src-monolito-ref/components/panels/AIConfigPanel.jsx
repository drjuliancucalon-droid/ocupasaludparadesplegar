// src/components/panels/AIConfigPanel.jsx
import React, { useState } from 'react';
import { AI_PROVIDERS } from '../../utils/aiProviders.js';
import { _ss } from '../../utils/storage.js';
import { Eye, Lock, X, Sparkles, BrainCircuit, CheckCircle2, AlertCircle, GraduationCap, Shield } from 'lucide-react';

const AIConfigPanel = ({ aiConfig, onSave, onClose }) => {
  const [cfg, setCfg] = useState(() => ({
    ...aiConfig,
    keys: { ...aiConfig.keys },
  }));
  const [testStatus, setTestStatus] = useState({});
  const [showKey, setShowKey] = useState({});
  const [activeGuide, setActiveGuide] = useState(null);
  const PROVIDER_INFO = {
    gemini: {
      label: "Google Gemini",
      sub: "2.0 Flash · 1.5 Flash",
      badge: "🟢 Gratis · Alta calidad",
      badgeClass: "bg-blue-100 text-blue-800",
      link: "https://aistudio.google.com/apikey",
      color: "blue",
      steps: [
        "1️⃣ Haz clic en el botón 'Obtener key →' de abajo",
        "2️⃣ Inicia sesión con tu cuenta de Google (Gmail)",
        "3️⃣ Aparecerá el panel de 'API Keys'. Clic en 'Create API Key'",
        "4️⃣ Selecciona 'Create API key in new project' (es gratis)",
        "5️⃣ Se genera una key que empieza con 'AIza...' → cópiala",
        "6️⃣ Regresa aquí, pégala en el campo y presiona 'Probar'",
        "💡 Tip: Gemini es el más recomendado por calidad y velocidad",
      ],
    },
    groq: {
      label: "Groq",
      sub: "Llama 3.3 70B · Ultra-rápido",
      badge: "🟢 Gratis · Más rápido",
      badgeClass: "bg-green-100 text-green-800",
      link: "https://console.groq.com/keys",
      color: "green",
      steps: [
        "1️⃣ Haz clic en el botón 'Obtener key →' de abajo",
        "2️⃣ Crea cuenta gratis con Google o GitHub (botón 'Sign Up')",
        "3️⃣ Una vez dentro, ya estarás en la sección 'API Keys'",
        "4️⃣ Clic en 'Create API Key' → ponle cualquier nombre → 'Submit'",
        "5️⃣ Copia la key que empieza con 'gsk_...'",
        "6️⃣ Regresa aquí, pégala en el campo y presiona 'Probar'",
        "💡 Tip: Groq es el más rápido pero tiene límite de 30 peticiones/minuto",
      ],
    },
    together: {
      label: "Together AI",
      sub: "Llama 3.3 70B · Muy estable",
      badge: "🟢 Gratis · Sin límite diario",
      badgeClass: "bg-teal-100 text-teal-800",
      link: "https://api.together.ai/settings/api-keys",
      color: "teal",
      steps: [
        "1️⃣ Haz clic en el botón 'Obtener key →' de abajo",
        "2️⃣ Clic en 'Sign Up' o 'Continue with Google' (cuenta gratis)",
        "3️⃣ En el panel, ve a Settings → API Keys (menú izquierdo)",
        "4️⃣ Clic en 'Create new API key' → ponle nombre → crear",
        "5️⃣ Copia la key que aparece (solo se muestra una vez)",
        "6️⃣ Regresa aquí, pégala en el campo y presiona 'Probar'",
        "💡 Tip: Together AI no tiene límite diario. Ideal como respaldo",
      ],
    },
    openrouter: {
      label: "OpenRouter",
      sub: "10 modelos free · Máximo respaldo",
      badge: "🟢 Gratis · Multi-modelo",
      badgeClass: "bg-purple-100 text-purple-800",
      link: "https://openrouter.ai/keys",
      color: "purple",
      steps: [
        "1️⃣ Haz clic en el botón 'Obtener key →' de abajo",
        "2️⃣ Clic en 'Sign in' → usa tu cuenta de Google o GitHub",
        "3️⃣ En el menú superior, clic en 'Keys'",
        "4️⃣ Clic en 'Create Key' → ponle nombre → 'Create'",
        "5️⃣ Copia la key que empieza con 'sk-or-...'",
        "6️⃣ Regresa aquí, pégala en el campo y presiona 'Probar'",
        "💡 Tip: OpenRouter da acceso a múltiples modelos con una sola key",
      ],
    },
  };
  const colorMap = {
    blue: {
      border: "border-blue-400",
      bg: "bg-blue-50",
      text: "text-blue-700",
      btn: "bg-blue-600 hover:bg-blue-700",
      ring: "ring-blue-400",
    },
    green: {
      border: "border-green-400",
      bg: "bg-green-50",
      text: "text-green-700",
      btn: "bg-green-600 hover:bg-green-700",
      ring: "ring-green-400",
    },
    teal: {
      border: "border-teal-400",
      bg: "bg-teal-50",
      text: "text-teal-700",
      btn: "bg-teal-600 hover:bg-teal-700",
      ring: "ring-teal-400",
    },
    purple: {
      border: "border-purple-400",
      bg: "bg-purple-50",
      text: "text-purple-700",
      btn: "bg-purple-600 hover:bg-purple-700",
      ring: "ring-purple-400",
    },
  };
  const testProvider = async (providerKey) => {
    const key = cfg.keys?.[providerKey];
    if (!key || !key.trim()) {
      setTestStatus((p) => ({
        ...p,
        [providerKey]: {
          ok: false,
          msg: "⚠️ Ingrese su API Key primero (ver pasos arriba)",
        },
      }));
      setActiveGuide(providerKey);
      return;
    }
    setTestStatus((p) => ({
      ...p,
      [providerKey]: { ok: null, msg: "⏳ Probando conexión..." },
    }));
    try {
      const provider = AI_PROVIDERS[providerKey];
      const text = await provider.call(
        "Responde SOLO con la palabra: CONECTADO",
        "Eres un asistente. Responde únicamente con la palabra CONECTADO.",
        key.trim()
      );
      const ok = !!text && text.length > 0;
      setTestStatus((p) => ({
        ...p,
        [providerKey]: {
          ok,
          msg: ok
            ? `✅ ¡Funciona! Respuesta: "${text
                .slice(0, 40)
                .replace(/\n/g, " ")}"`
            : "⚠️ Respuesta vacía",
        },
      }));
    } catch (e) {
      const msg = e.message || "";
      let hint = "";
      if (
        msg.includes("401") ||
        msg.includes("403") ||
        msg.includes("invalid") ||
        msg.includes("Invalid") ||
        msg.includes("API Key inválida")
      )
        hint =
          providerKey === "together"
            ? " → Key inválida. En api.together.ai copia SOLO la key del campo texto, NO el código Python."
            : " → Key inválida: renuévala siguiendo los pasos.";
      else if (
        msg.includes("429") ||
        msg.includes("rate") ||
        msg.includes("limit")
      )
        hint = " → Límite de uso alcanzado: crea una key nueva.";
      else if (
        msg.includes("Failed to fetch") ||
        msg.includes("network") ||
        msg.includes("CORS") ||
        msg.includes("CORS bloqueado")
      )
        hint =
          " → CORS bloqueado: Groq no funciona desde este dominio. Usa Gemini u OpenRouter como proveedor principal.";
      else if (msg.includes("404"))
        hint = " → Modelo no disponible, prueba otro proveedor.";
      setTestStatus((p) => ({
        ...p,
        [providerKey]: { ok: false, msg: `❌ ${msg.slice(0, 100)}${hint}` },
      }));
    }
  };
  const anyWorking = Object.values(testStatus).some((s) => s.ok === true);
  return (
    <div
      className="fixed inset-0 bg-black/70 flex items-center justify-center z-[200] p-3"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-xl overflow-hidden flex flex-col"
        style={{ maxHeight: "92vh" }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-700 p-4 text-white flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <BrainCircuit className="w-6 h-6" />
              <div>
                <h2 className="text-base font-black">
                  Configuración de IA - 4 Proveedores Gratuitos
                </h2>
                <p className="text-xs text-indigo-200">
                  Cada uno necesita su propia API Key gratuita (se obtiene en 2
                  min)
                </p>
              </div>
            </div>
            <button onClick={onClose}>
              <X className="w-5 h-5 text-white/70 hover:text-white" />
            </button>
          </div>
        </div>
        <div className="overflow-y-auto flex-1">
          <div className="p-4 space-y-3">
            {/* Estado general */}
            {anyWorking ? (
              <div className="bg-green-50 border border-green-300 rounded-xl p-3 text-xs text-green-800 flex gap-2 items-start">
                <span className="text-base">✅</span>
                <div>
                  <strong>¡Al menos un proveedor funciona!</strong> La IA está
                  operativa. Guarda la configuración para usar los que funcionan
                  como respaldo automático.
                </div>
              </div>
            ) : (
              <div className="bg-amber-50 border border-amber-300 rounded-xl p-3 text-xs text-amber-900 flex gap-2 items-start">
                <span className="text-base">⚡</span>
                <div>
                  <strong>
                    Las keys preconfiguradas pueden haber expirado
                  </strong>{" "}
                  (son públicas y se agotan con el uso).
                  <span className="block mt-1">
                    Obtén tu propia key gratuita en cualquier proveedor - toma
                    solo 2 minutos. Haz clic en{" "}
                    <strong>"📋 Cómo obtener"</strong> de cualquier proveedor
                    para ver los pasos.
                  </span>
                </div>
              </div>
            )}
            {/* Selector proveedor activo */}
            <div>
              <p className="text-[10px] font-black text-gray-500 uppercase tracking-wide mb-1.5">
                Proveedor principal (los demás son respaldo automático)
              </p>
              <div className="grid grid-cols-2 gap-1.5">
                {Object.entries(PROVIDER_INFO).map(([k, info]) => {
                  const st = testStatus[k];
                  return (
                    <button
                      key={k}
                      type="button"
                      onClick={() =>
                        setCfg((p) => ({ ...p, activeProvider: k }))
                      }
                      className={`flex items-center gap-2 p-2 rounded-xl border-2 text-left transition ${
                        cfg.activeProvider === k
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-200 hover:border-gray-300"
                      }`}
                    >
                      <div
                        className={`w-3 h-3 rounded-full border-2 flex-shrink-0 flex items-center justify-center ${
                          cfg.activeProvider === k
                            ? "border-indigo-500 bg-indigo-500"
                            : "border-gray-300"
                        }`}
                      >
                        {cfg.activeProvider === k && (
                          <div className="w-1.5 h-1.5 rounded-full bg-white" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-black text-gray-800">
                          {info.label}
                        </p>
                        <p className="text-[9px] text-gray-500 truncate">
                          {info.sub}
                        </p>
                      </div>
                      {st && (
                        <span
                          className={`w-2 h-2 rounded-full flex-shrink-0 ${
                            st.ok === true
                              ? "bg-green-500"
                              : st.ok === false
                              ? "bg-red-400"
                              : "bg-yellow-400"
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
            {/* Cards de proveedores */}
            {Object.entries(PROVIDER_INFO).map(([k, info]) => {
              const c = colorMap[info.color];
              const st = testStatus[k];
              const isGuideOpen = activeGuide === k;
              return (
                <div
                  key={k}
                  className={`rounded-xl border-2 overflow-hidden ${
                    cfg.activeProvider === k ? c.border : "border-gray-200"
                  }`}
                >
                  {/* Header de la card */}
                  <div
                    className={`flex justify-between items-center p-2.5 ${
                      cfg.activeProvider === k ? c.bg : "bg-gray-50"
                    }`}
                  >
                    <div>
                      <span className="text-xs font-black text-gray-800">
                        {info.label}
                      </span>
                      <span
                        className={`ml-2 text-[9px] px-1.5 py-0.5 rounded-full font-bold ${info.badgeClass}`}
                      >
                        {info.badge}
                      </span>
                      {st?.ok === true && (
                        <span className="ml-1 text-[9px] font-bold text-green-600">
                          ✅ Activa
                        </span>
                      )}
                      {st?.ok === false && (
                        <span className="ml-1 text-[9px] font-bold text-red-600">
                          ❌ Falla
                        </span>
                      )}
                    </div>
                    <div className="flex gap-1.5 items-center">
                      <button
                        type="button"
                        onClick={() => setActiveGuide(isGuideOpen ? null : k)}
                        className={`text-[9px] px-2 py-1 rounded-lg font-bold border transition ${
                          isGuideOpen
                            ? c.btn + " text-white"
                            : "border-gray-300 text-gray-600 hover:bg-gray-100"
                        }`}
                      >
                        📋 {isGuideOpen ? "Ocultar" : "Cómo obtener"}
                      </button>
                      <a
                        href={info.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`text-[9px] px-2 py-1 rounded-lg font-bold ${c.btn} text-white`}
                      >
                        🔗 Obtener key
                      </a>
                    </div>
                  </div>
                  {/* Guía paso a paso */}
                  {isGuideOpen && (
                    <div className={`p-3 border-t ${c.bg}`}>
                      <p
                        className={`text-[10px] font-black ${c.text} uppercase mb-2`}
                      >
                        Pasos para obtener tu key gratuita:
                      </p>
                      <ol className="space-y-1">
                        {info.steps.map((step, i) => (
                          <li key={i} className="flex gap-2 items-start">
                            <span
                              className={`flex-shrink-0 w-4 h-4 rounded-full ${c.btn} text-white text-[9px] font-black flex items-center justify-center`}
                            >
                              {i + 1}
                            </span>
                            <span className="text-[10px] text-gray-700">
                              {step}
                            </span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                  {/* Input de key */}
                  <div className="p-2.5 bg-white">
                    <div className="relative flex gap-1.5">
                      <input
                        type={showKey[k] ? "text" : "password"}
                        placeholder={`Pega aquí tu API Key de ${info.label}...`}
                        value={cfg.keys?.[k] || ""}
                        onChange={(e) =>
                          setCfg((p) => ({
                            ...p,
                            keys: { ...p.keys, [k]: e.target.value },
                          }))
                        }
                        className="flex-1 pr-7 p-1.5 border border-gray-200 rounded-lg text-[10px] font-mono focus:ring-2 focus:ring-indigo-400 outline-none"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          setShowKey((p) => ({ ...p, [k]: !p[k] }))
                        }
                        className="absolute right-20 top-1.5 text-gray-400 hover:text-gray-600 text-[10px]"
                      >
                        {showKey[k] ? "🙈" : "👁"}
                      </button>
                      <button
                        type="button"
                        onClick={() => testProvider(k)}
                        className={`flex-shrink-0 text-[10px] px-3 py-1.5 rounded-lg font-black text-white flex items-center gap-1 ${c.btn}`}
                      >
                        <Activity className="w-2.5 h-2.5" /> Probar
                      </button>
                    </div>
                    {st && (
                      <p
                        className={`text-[10px] mt-1.5 font-bold rounded-lg px-2 py-1 leading-tight ${
                          st.ok === null
                            ? "text-blue-700 bg-blue-50"
                            : st.ok
                            ? "text-green-700 bg-green-50"
                            : "text-red-700 bg-red-50"
                        }`}
                      >
                        {st.msg}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        {/* Footer fijo */}
        <div className="flex gap-2 p-4 border-t bg-white flex-shrink-0">
          <button
            onClick={onClose}
            className="py-2 px-4 border-2 border-gray-300 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-100"
          >
            Cancelar
          </button>
          <button
            onClick={() => {
              onSave(cfg);
              onClose();
            }}
            className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" /> Guardar Configuración
          </button>
        </div>
      </div>
    </div>
  );
};

export default AIConfigPanel;
