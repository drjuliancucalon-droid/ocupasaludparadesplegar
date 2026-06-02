import { useState, useCallback } from 'react';
import { _ls } from '../shared/lib/storage.js';
import { _sbGetAll, _sbSet, _sync } from '../shared/lib/supabase.js';

// Reusing pattern from other hooks, creating specific keys for SG-SST
export const _sgsstKey = (userId) => `siso_sgsst_${userId}`;
export const _sgsstKeyCloud = (userId) => `siso_sgsst_${userId}`;

export function useSGSSTData(userId) {
  const [sgsstData, setSgsstData] = useState({ risks: [], trainings: [], accidents: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const loadSGSSTData = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fast path: Local storage
      const localKey = _sgsstKey(userId);
      const localData = _ls.getItem(localKey);
      let parsedLocal = { risks: [], trainings: [], accidents: [] };
      if (localData) {
        try {
          parsedLocal = JSON.parse(localData);
          setSgsstData(parsedLocal);
        } catch (e) {
          console.error("Error parsing local sgsst data:", e);
        }
      }

      // 2. Sync with Supabase
      const cloudKey = _sgsstKeyCloud(userId);
      const cloudData = await _sbGetAll(cloudKey);
      
      if (cloudData) {
        setSgsstData(cloudData);
        // Update local storage with the latest cloud data
        _ls.setItem(localKey, JSON.stringify(cloudData));
      }
    } catch (err) {
      console.error("Failed to load sgsst data:", err);
      setError(err.message || "Failed to load sgsst data");
    } finally {
      setLoading(false);
    }
  }, [userId]);

  const saveSGSSTData = useCallback(async (newData) => {
    if (!userId || !newData) return;
    
    setSgsstData((prevData) => {
      const updatedData = { ...prevData, ...newData, updatedAt: new Date().toISOString() };
      
      // Save locally and trigger sync
      const localKey = _sgsstKey(userId);
      _sync(localKey, JSON.stringify(updatedData));
      
      return updatedData;
    });
  }, [userId]);

  return {
    sgsstData,
    loading,
    error,
    loadSGSSTData,
    saveSGSSTData
  };
}
