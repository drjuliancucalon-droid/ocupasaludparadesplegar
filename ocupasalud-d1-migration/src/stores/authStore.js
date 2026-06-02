// src/stores/authStore.js — Zustand store for authentication
// Replaces: currentUser, loginAttempts, loginBlockedUntil, privacidadAceptada, etc.
// from the monolith's 120+ useState declarations
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { apiClient } from '../lib/apiClient';
import { _canUse, _secretariaPuede, PLAN_CONFIG, SECRETARIA_PERMISOS_DEFAULT } from '../shared/data/planConfig.js';

const MAX_LOGIN_ATTEMPTS = 5;
const BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 min

export const useAuthStore = create(
  persist(
    (set, get) => ({
      // ── State ──────────────────────────────────
      currentUser: null,
      token: null,
      refreshToken: null,
      isAuthenticated: false,
      isLocalAuth: false,
      loginAttempts: 0,
      blockedUntil: null,
      lastActivity: null,
      privacidadAceptada: false,
      mustChangePassword: false,
      twoFARequired: false,

      // ── Actions ────────────────────────────────
      login: async (username, password) => {
        const { loginAttempts, blockedUntil } = get();

        // Check if blocked
        if (blockedUntil && Date.now() < blockedUntil) {
          const minLeft = Math.ceil((blockedUntil - Date.now()) / 60000);
          throw new Error(`Cuenta bloqueada. Intenta en ${minLeft} minuto(s).`);
        }

        try {
          // TODO: Replace with real backend call when backend is ready
          // For now, use the existing auth flow from useAuth.js
          const response = await apiClient.post('/auth/login', { username, password });
          const { user, token, refreshToken } = response;

          set({
            currentUser: user,
            token,
            refreshToken,
            isAuthenticated: true,
            loginAttempts: 0,
            blockedUntil: null,
            lastActivity: Date.now(),
            mustChangePassword: !!user.mustChangePassword,
            twoFARequired: !!user.twoFAEnabled && !user._twoFAVerified,
          });

          return user;
        } catch (error) {
          // Record failed attempt
          const newAttempts = loginAttempts + 1;
          const updates = { loginAttempts: newAttempts };

          if (newAttempts >= MAX_LOGIN_ATTEMPTS) {
            updates.blockedUntil = Date.now() + BLOCK_DURATION_MS;
            updates.loginAttempts = 0;
          }

          set(updates);
          throw error;
        }
      },

      // Temporary login for transition period (uses local auth like monolith)
      // Sets isLocalAuth=true so data hooks skip backend and go straight to Supabase
      loginLocal: (user) => {
        set({
          currentUser: user,
          isAuthenticated: true,
          isLocalAuth: true, // Flag: skip backend API calls, use Supabase direct
          token: null,
          loginAttempts: 0,
          blockedUntil: null,
          lastActivity: Date.now(),
          mustChangePassword: !!user.mustChangePassword,
          twoFARequired: false,
        });
      },

      logout: () => {
        set({
          currentUser: null,
          token: null,
          refreshToken: null,
          isAuthenticated: false,
          lastActivity: null,
          privacidadAceptada: false,
          mustChangePassword: false,
          twoFARequired: false,
        });
      },

      resetActivity: () => {
        set({ lastActivity: Date.now() });
      },

      acceptPrivacy: () => {
        set({ privacidadAceptada: true });
      },

      setMustChangePassword: (val) => {
        set({ mustChangePassword: val });
      },

      setTwoFARequired: (val) => {
        set({ twoFARequired: val });
      },

      // ── Computed helpers ───────────────────────
      isAdmin: () => {
        const { currentUser } = get();
        return currentUser?.role === 'administrador' || currentUser?.role === 'super_admin';
      },

      isMedico: () => {
        const { currentUser } = get();
        return currentUser?.role === 'medico' || currentUser?.role === 'administrador';
      },

      isSecretaria: () => {
        const { currentUser } = get();
        return currentUser?.role === 'secretaria';
      },

      canAccess: (feature, usersList = []) => {
        const { currentUser } = get();
        if (!currentUser) return false;
        const role = currentUser.role;
        if (['super_admin', 'administrador', 'admin_empresa'].includes(role)) return true;
        if (role === 'medico') return true;
        if (role === 'secretaria') {
          const SECRETARIA_PERMISOS_DEFAULT = {
            agenda: false, bill: false, propuestas: false, telemedicina: false,
            empresas: false, pacientes_lista: false, reporte: false, sve: false,
            caja: false, adjuntos: false, cuentas_cobro: false, pacientes_crear: false,
          };
          const userObj = usersList?.find(u => u.user === currentUser.user || u.id === currentUser.id);
          const permisos = userObj?.secretariaPermisos || currentUser?.secretariaPermisos || SECRETARIA_PERMISOS_DEFAULT;
          return permisos[feature] === true;
        }
        return false;
      },

      // canUse: verifica si el usuario puede usar una feature según su plan
      // Delegado a _canUse de planConfig.js (única fuente de verdad — igual al monolito)
      canUse: (feature) => {
        const { currentUser } = get();
        if (!currentUser) return false;
        if (currentUser.role === 'super_admin') return true;
        return _canUse(feature, currentUser);
      },

      // canAccessModule: verifica si el usuario tiene acceso a un módulo
      // Médico/Admin: siempre. Secretaria: solo si el admin habilitó esa feature.
      canAccessModule: (feature, usersList = []) => {
        const { currentUser } = get();
        return _secretariaPuede(feature, currentUser, usersList);
      },

      // getPlanConfig: devuelve la config del plan actual del usuario
      getPlanConfig: () => {
        const { currentUser } = get();
        if (currentUser?.role === 'super_admin') return PLAN_CONFIG.clinica;
        const plan = currentUser?.license || 'libre';
        return PLAN_CONFIG[plan] || PLAN_CONFIG.libre;
      },

      // getHCLimit: límite de historias clínicas del plan actual
      getHCLimit: () => {
        const { currentUser } = get();
        if (currentUser?.role === 'super_admin') return 9999;
        const plan = currentUser?.license || 'libre';
        return (PLAN_CONFIG[plan] || PLAN_CONFIG.libre).maxHC || 8;
      },
    }),
    {
      name: 'siso-auth',
      partialize: (state) => ({
        currentUser: state.currentUser,
        token: state.token,
        refreshToken: state.refreshToken,
        isAuthenticated: state.isAuthenticated,
        privacidadAceptada: state.privacidadAceptada,
      }),
    }
  )
);
