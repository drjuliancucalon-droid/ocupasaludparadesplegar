import { useState, useCallback } from 'react';

/**
 * useCompanies - Hook para gestión de empresas
 */
export const useCompanies = ({ syncStorage, storageKey = 'siso_companies' } = {}) => {
  const [companies, setCompanies] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(storageKey) || '[]');
    } catch { return []; }
  });

  const sync = useCallback((list) => {
    try { localStorage.setItem(storageKey, JSON.stringify(list)); } catch {}
    if (syncStorage) syncStorage(storageKey, JSON.stringify(list));
  }, [storageKey, syncStorage]);

  const addCompany = useCallback((company) => {
    const newComp = { ...company, id: company.id || `comp_${Date.now()}` };
    setCompanies((prev) => {
      const upd = [...prev, newComp];
      sync(upd);
      return upd;
    });
    return newComp;
  }, [sync]);

  const updateCompany = useCallback((id, updates) => {
    setCompanies((prev) => {
      const upd = prev.map((c) => (c.id === id ? { ...c, ...updates } : c));
      sync(upd);
      return upd;
    });
  }, [sync]);

  const deleteCompany = useCallback((id) => {
    setCompanies((prev) => {
      const upd = prev.filter((c) => c.id !== id);
      sync(upd);
      return upd;
    });
  }, [sync]);

  const findCompany = useCallback((id) => companies.find((c) => c.id === id), [companies]);

  return {
    companies,
    setCompanies,
    addCompany,
    updateCompany,
    deleteCompany,
    findCompany,
  };
};
