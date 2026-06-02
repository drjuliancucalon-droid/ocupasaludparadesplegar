// src/stores/aiStore.js — Zustand store for AI configuration
// Replaces: aiConfig, showAIConfig, aiStatus from monolith
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export const useAIStore = create(
  persist(
    (set, get) => ({
      // ── State ──────────────────────────────────
      activeProvider: 'gemini',
      keys: {
        gemini: '',
        groq: '',
        together: '',
        openrouter: '',
      },
      showConfig: false,
      status: null, // null | 'loading' | 'ok' | 'error'

      // ── Actions ────────────────────────────────
      setActiveProvider: (provider) => set({ activeProvider: provider }),

      setKey: (provider, key) => set((s) => ({
        keys: { ...s.keys, [provider]: key },
      })),

      setShowConfig: (show) => set({ showConfig: show }),
      setStatus: (status) => set({ status }),

      getConfig: () => {
        const { activeProvider, keys } = get();
        return { activeProvider, keys };
      },

      // Check if any provider is configured
      hasAnyKey: () => {
        const { keys } = get();
        return Object.values(keys).some((k) => k?.trim()?.length > 0);
      },
    }),
    {
      name: 'siso-ai-config',
      partialize: (state) => ({
        activeProvider: state.activeProvider,
        keys: state.keys,
      }),
    }
  )
);
