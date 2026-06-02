// src/hooks/useCompanyDocuments.js
// Hook para obtener todos los documentos de una empresa (certificados, informes, facturas, cartas)

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '../stores/authStore';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

export function useCompanyDocuments(companyId, nit) {
  const { currentUser, token } = useAuthStore();
  const [documents, setDocuments] = useState({
    certificates: [],
    reports: [],
    bills: [],
    custodia: [],
    loading: true,
    error: null
  });

  const fetchDocuments = useCallback(async () => {
    if (!companyId && !nit) {
      setDocuments(prev => ({ ...prev, loading: false }));
      return;
    }

    setDocuments(prev => ({ ...prev, loading: true, error: null }));

    try {
      const headers = {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      };

      // Determinar qué endpoints usar basado en companyId o NIT
      const basePath = companyId 
        ? `/data/${companyId}` 
        : `/data/by-nit/${nit}`;

      // Fetch todos los documentos en paralelo
      const [
        certsRes,
        reportsRes,
        billsRes,
        custodiaRes
      ] = await Promise.all([
        fetch(`${API_URL}/certificates${companyId ? `/by-company/${companyId}` : `/by-nit/${nit}`}`, { headers }),
        fetch(`${API_URL}/reports${companyId ? `/by-company/${companyId}` : `/by-nit/${nit}`}`, { headers }),
        fetch(`${API_URL}/bills${companyId ? `/by-company/${companyId}` : `/by-nit/${nit}`}`, { headers }),
        fetch(`${API_URL}/custodia${companyId ? `/by-company/${companyId}` : `/by-nit/${nit}`}`, { headers })
      ]);

      // Procesar respuestas
      const certificates = certsRes.ok ? (await certsRes.json()).certificates || [] : [];
      const reports = reportsRes.ok ? (await reportsRes.json()).reports || [] : [];
      const bills = billsRes.ok ? (await billsRes.json()).bills || [] : [];
      const custodia = custodiaRes.ok ? (await custodiaRes.json()).cartas || [] : [];

      setDocuments({
        certificates,
        reports,
        bills,
        custodia,
        loading: false,
        error: null
      });
    } catch (err) {
      console.error('Error fetching company documents:', err);
      setDocuments(prev => ({
        ...prev,
        loading: false,
        error: err.message || 'Error al obtener documentos'
      }));
    }
  }, [companyId, nit, token]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  // Función para refrescar datos
  const refresh = useCallback(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return {
    ...documents,
    refresh,
    // Helpers adicionales
    totalDocuments: documents.certificates.length + 
                   documents.reports.length + 
                   documents.bills.length + 
                   documents.custodia.length,
    hasDocuments: documents.certificates.length > 0 || 
                  documents.reports.length > 0 || 
                  documents.bills.length > 0 || 
                  documents.custodia.length > 0
  };
}

// Hook específico para certificados
export function useCompanyCertificates(companyId, nit) {
  const { token } = useAuthStore();
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCertificates = useCallback(async () => {
    if (!companyId && !nit) return;
    
    setLoading(true);
    setError(null);

    try {
      const endpoint = companyId 
        ? `${API_URL}/certificates/by-company/${companyId}`
        : `${API_URL}/certificates/by-nit/${nit}`;
      
      const res = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Error al obtener certificados');
      
      const data = await res.json();
      setCertificates(data.certificates || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [companyId, nit, token]);

  useEffect(() => {
    fetchCertificates();
  }, [fetchCertificates]);

  return { certificates, loading, error, refresh: fetchCertificates };
}

// Hook específico para informes
export function useCompanyReports(companyId, nit) {
  const { token } = useAuthStore();
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchReports = useCallback(async () => {
    if (!companyId && !nit) return;
    
    setLoading(true);
    setError(null);

    try {
      const endpoint = companyId 
        ? `${API_URL}/reports/by-company/${companyId}`
        : `${API_URL}/reports/by-nit/${nit}`;
      
      const res = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Error al obtener informes');
      
      const data = await res.json();
      setReports(data.reports || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [companyId, nit, token]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  return { reports, loading, error, refresh: fetchReports };
}

// Hook específico para cuentas de cobro
export function useCompanyBills(companyId, nit) {
  const { token } = useAuthStore();
  const [bills, setBills] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchBills = useCallback(async () => {
    if (!companyId && !nit) return;
    
    setLoading(true);
    setError(null);

    try {
      const endpoint = companyId 
        ? `${API_URL}/bills/by-company/${companyId}`
        : `${API_URL}/bills/by-nit/${nit}`;
      
      const res = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Error al obtener facturas');
      
      const data = await res.json();
      setBills(data.bills || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [companyId, nit, token]);

  useEffect(() => {
    fetchBills();
  }, [fetchBills]);

  return { bills, loading, error, refresh: fetchBills };
}

// Hook específico para cartas de custodia
export function useCompanyCustodia(companyId, nit) {
  const { token } = useAuthStore();
  const [cartas, setCartas] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchCartas = useCallback(async () => {
    if (!companyId && !nit) return;
    
    setLoading(true);
    setError(null);

    try {
      const endpoint = companyId 
        ? `${API_URL}/custodia/by-company/${companyId}`
        : `${API_URL}/custodia/by-nit/${nit}`;
      
      const res = await fetch(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (!res.ok) throw new Error('Error al obtener cartas de custodia');
      
      const data = await res.json();
      setCartas(data.cartas || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [companyId, nit, token]);

  useEffect(() => {
    fetchCartas();
  }, [fetchCartas]);

  return { cartas, loading, error, refresh: fetchCartas };
}
