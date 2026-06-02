import { useState, useEffect } from 'react';
import { sp } from '../utils/storage.js'; // Simular backend con localStorage

// Hook simulado para ocupasalud-paradesplegar (frontend-only)
// Datos desde localStorage simulando Supabase
export const useCompanyDocuments = (companyId, nitQuery) => {
  const [certificates, setCertificates] = useState([]);
  const [encuestasSocio, setEncuestasSocio] = useState([]);

  useEffect(() => {
    if (companyId) {
      // Existing certificates
      fetch(`/api/company-certificates/${companyId}`).then(r => r.json()).then(setCertificates);
      
      // NEW: encuestas socio
      fetch(`/api/empresa-encuestas-socio/${companyId}`).then(r => r.json()).then(setEncuestasSocio);
    }
  }, [companyId]);

  return { certificates, encuestasSocio };
};

