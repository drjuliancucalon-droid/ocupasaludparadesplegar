// siso-appultimo/src/shared/lib/security_utils.js
// Extracción de utilidades de seguridad y almacenamiento desde el núcleo de OcupaSalud

/**
 * SEC-U1: Sanitización de inputs para prevenir XSS
 * @param {string} str - El string a sanitizar
 * @returns {string} - El string limpio
 */
export const sanitizeInput = (str) => {
  if (typeof str !== 'string') return str;
  return str
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;')
    .trim();
};

/**
 * SEC-U2: Validación fuerte de contraseña
 * @param {string} password - La contraseña a validar
 * @returns {{valid: boolean, errors: array}}
 */
export const validatePasswordStrength = (password) => {
  const errors = [];
  if (!password || password.length < 8) errors.push('Mínimo 8 caracteres');
  if (!/[A-Z]/.test(password)) errors.push('Al menos una mayúscula');
  if (!/[a-z]_.test(password)) errors.push('Al menos una minúscula');
  if (!/[0-9]/.test(password)) errors.push('Al menos un número');
  return { valid: errors.length === 0, errors };
};

/**
 * Utilidades de almacenamiento (Adaptación de _ls y _ss del monolito)
 */
export const storageUtils = {
  localStorage: {
    get: (k) => {
      try { return localStorage.getItem(k); } catch { return null; }
    },
    set: (k, v) => {
      try { localStorage.setItem(k, String(v)); } catch {}
    },
    remove: (k) => {
      try { localStorage.removeItem(k); } catch {}
    }
  },
  sessionStorage: {
    get: (k) => {
      try { return sessionStorage.getItem(k); } catch { return null; }
    },
    set: (k, v) => {
      try { sessionStorage.setItem(k, String(v)); } catch {}
    },
    remove: (k) => {
      try { sessionStorage.removeItem(k); } catch {}
    }
  }
};