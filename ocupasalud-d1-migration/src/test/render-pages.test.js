import { describe, it, expect, vi } from 'vitest';
import React from 'react';

// Mock react-router-dom
vi.mock('react-router-dom', () => ({
  useParams: () => ({ id: 'test123' }),
  useNavigate: () => () => {},
  BrowserRouter: ({ children }) => children,
}));

// Mock stores
vi.mock('../stores/authStore', () => ({
  useAuthStore: Object.assign(() => ({ currentUser: { user: 'test', role: 'medico', nombre: 'Dr Test' } }), {
    getState: () => ({ currentUser: { user: 'test', role: 'medico', nombre: 'Dr Test' } }),
  }),
}));

vi.mock('../stores/aiStore', () => ({
  useAIStore: Object.assign(() => ({ getConfig: () => ({ activeProvider: 'gemini', keys: {} }) }), {
    getState: () => ({ getConfig: () => ({ activeProvider: 'gemini', keys: {} }) }),
  }),
}));

// Mock hooks
vi.mock('../hooks/useBackendData', () => ({
  useBackendData: () => ({ data: [], loading: false, error: null, source: 'test' }),
  useBackendObject: () => ({ data: null, loading: false }),
}));

vi.mock('../hooks/useSaveData', () => ({
  useSaveData: () => ({ save: vi.fn().mockResolvedValue({ ok: true }), saving: false, lastSaveStatus: null }),
}));

vi.mock('../lib/printService', () => ({
  printHC: vi.fn(),
  generateHCPrintHTML: vi.fn(() => '<html></html>'),
  openPrintWindow: vi.fn(),
}));

describe('RENDER PAGES — find the exact crash', () => {
  it('HistoriaPage renders without crash', async () => {
    try {
      const mod = await import('../pages/HistoriaPage.jsx');
      const Page = mod.default;
      const { renderToString } = await import('react-dom/server');
      const html = renderToString(React.createElement(Page));
      expect(html.length).toBeGreaterThan(0);
    } catch (e) {
      console.error('❌ HistoriaPage RENDER ERROR:', e.message);
      console.error('STACK:', e.stack?.split('\n').slice(0, 8).join('\n'));
      throw e;
    }
  });

  it('HistoriaGeneralPage renders without crash', async () => {
    try {
      const mod = await import('../pages/HistoriaGeneralPage.jsx');
      const Page = mod.default;
      const { renderToString } = await import('react-dom/server');
      const html = renderToString(React.createElement(Page));
      expect(html.length).toBeGreaterThan(0);
    } catch (e) {
      console.error('❌ HistoriaGeneralPage RENDER ERROR:', e.message);
      console.error('STACK:', e.stack?.split('\n').slice(0, 8).join('\n'));
      throw e;
    }
  });
});
