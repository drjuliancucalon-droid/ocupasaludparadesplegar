import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * useAuth - Hook para manejo de autenticación
 * Session timeout, role checks, login/logout
 * Normativa: Res. 3100/2019 - Seguridad en sistemas de información
 */

const SESSION_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutos
const MAX_LOGIN_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 5 * 60 * 1000; // 5 minutos

const _isAdmin = (role) => role === 'administrador' || role === 'super_admin';
const _isAdminEmpresa = (role) => role === 'admin_empresa';
const _isEmpresaUser = (user) => !!user?.empresaId;
const _isAdminOrEmpresa = (role) => _isAdmin(role) || _isAdminEmpresa(role);

export const useAuth = ({ onSessionExpired } = {}) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loginAttempts, setLoginAttempts] = useState(0);
  const [blockedUntil, setBlockedUntil] = useState(null);
  const [mustChangePassword, setMustChangePassword] = useState(false);
  const [twoFARequired, setTwoFARequired] = useState(false);
  const sessionTimerRef = useRef(null);

  // Session timeout management
  const resetSessionTimer = useCallback(() => {
    if (sessionTimerRef.current) clearTimeout(sessionTimerRef.current);
    sessionTimerRef.current = setTimeout(() => {
      logout();
      if (onSessionExpired) onSessionExpired();
    }, SESSION_TIMEOUT_MS);
  }, [onSessionExpired]);

  const clearSessionTimer = useCallback(() => {
    if (sessionTimerRef.current) {
      clearTimeout(sessionTimerRef.current);
      sessionTimerRef.current = null;
    }
  }, []);

  // Setup activity listeners for session refresh
  useEffect(() => {
    if (!isAuthenticated) return;
    const events = ['mousedown', 'keydown', 'scroll', 'touchstart'];
    const handler = () => resetSessionTimer();
    events.forEach((e) => document.addEventListener(e, handler, { passive: true }));
    resetSessionTimer();
    return () => {
      events.forEach((e) => document.removeEventListener(e, handler));
      clearSessionTimer();
    };
  }, [isAuthenticated, resetSessionTimer, clearSessionTimer]);

  const login = useCallback((user) => {
    setCurrentUser(user);
    setIsAuthenticated(true);
    setLoginAttempts(0);
    setBlockedUntil(null);
    setMustChangePassword(!!user.mustChangePassword);
    setTwoFARequired(!!user.twoFAEnabled && !user._twoFAVerified);

    // Persist session
    try {
      localStorage.setItem('siso_session', JSON.stringify({
        userId: user.id,
        role: user.role,
        loginTime: new Date().toISOString(),
      }));
    } catch (e) { /* silently fail */ }
  }, []);

  const logout = useCallback(() => {
    setCurrentUser(null);
    setIsAuthenticated(false);
    setMustChangePassword(false);
    setTwoFARequired(false);
    clearSessionTimer();

    try {
      localStorage.removeItem('siso_session');
    } catch (e) { /* silently fail */ }
  }, [clearSessionTimer]);

  const recordFailedAttempt = useCallback(() => {
    setLoginAttempts((prev) => {
      const next = prev + 1;
      if (next >= MAX_LOGIN_ATTEMPTS) {
        setBlockedUntil(Date.now() + BLOCK_DURATION_MS);
      }
      return next;
    });
  }, []);

  // Role check helpers
  const canAccess = useCallback((feature) => {
    if (!currentUser) return false;
    if (_isAdmin(currentUser.role)) return true;
    if (currentUser.role === 'secretaria') {
      const permisos = currentUser.permisosSecretaria || {};
      return !!permisos[feature];
    }
    return true; // medico has access to most features
  }, [currentUser]);

  const isAdmin = currentUser ? _isAdmin(currentUser.role) : false;
  const isAdminEmpresa = currentUser ? _isAdminEmpresa(currentUser.role) : false;
  const isMedico = currentUser?.role === 'medico' || currentUser?.role === 'administrador';
  const isSecretaria = currentUser?.role === 'secretaria';

  return {
    currentUser,
    setCurrentUser,
    isAuthenticated,
    login,
    logout,
    loginAttempts,
    blockedUntil,
    recordFailedAttempt,
    mustChangePassword,
    setMustChangePassword,
    twoFARequired,
    setTwoFARequired,
    canAccess,
    isAdmin,
    isAdminEmpresa,
    isMedico,
    isSecretaria,
    resetSessionTimer,
  };
};
