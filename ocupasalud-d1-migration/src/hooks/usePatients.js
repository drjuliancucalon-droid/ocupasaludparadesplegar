import { useState, useCallback } from 'react';
import { _ls } from '../shared/lib/storage.js';
import { _sbGetAll, _sbSet, _sync, _patKey, _patKeyCloud } from '../shared/lib/supabase.js';

export function usePatients(userId) {
  const [patientsList, setPatientsList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadPatients = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fast path: Local storage
      const localKey = _patKey(userId);
      const localData = _ls.getItem(localKey);
      let parsedLocal = [];
      if (localData) {
        try {
          parsedLocal = JSON.parse(localData);
          setPatientsList(parsedLocal);
        } catch (e) {
          console.error("Error parsing local patients data:", e);
        }
      }

      // 2. Sync with Supabase
      const cloudKey = _patKeyCloud(userId);
      const cloudData = await _sbGetAll(cloudKey);
      
      if (cloudData && Array.isArray(cloudData)) {
        // Here you might want to implement a more sophisticated merge logic
        // based on timestamps or IDs if needed. For now, we trust cloud as source of truth
        // or merge if needed. Assuming cloudData is the array of patients.
        setPatientsList(cloudData);
        // Update local storage with the latest cloud data
        _ls.setItem(localKey, JSON.stringify(cloudData));
      }
    } catch (err) {
      console.error("Failed to load patients:", err);
      setError(err.message || "Failed to load patients");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const savePatient = useCallback(async (patientData) => {
    if (!userId || !patientData) return;
    
    // Create new list
    setPatientsList((prevList) => {
      const existingIndex = prevList.findIndex(p => p.id === patientData.id);
      let newList = [...prevList];
      
      if (existingIndex >= 0) {
        newList[existingIndex] = { ...newList[existingIndex], ...patientData, updatedAt: new Date().toISOString() };
      } else {
        newList.push({ 
          ...patientData, 
          id: patientData.id || crypto.randomUUID(),
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      }
      
      // Save locally and trigger sync
      const localKey = _patKey(userId);
      _sync(localKey, JSON.stringify(newList));
      
      return newList;
    });
  }, [userId]);

  const getPatient = useCallback((id) => {
    return patientsList.find(p => p.id === id);
  }, [patientsList]);

  const deletePatient = useCallback(async (id) => {
    if (!userId || !id) return;
    
    setPatientsList((prevList) => {
      const newList = prevList.filter(p => p.id !== id);
      
      // Save locally and trigger sync
      const localKey = _patKey(userId);
      _sync(localKey, JSON.stringify(newList));
      
      return newList;
    });
  }, [userId]);

  return {
    patientsList,
    loading,
    error,
    loadPatients,
    savePatient,
    getPatient,
    deletePatient
  };
}
