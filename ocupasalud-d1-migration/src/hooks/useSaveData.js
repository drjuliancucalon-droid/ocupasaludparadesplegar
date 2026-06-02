// src/hooks/useSaveData.js — Hook to save data to backend (or Supabase direct fallback)
import { useState, useCallback } from 'react';
import { apiClient } from '../lib/apiClient';

const SB_URL = import.meta.env.VITE_SUPABASE_URL || 'https://yqrrktrgoijgzccrxnpz.supabase.co';
const SB_KEY = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_K88qYuJ9wsWjQqnIhLVK7Q_NroFvPI7';
const SB_HEADERS = {
  apikey: SB_KEY,
  Authorization: `Bearer ${SB_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'resolution=merge-duplicates,return=minimal',
};

/**
 * Save data — tries backend first, falls back to Supabase direct
 */
export function useSaveData() {
  const [saving, setSaving] = useState(false);
  const [lastSaveStatus, setLastSaveStatus] = useState(null); // 'ok' | 'error'

  const save = useCallback(async (endpoint, data, supabaseKey) => {
    setSaving(true);
    setLastSaveStatus(null);

    // Try backend first
    try {
      const result = await apiClient.post(endpoint, data);
      if (result.ok) {
        setSaving(false);
        setLastSaveStatus('ok');
        return { ok: true, source: 'backend', ...result };
      }
    } catch (err) {
      console.warn(`Backend save ${endpoint} failed:`, err.message);
    }

    // Fallback: Supabase direct (transition mode)
    if (supabaseKey) {
      try {
        // Read current data
        const readRes = await fetch(
          `${SB_URL}/rest/v1/siso_store?key=eq.${encodeURIComponent(supabaseKey)}&select=value`,
          { headers: SB_HEADERS }
        );
        let current = [];
        if (readRes.ok) {
          const rows = await readRes.json();
          if (rows?.[0]?.value && Array.isArray(rows[0].value)) {
            current = rows[0].value;
          }
        }

        // Merge/add the new data
        if (data.docNumero) {
          // Patient/HC — merge by docNumero
          const idx = current.findIndex((p) => p.docNumero === data.docNumero);
          if (idx >= 0) {
            current[idx] = { ...current[idx], ...data, fechaModificacion: new Date().toISOString() };
          } else {
            current.push({ ...data, id: `item_${Date.now()}`, fechaCreacion: new Date().toISOString() });
          }
        } else if (data.id) {
          // Generic — merge by id
          const idx = current.findIndex((item) => item.id === data.id);
          if (idx >= 0) {
            current[idx] = { ...current[idx], ...data };
          } else {
            current.push(data);
          }
        } else {
          // Just append
          current.push({ ...data, id: `item_${Date.now()}` });
        }

        // Write back
        const writeRes = await fetch(`${SB_URL}/rest/v1/siso_store`, {
          method: 'POST',
          headers: SB_HEADERS,
          body: JSON.stringify({
            key: supabaseKey,
            value: current,
            updated_at: new Date().toISOString(),
          }),
        });

        if (writeRes.ok) {
          setSaving(false);
          setLastSaveStatus('ok');
          return { ok: true, source: 'supabase-direct', count: current.length };
        }
      } catch (err) {
        console.error('Supabase direct save failed:', err.message);
      }
    }

    // Last resort: localStorage
    try {
      if (supabaseKey) {
        const stored = JSON.parse(localStorage.getItem(supabaseKey) || '[]');
        const arr = Array.isArray(stored) ? stored : [];
        arr.push({ ...data, id: `local_${Date.now()}` });
        localStorage.setItem(supabaseKey, JSON.stringify(arr));
        setSaving(false);
        setLastSaveStatus('ok');
        return { ok: true, source: 'local', count: arr.length };
      }
    } catch {}

    setSaving(false);
    setLastSaveStatus('error');
    return { ok: false, source: 'none' };
  }, []);

  return { save, saving, lastSaveStatus };
}
