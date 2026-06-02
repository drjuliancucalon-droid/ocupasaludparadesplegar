// src/utils/security.js - Port Monolito Security (App.jsx líneas 1-500)
// SEC-U1 a SEC-U5 + helpers inline

// SEC-U1: Sanitización inputs XSS
export const sanitizeInput = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
};

// SEC-U2: Password strength
export const validatePasswordStrength = (password) => {
  const errors = [];
  if (!password || password.length < 8) errors.push('Mínimo 8 caracteres');
  if (!/[A-Z]/.test(password)) errors.push('Al menos una mayúscula');
  if (!/[a-z]/.test(password)) errors.push('Al menos una minúscula');
  if (!/[0-9]/.test(password)) errors.push('Al menos un número');
  return { valid: errors.length === 0, errors };
};

// SEC-U3: Audit logger localStorage (200 logs max)
export const auditLog = (action, user, detail = '') => {
  try {
    const logs = JSON.parse(localStorage.getItem('siso_audit_log') || '[]');
    logs.push({
      ts: new Date().toISOString(),
      action: sanitizeInput(String(action)),
      user: sanitizeInput(String(user || 'anonymous')),
      detail: sanitizeInput(String(detail)),
      ua: navigator.userAgent.substring(0, 80),
    });
    if (logs.length > 200) logs.splice(0, logs.length - 200);
    localStorage.setItem('siso_audit_log', JSON.stringify(logs));
  } catch (_) {}
};

// SEC-U4: Login rate-limit (5 att/15min)
export const loginRL = {
  maxAttempts: 5,
  blockMinutes: 15,
  getKey: () => 'siso_rl_login',
  get: () => {
    try { 
      return JSON.parse(localStorage.getItem('siso_rl_login') || '{"attempts":0,"blockedUntil":0}'); 
    } catch { 
      return {attempts:0,blockedUntil:0}; 
    }
  },
  set: (data) => { 
    try { 
      localStorage.setItem('siso_rl_login', JSON.stringify(data)); 
    } catch {} 
  },
  isBlocked: () => {
    const d = loginRL.get();
    return d.blockedUntil && Date.now() < d.blockedUntil;
  },
  getRemainingMin: () => Math.ceil((loginRL.get().blockedUntil - Date.now()) / 60000),
  recordFailure: () => {
    const d = loginRL.get();
    d.attempts = (d.attempts || 0) + 1;
    if (d.attempts >= loginRL.maxAttempts) {
      d.blockedUntil = Date.now() + loginRL.blockMinutes * 60000;
      d.attempts = 0;
    }
    loginRL.set(d);
  },
  reset: () => loginRL.set({attempts: 0, blockedUntil: 0}),
};

// SEC-U5: Session timeout 30min
export const SESSION_TIMEOUT_MS = 30 * 60 * 1000;
let sessionTimer = null;
export const resetSessionTimer = (logoutCallback) => {
  if (sessionTimer) clearTimeout(sessionTimer);
  sessionTimer = setTimeout(() => logoutCallback?.(), SESSION_TIMEOUT_MS);
};
export const clearSessionTimer = () => {
  if (sessionTimer) { clearTimeout(sessionTimer); sessionTimer = null; }
};

// SEC-07: Supabase rate-limit
export const sbRlCheck = () => {
  const now = Date.now();
  if (now > sbRl.reset) {
    sbRl.count = 0;
    sbRl.reset = now + 60000;
  }
  sbRl.count++;
  if (sbRl.count > 120) {
    console.warn("[SISO SEC] Rate limit alcanzado");
    return false;
  }
  return true;
};

// SEC-FIX-02: Logo URL safe (no javascript:)
export const safeLogoUrl = (url) => {
  if (!url) return "";
  const u = String(url).trim();
  if (u.startsWith("data:image/") || u.startsWith("https://") || u.startsWith("http://")) return u;
  return "";
};

// PBKDF2 + SHA-256 (monolito líneas 200-300)
export const sha256 = async (str) => {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, "0")).join("");
};

export const pbkdf2Hash = async (password, saltHex) => {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey("raw", enc.encode(password), { name: "PBKDF2" }, false, ["deriveBits"]);
  const saltBytes = saltHex ? new Uint8Array(saltHex.match(/../g).map(h => parseInt(h, 16))) : crypto.getRandomValues(new Uint8Array(16));
  const derivedBits = await crypto.subtle.deriveBits({ name: "PBKDF2", salt: saltBytes, iterations: 100000, hash: "SHA-256" }, keyMaterial, 256);
  const hashHex = Array.from(new Uint8Array(derivedBits)).map(b => b.toString(16).padStart(2, "0")).join("");
  const saltHexOut = Array.from(saltBytes).map(b => b.toString(16).padStart(2, "0")).join("");
  return { hash: hashHex, salt: saltHexOut };
};

export const verifyPassword = async (password, storedHash, storedSalt) => {
  if (!storedSalt) return (await sha256(password)) === storedHash;
  const { hash } = await pbkdf2Hash(password, storedSalt);
  return hash === storedHash;
};

// Export all (use in App.jsx/utils)
export const sbRl = { count: 0, reset: Date.now() + 60000 };

