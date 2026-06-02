// src/stores/uiStore.js — Zustand store for UI state
// Replaces: alertMsg, confirmConfig, promptConfig, sidebar state, etc.
import { create } from 'zustand';

export const useUIStore = create((set, get) => ({
  // ── Navigation ─────────────────────────────
  sidebarOpen: true,
  activeTab: 'dashboard',

  // ── Alerts & Modals ────────────────────────
  alertMsg: '',
  confirmConfig: null, // { message, onConfirm, onCancel }
  promptConfig: null,  // { message, defaultValue, onSubmit }
  promptValue: '',

  // ── Sync status ────────────────────────────
  syncStatus: 'idle', // 'idle' | 'syncing' | 'ok' | 'error'
  showSyncReport: false,

  // ── B-17: AI generation status (navbar badge) ──
  aiGenerating: false,
  aiGeneratingLabel: '',

  // ── Actions ────────────────────────────────
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  showAlert: (msg) => set({ alertMsg: msg }),
  clearAlert: () => set({ alertMsg: '' }),

  showConfirm: (config) => set({ confirmConfig: config }),
  clearConfirm: () => set({ confirmConfig: null }),

  showPrompt: (config) => set({ promptConfig: config, promptValue: config?.defaultValue || '' }),
  setPromptValue: (val) => set({ promptValue: val }),
  clearPrompt: () => set({ promptConfig: null, promptValue: '' }),

  setSyncStatus: (status) => set({ syncStatus: status }),
  setShowSyncReport: (show) => set({ showSyncReport: show }),

  // B-17: AI generation badge
  setAIGenerating: (val, label = 'Analizando con IA...') => set({ aiGenerating: val, aiGeneratingLabel: label }),
}));
