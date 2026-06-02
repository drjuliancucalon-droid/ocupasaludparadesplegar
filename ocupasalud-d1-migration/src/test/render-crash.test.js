import { describe, it, expect } from 'vitest';
import React from 'react';

describe('RENDER TEST — find the exact crash', () => {
  it('OccupationalHC renders without throwing', async () => {
    const mod = await import('../modules/clinical/components/OccupationalHC.jsx');
    const OccupationalHC = mod.default || mod.OccupationalHC;
    // Try to create element with minimal props
    try {
      const el = React.createElement(OccupationalHC, {
        data: { nombres: '', docNumero: '', tipoExamen: 'INGRESO', examenFisicoSistemas: {}, riesgos: {}, antecedentesAgrupados: {}, habitos: {}, agudezaVisual: {} },
        setData: () => {},
        companies: [],
        currentUser: { user: 'test', role: 'medico' },
        aiConfig: { activeProvider: 'gemini', keys: {} },
        activeDoctorData: { nombre: 'Dr Test' },
        activeSignature: null,
        onGenerateAI: () => {},
        onOpenConsent: () => {},
        onOpenHistory: () => {},
        onOpenRecommendations: () => {},
        onOpenRestrictions: () => {},
        handleChange: (e) => {},
        handleCompanySelect: (e) => {},
        handleNameChange: (e) => {},
        patientSuggestions: [],
        selectPatientSuggestion: () => {},
        historyNotification: null,
        isGenerating: false,
        isGeneratingReco: false,
        isGeneratingRestr: false,
        showConsentModal: false,
        setShowConsentModal: () => {},
        showRecomendacionesPanel: false,
        setShowRecomendacionesPanel: () => {},
        showRestriccionesPanel: false,
        setShowRestriccionesPanel: () => {},
      });
      // Try rendering to string
      const { renderToString } = await import('react-dom/server');
      const html = renderToString(el);
      expect(html.length).toBeGreaterThan(0);
    } catch (e) {
      console.error('RENDER ERROR:', e.message);
      console.error('STACK:', e.stack?.split('\n').slice(0,5).join('\n'));
      throw e;
    }
  });

  it('GeneralHC renders without throwing', async () => {
    const mod = await import('../modules/clinical/components/GeneralHC.jsx');
    const GeneralHC = mod.default || mod.GeneralHC;
    try {
      const el = React.createElement(GeneralHC, {
        data: { nombres: '', docNumero: '', examenFisicoSistemas: {}, habitos: {}, plan: {} },
        setData: () => {},
        activeDoctorData: { nombre: 'Dr Test' },
        activeSignature: null,
        patientsList: [],
        currentUser: { user: 'test' },
        onGenerateAI: () => {},
        onGenerateRestrictions: () => {},
        onGenerateRecommendations: () => {},
        isGenerating: false,
        isGeneratingRestr: false,
        isGeneratingReco: false,
        historyNotification: null,
      });
      const { renderToString } = await import('react-dom/server');
      const html = renderToString(el);
      expect(html.length).toBeGreaterThan(0);
    } catch (e) {
      console.error('RENDER ERROR:', e.message);
      console.error('STACK:', e.stack?.split('\n').slice(0,5).join('\n'));
      throw e;
    }
  });
});
