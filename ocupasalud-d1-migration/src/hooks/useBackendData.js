// src/hooks/useBackendData.js — Hook to fetch data from backend API
// Falls back to Supabase direct → localStorage if backend is unavailable
// Skips backend entirely when isLocalAuth=true (no JWT token)
import { useState, useEffect } from 'react';
import { apiClient } from '../lib/apiClient';

// Read auth state without hook (avoids React hook rules in async context)
const getAuthState = () => {
  try {
    const stored = JSON.parse(localStorage.getItem('siso-auth') || '{}');
    return {
      isLocalAuth: stored?.state?.isLocalAuth ?? true,
      token: stored?.state?.token || null,
    };
  } catch { return { isLocalAuth: true, token: null }; }
};

/**
 * Fetch data from backend with localStorage fallback
 * @param {string} endpoint - Backend endpoint (e.g., '/data/patients')
 * @param {string} localStorageKey - localStorage key for fallback
 * @param {string} dataField - Field name in response (e.g., 'patients')
 */
export function useBackendData(endpoint, localStorageKey, dataField) {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [source, setSource] = useState('none'); // 'backend' | 'local' | 'none'

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);
      setError(null);

      // Try backend first (requires valid JWT) — skip if using local auth
      const { isLocalAuth, token } = getAuthState();
      if (!isLocalAuth && token) {
        try {
          const result = await apiClient.get(endpoint);
          if (!cancelled && result[dataField]) {
            const items = result[dataField] || [];
            setData(items);
            setSource('backend');
            try { localStorage.setItem(localStorageKey, JSON.stringify(items)); } catch {}
            setLoading(false);
            return;
          }
        } catch (err) {
          // Silent fail — will try Supabase direct next
        }
      }

      // Try Supabase directly (transition mode — uses anon key like monolith)
      try {
        const sbUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yqrrktrgoijgzccrxnpz.supabase.co';
        const sbKey = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_K88qYuJ9wsWjQqnIhLVK7Q_NroFvPI7';
        // Determine the siso_store key from the endpoint
        const keyMap = {
          // Datos principales
          '/data/patients': 'siso_patients_drcucalon',
          '/data/patients/db': 'siso_db_patients_drcucalon',
          '/data/companies': 'siso_companies_drcucalon',
          '/data/users': 'siso_users',
          '/data/agenda': 'siso_agendados_drcucalon',
          '/data/bills': 'siso_saved_bills_drcucalon',
          '/data/doctor': 'siso_doctor_data_drcucalon',
          // Módulos especializados
          '/data/cotizaciones': 'siso_cotizaciones',
          '/data/mensajes': 'siso_mensajes',
          '/data/mensajes_drawer': 'siso_mensajes_drawer',
          '/data/encuestas': 'siso_encuestas',
          '/data/arl': 'siso_atl_cases',
          '/data/habeas': 'siso_habeas_data_requests',
          '/data/telemedicine': 'siso_teleconsultas',
          '/data/teleSala': 'siso_teleSala',
          '/data/teleEspera': 'siso_teleEspera',
          '/data/portafolio': 'siso_portafolio',
          '/data/sgsst': 'siso_sgsst_drcucalon',
          '/data/ips_perfil': 'siso_ips_perfil',
          '/data/orgs': 'siso_orgs',
          // Configuración y auditoría
          '/data/ai_config': 'siso_ai_config_provider',
          '/data/ai_keys': 'siso_ai_keys_drcucalon',
          '/data/doctor_signature': 'siso_doctor_signature',
          '/data/email_config': 'siso_email_config',
          '/data/audit_log': 'siso_audit_log',
          '/data/privacidad': 'siso_privacidad_aceptada',
          // Historial y estadísticas
          '/data/atenciones': 'siso_atenciones',
          '/data/atenciones_cerradas': 'siso_atenciones_cerradas',
          '/data/reports': 'siso_saved_reports',
          '/data/backup_history': 'siso_backup_history',
          '/data/custom_meds': 'siso_custom_meds',
        };
        const storeKey = keyMap[endpoint];
        if (storeKey) {
          const res = await fetch(
            `${sbUrl}/rest/v1/siso_store?key=eq.${encodeURIComponent(storeKey)}&select=value`,
            { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } }
          );
          if (res.ok) {
            const rows = await res.json();
            if (!cancelled && rows?.[0]?.value) {
              const items = Array.isArray(rows[0].value) ? rows[0].value : [];
              setData(items);
              setSource('supabase-direct');
              try { localStorage.setItem(localStorageKey, JSON.stringify(items)); } catch {}
              setLoading(false);
              return;
            }
          }
        }
      } catch (err) {
        console.warn(`Supabase direct for ${endpoint} failed:`, err.message);
      }

      // Fallback to localStorage
      if (!cancelled) {
        try {
          const stored = JSON.parse(localStorage.getItem(localStorageKey) || '[]');
          setData(Array.isArray(stored) ? stored : []);
          setSource('local');
        } catch {
          setData([]);
          setSource('none');
        }
        setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [endpoint, localStorageKey, dataField]);

  return { data, loading, error, source, setData };
}

/**
 * Fetch single object from backend
 */
export function useBackendObject(endpoint, localStorageKey, dataField) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchData() {
      setLoading(true);

      // Try backend (skip if local auth)
      const { isLocalAuth: isLocal, token: tk } = getAuthState();
      if (!isLocal && tk) {
        try {
          const result = await apiClient.get(endpoint);
          if (!cancelled && result[dataField] !== undefined) {
            setData(result[dataField] || null);
            setLoading(false);
            return;
          }
        } catch {}
      }

      // Try Supabase direct (transition)
      try {
        const sbUrl = import.meta.env.VITE_SUPABASE_URL || 'https://yqrrktrgoijgzccrxnpz.supabase.co';
        const sbKey = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_K88qYuJ9wsWjQqnIhLVK7Q_NroFvPI7';
        // Extended keyMap for useBackendObject
        const keyMap = {
          '/data/doctor': 'siso_doctor_data_drcucalon',
          '/data/ai_config': 'siso_ai_config_provider',
          '/data/ai_keys': 'siso_ai_keys_drcucalon',
          '/data/doctor_signature': 'siso_doctor_signature',
          '/data/email_config': 'siso_email_config',
          '/data/ips_perfil': 'siso_ips_perfil',
        };
        const storeKey = keyMap[endpoint];
        if (storeKey) {
          const res = await fetch(
            `${sbUrl}/rest/v1/siso_store?key=eq.${encodeURIComponent(storeKey)}&select=value`,
            { headers: { apikey: sbKey, Authorization: `Bearer ${sbKey}` } }
          );
          if (res.ok) {
            const rows = await res.json();
            if (!cancelled && rows?.[0]?.value) {
              setData(rows[0].value);
              setLoading(false);
              return;
            }
          }
        }
      } catch {}

      // Fallback localStorage
      if (!cancelled) {
        try {
          setData(JSON.parse(localStorage.getItem(localStorageKey) || 'null'));
        } catch { setData(null); }
        setLoading(false);
      }
    }

    fetchData();
    return () => { cancelled = true; };
  }, [endpoint, localStorageKey, dataField]);

  return { data, loading, setData };
}
