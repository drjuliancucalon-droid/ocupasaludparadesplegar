// src/utils/aiProviders.js - Proveedores de IA Multi-Proveedor

const AI_CONFIG_VERSION = "2026-03-v2";
const fetchWithTimeout = (url, opts, ms = 40000) => {
  const ctrl = new AbortController();
  const id = setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...opts, signal: ctrl.signal }).finally(() =>
    clearTimeout(id)
  );
};
const AI_PROVIDERS = {
  // ── 1. GEMINI - API Google, CORS nativo, más estable en browsers externos ─
  gemini: {
    name: "Google Gemini",
    free: true,
    badge: "🟢 Gratis · Alta calidad",
    docs: "aistudio.google.com",
    hint: "Key gratuita: aistudio.google.com → Get API Key",
    link: "https://aistudio.google.com/apikey",
    call: async (prompt, systemPrompt, apiKey) => {
      if (!apiKey)
        throw new Error(
          "Gemini: API Key no configurada - obtenla gratis en aistudio.google.com/apikey"
        );
      // Modelos verificados activos marzo 2026 (Gemini 1.5 retirado → 404)
      const tryModels = [
        "gemini-2.5-flash",
        "gemini-2.5-flash-lite",
        "gemini-2.0-flash",
        "gemini-2.0-flash-lite",
      ];
      let lastErr = null;
      for (const model of tryModels) {
        try {
          const res = await fetchWithTimeout(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: [{ role: "user", parts: [{ text: prompt }] }],
                generationConfig: {
                  maxOutputTokens: 4096,
                  temperature: 0.3,
                  ...(systemPrompt.includes("ÚNICAMENTE CON JSON") ||
                  systemPrompt.includes("ÚNICAMENTE JSON")
                    ? { responseMimeType: "application/json" }
                    : {}),
                },
              }),
            }
          );
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            const msg = errData?.error?.message || res.statusText;
            lastErr = new Error(`Gemini/${model} [${res.status}]: ${msg}`);
            // 401/403 = key inválida | 400 solo si mensaje indica key inválida
            if (res.status === 401 || res.status === 403) break;
            if (
              res.status === 400 &&
              (msg.includes("API_KEY_INVALID") ||
                msg.includes("not valid") ||
                msg.includes("API key"))
            )
              break;
            continue; // 404 = modelo no disponible → probar siguiente
          }
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text?.trim().length > 5) return text.trim();
          lastErr = new Error(`Gemini/${model}: respuesta vacía`);
        } catch (e) {
          if (e.name === "AbortError") {
            lastErr = new Error(`Gemini/${model}: timeout (40s)`);
            continue;
          }
          lastErr = e;
        }
      }
      throw (
        lastErr ||
        new Error(
          "Gemini: todos los modelos fallaron - renueva tu key en aistudio.google.com/apikey"
        )
      );
    },
  },
  // ── 2. GROQ - Velocidad máxima, CORS habilitado explícitamente ────────────
  groq: {
    name: "Groq",
    free: true,
    badge: "🟢 Gratis · Ultrarrápido",
    docs: "console.groq.com",
    hint: "Key gratuita: console.groq.com → API Keys → Create API Key",
    link: "https://console.groq.com/keys",
    call: async (prompt, systemPrompt, apiKey) => {
      if (!apiKey)
        throw new Error(
          "Groq: API Key no configurada - obtenla gratis en console.groq.com/keys"
        );
      const tryModels = [
        "llama-3.3-70b-versatile",
        "llama-3.1-8b-instant",
        "gemma2-9b-it",
        "llama-3.1-70b-versatile",
        "llama3-70b-8192",
      ];
      let lastErr = null;
      for (const model of tryModels) {
        try {
          const res = await fetchWithTimeout(
            "https://api.groq.com/openai/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model,
                max_tokens: 4096,
                temperature: 0.3,
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: prompt },
                ],
              }),
            }
          );
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            const msg = errData?.error?.message || res.statusText;
            lastErr = new Error(`Groq/${model} [${res.status}]: ${msg}`);
            if (res.status === 401 || res.status === 403) break;
            continue; // 404/429 → probar siguiente modelo
          }
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content;
          if (text?.trim().length > 5) return text.trim();
          lastErr = new Error(`Groq/${model}: respuesta vacía`);
        } catch (e) {
          if (e.name === "AbortError") {
            lastErr = new Error(`Groq/${model}: timeout`);
            continue;
          }
          if (e.message === "Failed to fetch") {
            lastErr = new Error(
              `Groq: no se pudo conectar a api.groq.com - verifica tu red o renueva tu key en console.groq.com/keys`
            );
            break; // error de red = no tiene sentido intentar más modelos
          }
          lastErr = e;
        }
      }
      throw (
        lastErr ||
        new Error(
          "Groq: todos los modelos fallaron - renueva tu key en console.groq.com/keys"
        )
      );
    },
  },
  // ── 3. TOGETHER AI - Llama 3.3 70B 100% gratis, robusto ─────────────────
  together: {
    name: "Together AI",
    free: true,
    badge: "🟢 Gratis · Muy estable",
    docs: "api.together.ai",
    hint: "Key gratuita: api.together.ai → Settings → API Keys - copia la key que empieza por letras/números (NO el código Python)",
    link: "https://api.together.ai",
    call: async (prompt, systemPrompt, apiKey) => {
      if (!apiKey)
        throw new Error(
          "Together AI: API Key no configurada - obtenla gratis en api.together.ai → Settings → API Keys"
        );
      // Modelos gratuitos verificados Together AI - marzo 2026
      // NOTA: los sufijos -Free fueron deprecados; ahora el acceso free
      // es por tier de cuenta, no por nombre de modelo
      const tryModels = [
        "meta-llama/Llama-3.3-70B-Instruct-Turbo",
        "meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo",
        "meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo",
        "mistralai/Mistral-7B-Instruct-v0.3",
        "togethercomputer/llama-2-70b-chat",
      ];
      let lastErr = null;
      for (const model of tryModels) {
        try {
          const res = await fetchWithTimeout(
            "https://api.together.ai/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
              },
              body: JSON.stringify({
                model,
                max_tokens: 4096,
                temperature: 0.3,
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: prompt },
                ],
              }),
            }
          );
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            const msg = errData?.error?.message || res.statusText;
            lastErr = new Error(`Together/${model} [${res.status}]: ${msg}`);
            if (res.status === 401 || res.status === 403) {
              // Key inválida - no tiene sentido seguir probando modelos
              throw new Error(
                `Together AI [401]: API Key inválida. Ve a api.together.ai → Settings → API Keys y copia SOLO la key (texto largo, no el código Python).`
              );
            }
            continue;
          }
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content;
          if (text?.trim().length > 5) return text.trim();
          lastErr = new Error(`Together/${model}: respuesta vacía`);
        } catch (e) {
          if (e.message?.includes("API Key inválida")) throw e; // re-throw 401 immediately
          if (e.name === "AbortError") {
            lastErr = new Error(`Together/${model}: timeout`);
            continue;
          }
          lastErr = e;
        }
      }
      throw (
        lastErr ||
        new Error(
          "Together AI: todos los modelos fallaron - renueva tu key en api.together.ai"
        )
      );
    },
  },
  // ── 4. OPENROUTER - Multi-modelo, fallback máximo ─────────────────────────
  openrouter: {
    name: "OpenRouter",
    free: true,
    badge: "🟢 Gratis · Multi-modelo",
    docs: "openrouter.ai",
    hint: "Key gratuita: openrouter.ai → Keys → Create Key (login con Google)",
    link: "https://openrouter.ai/keys",
    call: async (prompt, systemPrompt, apiKey) => {
      if (!apiKey)
        throw new Error(
          "OpenRouter: API Key no configurada - obtenla gratis en openrouter.ai/keys"
        );
      // Modelos free VERIFICADOS activos en OpenRouter - marzo 2026
      // (si alguno da 404, el código pasa automáticamente al siguiente)
      const tryModels = [
        "openrouter/auto",
        "meta-llama/llama-3.3-70b-instruct:free",
        "deepseek/deepseek-r1-zero:free",
        "deepseek/deepseek-chat-v3-0324:free",
        "mistralai/mistral-small-3.1-24b-instruct:free",
        "qwen/qwen3-235b-a22b:free",
        "qwen/qwen3-30b-a3b:free",
        "nvidia/llama-3.3-nemotron-super-49b-v1:free",
        "arcee-ai/arcee-blitz:free",
        "google/gemini-2.5-pro-exp-03-25:free",
      ];
      let lastErr = null;
      for (const model of tryModels) {
        try {
          const res = await fetchWithTimeout(
            "https://openrouter.ai/api/v1/chat/completions",
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${apiKey}`,
                "HTTP-Referer":
                  typeof window !== "undefined"
                    ? window.location.origin
                    : "https://ocupasalud.app",
                "X-Title": "OCUPASALUD Medico Ocupacional",
              },
              body: JSON.stringify({
                model,
                max_tokens: 4096,
                temperature: 0.3,
                messages: [
                  { role: "system", content: systemPrompt },
                  { role: "user", content: prompt },
                ],
              }),
            }
          );
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            const msg = errData?.error?.message || res.statusText;
            lastErr = new Error(`OpenRouter/${model} [${res.status}]: ${msg}`);
            if (res.status === 401 || res.status === 403) break; // key inválida
            continue; // 404 = modelo deprecado → probar siguiente
          }
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content;
          if (text?.trim().length > 5) return text.trim();
          lastErr = new Error(`OpenRouter/${model}: respuesta vacía`);
        } catch (e) {
          if (e.name === "AbortError") {
            lastErr = new Error(`OpenRouter/${model}: timeout`);
            continue;
          }
          lastErr = e;
        }
      }
      throw (
        lastErr ||
        new Error(
          "OpenRouter: todos los modelos fallaron - renueva tu key en openrouter.ai/keys"
        )
      );
    },
  },
};
const parseAIJSON = (raw) => {
  if (!raw) throw new Error("Respuesta vacía");
  let clean = raw
    .replace(/^\uFEFF/, "")
    .replace(/```json\s*/gi, "")
    .replace(/```\s*/g, "")
    .trim();
  const objS = clean.indexOf("{");
  const objE = clean.lastIndexOf("}");
  const arrS = clean.indexOf("[");
  const arrE = clean.lastIndexOf("]");
  if (objS !== -1 && objE > objS) clean = clean.substring(objS, objE + 1);
  else if (arrS !== -1 && arrE > arrS) clean = clean.substring(arrS, arrE + 1);
  try {
    return JSON.parse(clean);
  } catch (_) {}
  // Fix "Unterminated string" - la IA devuelve \n literales dentro de strings JSON
  const escapeCtrl = (s) => {
    const out = [];
    let inStr = false;
    let esc = false;
    for (let ix = 0; ix < s.length; ix++) {
      const ch = s[ix];
      const code = ch.charCodeAt(0);
      if (esc) {
        out.push(ch);
        esc = false;
        continue;
      }
      if (code === 92) {
        out.push(ch);
        esc = true;
        continue;
      }
      if (code === 34) {
        out.push(ch);
        inStr = !inStr;
        continue;
      }
      if (inStr && code === 10) {
        out.push("\\n");
        continue;
      }
      if (inStr && code === 13) {
        continue;
      }
      if (inStr && code === 9) {
        out.push("\\t");
        continue;
      }
      if (inStr && code < 32) {
        out.push(" ");
        continue;
      }
      out.push(ch);
    }
    return out.join("");
  };
  let repaired = escapeCtrl(clean);
  try {
    return JSON.parse(repaired);
  } catch (_) {}
  repaired = repaired
    .replace(/,\s*([}\]])/g, "$1")
    .replace(/([{,]\s*)'([^']+)'\s*:/g, '$1"$2":');
  try {
    return JSON.parse(repaired);
  } catch (_) {}
  let fixed = repaired
    .replace(/,?\s*"[^"]*":\s*"[^"]*$/, "")
    .replace(/,?\s*"[^"]*":\s*\[[^\]]*$/, "")
    .replace(/,?\s*"[^"]*$/, "");
  const opens =
    (fixed.match(/{/g) || []).length - (fixed.match(/}/g) || []).length;
  const arrOpens =
    (fixed.match(/\[/g) || []).length - (fixed.match(/\]/g) || []).length;
  fixed += "]".repeat(Math.max(0, arrOpens)) + "}".repeat(Math.max(0, opens));
  try {
    return JSON.parse(fixed);
  } catch (_) {}
  const result = {};
  const fieldRe = /"(\w+)"\s*:\s*"((?:[^"\\]|\\.)*)"/g;
  let fm;
  while ((fm = fieldRe.exec(repaired)) !== null)
    result[fm[1]] = fm[2].replace(/\\n/g, "\n");
  if (Object.keys(result).length > 0) return result;
  throw new Error("JSON irreparable: " + raw.substring(0, 80));
};

export { AI_PROVIDERS, AI_CONFIG_VERSION, fetchWithTimeout, parseAIJSON };
