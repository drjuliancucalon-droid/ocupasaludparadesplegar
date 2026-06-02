import { useState, useCallback } from 'react';
import { _ls } from '../shared/lib/storage.js';
import { _sbGetAll, _sbSet, _sync, _compKey, _compKeyCloud } from '../shared/lib/supabase.js';

export function useCompanies(userId) {
  const [companiesList, setCompaniesList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadCompanies = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fast path: Local storage
      const localKey = _compKey(userId);
      const localData = _ls.getItem(localKey);
      let parsedLocal = [];
      if (localData) {
        try {
          parsedLocal = JSON.parse(localData);
          setCompaniesList(parsedLocal);
        } catch (e) {
          console.error("Error parsing local companies data:", e);
        }
      }

      // 2. Sync with Supabase
      const cloudKey = _compKeyCloud(userId);
      const cloudData = await _sbGetAll(cloudKey);
      
      if (cloudData && Array.isArray(cloudData)) {
        setCompaniesList(cloudData);
        // Update local storage with the latest cloud data
        _ls.setItem(localKey, JSON.stringify(cloudData));
      }
    } catch (err) {
      console.error("Failed to load companies:", err);
      setError(err.message || "Failed to load companies");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const saveCompany = useCallback(async (companyData) => {
    if (!userId || !companyData) return;
    
    setCompaniesList((prevList) => {
      const existingIndex = prevList.findIndex(c => c.id === companyData.id);
      let newList = [...prevList];
      
      if (existingIndex >= 0) {
        newList[existingIndex] = { ...newList[existingIndex], ...companyData, updatedAt: new Date().toISOString() };
      } else {
        newList.push({ 
          ...companyData, 
          id: companyData.id || crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      
      // Save locally and trigger sync
      const localKey = _compKey(userId);
      _sync(localKey, JSON.stringify(newList));
      
      return newList;
    });
  }, [userId]);

  const getCompany = useCallback((id) => {
    return companiesList.find(c => c.id === id);
  }, [companiesList]);

  return {
    companiesList,
    loading,
    error,
    loadCompanies,
    saveCompany,
    getCompany
  };
}
