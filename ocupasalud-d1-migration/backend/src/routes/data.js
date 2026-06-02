// backend/src/routes/data.js — Data endpoints for patients, companies, users
// Reads from Supabase siso_store (key-value) and returns structured data
import { Router } from 'express';
import { requireAuth, requireRole } from '../middleware/auth.js';
import { supabase } from '../services/supabaseClient.js';

const router = Router();

// All data routes require authentication
router.use(requireAuth);

// ── Helper: get store value with user-scoped key ────
async function getUserScopedData(baseKey, userId) {
  // Try user-specific key first, then shared
  const userKey = `${baseKey}_${userId}`;
  let data = await supabase.getStoreValue(userKey);
  if (data) return { data, key: userKey };

  // Try shared key
  const sharedKey = `${baseKey}_shared`;
  data = await supabase.getStoreValue(sharedKey);
  if (data) return { data, key: sharedKey };

  // Try base key
  data = await supabase.getStoreValue(baseKey);
  return { data: data || [], key: baseKey };
}

// ═══ PATIENTS ════════════════════════════════════════
router.get('/patients', async (req, res) => {
  try {
    const userId = req.user.user; // e.g., 'drcucalon'
    const { data } = await getUserScopedData('siso_patients', userId);
    const patients = Array.isArray(data) ? data : [];
    res.json({ patients, count: patients.length });
  } catch (err) {
    console.error('Error fetching patients:', err.message);
    res.status(500).json({ message: 'Error al obtener pacientes' });
  }
});

router.get('/patients/db', async (req, res) => {
  try {
    const userId = req.user.user;
    const { data } = await getUserScopedData('siso_db_patients', userId);
    const patients = Array.isArray(data) ? data : [];
    res.json({ patients, count: patients.length });
  } catch (err) {
    console.error('Error fetching patient DB:', err.message);
    res.status(500).json({ message: 'Error al obtener base de pacientes' });
  }
});

// ═══ COMPANIES ═══════════════════════════════════════
router.get('/companies', async (req, res) => {
  try {
    const userId = req.user.user;
    const { data } = await getUserScopedData('siso_companies', userId);
    const companies = Array.isArray(data) ? data : [];
    res.json({ companies, count: companies.length });
  } catch (err) {
    console.error('Error fetching companies:', err.message);
    res.status(500).json({ message: 'Error al obtener empresas' });
  }
});

// ═══ USERS (admin only) ═════════════════════════════
router.get('/users', requireRole('administrador', 'super_admin'), async (req, res) => {
  try {
    const data = await supabase.getStoreValue('siso_users');
    const users = Array.isArray(data) ? data : [];
    // Strip sensitive data
    const safeUsers = users.map(({ passHash, passSalt, ...u }) => u);
    res.json({ users: safeUsers, count: safeUsers.length });
  } catch (err) {
    console.error('Error fetching users:', err.message);
    res.status(500).json({ message: 'Error al obtener usuarios' });
  }
});

// ═══ AGENDA ══════════════════════════════════════════
router.get('/agenda', async (req, res) => {
  try {
    const userId = req.user.user;
    const { data } = await getUserScopedData('siso_agendados', userId);
    const appointments = Array.isArray(data) ? data : [];
    res.json({ appointments, count: appointments.length });
  } catch (err) {
    console.error('Error fetching agenda:', err.message);
    res.status(500).json({ message: 'Error al obtener agenda' });
  }
});

// ═══ BILLS ═══════════════════════════════════════════
router.get('/bills', async (req, res) => {
  try {
    const userId = req.user.user;
    const { data } = await getUserScopedData('siso_saved_bills', userId);
    const bills = Array.isArray(data) ? data : [];
    res.json({ bills, count: bills.length });
  } catch (err) {
    console.error('Error fetching bills:', err.message);
    res.status(500).json({ message: 'Error al obtener facturas' });
  }
});

// ═══ BILLS BY COMPANY ════════════════════════════════
router.get('/bills/by-company/:companyId', async (req, res) => {
  try {
    const userId = req.user.user;
    const { companyId } = req.params;
    const { data } = await getUserScopedData('siso_saved_bills', userId);
    const allBills = Array.isArray(data) ? data : [];
    const bills = allBills.filter(b => b.empresaId === companyId || b.companyId === companyId);
    res.json({ bills, count: bills.length, companyId });
  } catch (err) {
    console.error('Error fetching bills by company:', err.message);
    res.status(500).json({ message: 'Error al obtener facturas de la empresa' });
  }
});

// ═══ BILLS BY NIT ════════════════════════════════════
router.get('/bills/by-nit/:nit', async (req, res) => {
  try {
    const userId = req.user.user;
    const { nit } = req.params;
    const nitLimpio = nit.replace(/[^0-9]/g, '');
    const { data } = await getUserScopedData('siso_saved_bills', userId);
    const allBills = Array.isArray(data) ? data : [];
    const bills = allBills.filter(b => {
      const billNit = (b.empresaNit || b.nit || '').replace(/[^0-9]/g, '');
      return billNit === nitLimpio;
    });
    res.json({ bills, count: bills.length, nit: nitLimpio });
  } catch (err) {
    console.error('Error fetching bills by NIT:', err.message);
    res.status(500).json({ message: 'Error al obtener facturas por NIT' });
  }
});

// ═══ DOCTOR DATA ═════════════════════════════════════
router.get('/doctor', async (req, res) => {
  try {
    const userId = req.user.user;
    const data = await supabase.getStoreValue(`siso_doctor_data_${userId}`);
    res.json({ doctor: data || null });
  } catch (err) {
    console.error('Error fetching doctor data:', err.message);
    res.status(500).json({ message: 'Error al obtener datos del médico' });
  }
});

// ═══ AI KEYS (user-specific, never exposed to frontend) ═══
router.get('/ai-config', async (req, res) => {
  try {
    const userId = req.user.user;
    const data = await supabase.getStoreValue(`siso_ai_keys_${userId}`);
    // Only return which providers are configured, not the actual keys
    if (data && typeof data === 'object') {
      const status = {};
      for (const [provider, key] of Object.entries(data)) {
        status[provider] = !!key?.trim();
      }
      res.json({ providers: status });
    } else {
      res.json({ providers: {} });
    }
  } catch (err) {
    console.error('Error fetching AI config:', err.message);
    res.status(500).json({ message: 'Error al obtener config IA' });
  }
});

// ═══ AUDIT LOG ═══════════════════════════════════════
router.get('/audit', requireRole('administrador', 'super_admin'), async (req, res) => {
  try {
    const data = await supabase.getStoreValue('siso_audit_log');
    const logs = Array.isArray(data) ? data : [];
    res.json({ logs, count: logs.length });
  } catch (err) {
    console.error('Error fetching audit log:', err.message);
    res.status(500).json({ message: 'Error al obtener log de auditoría' });
  }
});

// ═══ REPORTS (Informes guardados) ════════════════════
router.get('/reports', async (req, res) => {
  try {
    const userId = req.user.user;
    const { data } = await getUserScopedData('siso_saved_reports', userId);
    const reports = Array.isArray(data) ? data : [];
    res.json({ reports, count: reports.length });
  } catch (err) {
    console.error('Error fetching reports:', err.message);
    res.status(500).json({ message: 'Error al obtener informes' });
  }
});

// ═══ REPORTS BY COMPANY ══════════════════════════════
router.get('/reports/by-company/:companyId', async (req, res) => {
  try {
    const userId = req.user.user;
    const { companyId } = req.params;
    const { data } = await getUserScopedData('siso_saved_reports', userId);
    const allReports = Array.isArray(data) ? data : [];
    const reports = allReports.filter(r => r.companyId === companyId || r.empresaId === companyId);
    res.json({ reports, count: reports.length, companyId });
  } catch (err) {
    console.error('Error fetching reports by company:', err.message);
    res.status(500).json({ message: 'Error al obtener informes de la empresa' });
  }
});

// ═══ REPORTS BY NIT ══════════════════════════════════
router.get('/reports/by-nit/:nit', async (req, res) => {
  try {
    const userId = req.user.user;
    const { nit } = req.params;
    const nitLimpio = nit.replace(/[^0-9]/g, '');
    const { data } = await getUserScopedData('siso_saved_reports', userId);
    const allReports = Array.isArray(data) ? data : [];
    const reports = allReports.filter(r => {
      const reportNit = (r.empresaNit || r.nit || '').replace(/[^0-9]/g, '');
      return reportNit === nitLimpio;
    });
    res.json({ reports, count: reports.length, nit: nitLimpio });
  } catch (err) {
    console.error('Error fetching reports by NIT:', err.message);
    res.status(500).json({ message: 'Error al obtener informes por NIT' });
  }
});

// ═══ CUSTODIA (Cartas de custodia) ════════════════════
router.get('/custodia', async (req, res) => {
  try {
    const userId = req.user.user;
    const { data } = await getUserScopedData('siso_cartas_custodia', userId);
    const cartas = Array.isArray(data) ? data : [];
    res.json({ cartas, count: cartas.length });
  } catch (err) {
    console.error('Error fetching custodia:', err.message);
    res.status(500).json({ message: 'Error al obtener cartas de custodia' });
  }
});

// ═══ CUSTODIA BY COMPANY ═════════════════════════════
router.get('/custodia/by-company/:companyId', async (req, res) => {
  try {
    const userId = req.user.user;
    const { companyId } = req.params;
    const { data } = await getUserScopedData('siso_cartas_custodia', userId);
    const allCartas = Array.isArray(data) ? data : [];
    const cartas = allCartas.filter(c => c.empresaId === companyId || c.companyId === companyId);
    res.json({ cartas, count: cartas.length, companyId });
  } catch (err) {
    console.error('Error fetching custodia by company:', err.message);
    res.status(500).json({ message: 'Error al obtener cartas de la empresa' });
  }
});

// ═══ CUSTODIA BY NIT ═════════════════════════════════
router.get('/custodia/by-nit/:nit', async (req, res) => {
  try {
    const userId = req.user.user;
    const { nit } = req.params;
    const nitLimpio = nit.replace(/[^0-9]/g, '');
    
    // Primero obtener empresas para mapear NIT a companyId
    const { data: companiesData } = await getUserScopedData('siso_companies', userId);
    const companies = Array.isArray(companiesData) ? companiesData : [];
    const company = companies.find(c => (c.nit || '').replace(/[^0-9]/g, '') === nitLimpio);
    
    const { data } = await getUserScopedData('siso_cartas_custodia', userId);
    const allCartas = Array.isArray(data) ? data : [];
    const cartas = allCartas.filter(c => {
      const cartaNit = (c.empresaNit || c.nit || '').replace(/[^0-9]/g, '');
      return cartaNit === nitLimpio || (company && c.empresaId === company.id);
    });
    res.json({ cartas, count: cartas.length, nit: nitLimpio });
  } catch (err) {
    console.error('Error fetching custodia by NIT:', err.message);
    res.status(500).json({ message: 'Error al obtener cartas por NIT' });
  }
});

// ═══ CERTIFICATES (Certificados por empresa) ═══════════
router.get('/certificates/by-company/:companyId', async (req, res) => {
  try {
    const userId = req.user.user;
    const { companyId } = req.params;
    const { data } = await getUserScopedData('siso_patients', userId);
    const allPatients = Array.isArray(data) ? data : [];
    
    // Filtrar pacientes que tienen certificado (HC cerrada) y pertenecen a la empresa
    const certificates = allPatients
      .filter(p => 
        (p.empresaId === companyId || p.empresa === companyId) &&
        p.estadoHistoria === 'Cerrada' &&
        p.codigoVerificacion
      )
      .map(p => ({
        id: p.id,
        docNumero: p.docNumero,
        docTipo: p.docTipo,
        nombres: p.nombres,
        conceptoAptitud: p.conceptoAptitud,
        fechaExamen: p.fechaExamen,
        vigencia: p.vigencia,
        codigoVerificacion: p.codigoVerificacion,
        empresaId: p.empresaId,
        empresaNombre: p.empresaNombre || p.empresa,
        tipoExamen: p.tipoExamen,
        enfasisExamen: p.enfasisExamen,
        medicoNombre: p.medicoNombre || p._doctorData?.nombre,
        diagnosticoPrincipal: p.diagnosticoPrincipal,
        cerradaAt: p.cerradaAt || p.fechaModificacion
      }));
    
    res.json({ certificates, count: certificates.length, companyId });
  } catch (err) {
    console.error('Error fetching certificates by company:', err.message);
    res.status(500).json({ message: 'Error al obtener certificados de la empresa' });
  }
});

// ═══ CERTIFICATES BY NIT ═════════════════════════════
router.get('/certificates/by-nit/:nit', async (req, res) => {
  try {
    const userId = req.user.user;
    const { nit } = req.params;
    const nitLimpio = nit.replace(/[^0-9]/g, '');
    
    // Obtener empresas para mapear NIT a companyId
    const { data: companiesData } = await getUserScopedData('siso_companies', userId);
    const companies = Array.isArray(companiesData) ? companiesData : [];
    const matchingCompanies = companies.filter(c => (c.nit || '').replace(/[^0-9]/g, '') === nitLimpio);
    const companyIds = matchingCompanies.map(c => c.id);
    
    const { data } = await getUserScopedData('siso_patients', userId);
    const allPatients = Array.isArray(data) ? data : [];
    
    // Filtrar pacientes que tienen certificado y pertenecen a empresas con ese NIT
    const certificates = allPatients
      .filter(p => {
        const patientNit = (p.empresaNit || '').replace(/[^0-9]/g, '');
        return (
          (companyIds.includes(p.empresaId) || patientNit === nitLimpio) &&
          p.estadoHistoria === 'Cerrada' &&
          p.codigoVerificacion
        );
      })
      .map(p => ({
        id: p.id,
        docNumero: p.docNumero,
        docTipo: p.docTipo,
        nombres: p.nombres,
        conceptoAptitud: p.conceptoAptitud,
        fechaExamen: p.fechaExamen,
        vigencia: p.vigencia,
        codigoVerificacion: p.codigoVerificacion,
        empresaId: p.empresaId,
        empresaNombre: p.empresaNombre || p.empresa,
        tipoExamen: p.tipoExamen,
        enfasisExamen: p.enfasisExamen,
        medicoNombre: p.medicoNombre || p._doctorData?.nombre,
        diagnosticoPrincipal: p.diagnosticoPrincipal,
        cerradaAt: p.cerradaAt || p.fechaModificacion
      }));
    
    res.json({ 
      certificates, 
      count: certificates.length, 
      nit: nitLimpio,
      empresasEncontradas: matchingCompanies.map(c => c.nombre)
    });
  } catch (err) {
    console.error('Error fetching certificates by NIT:', err.message);
    res.status(500).json({ message: 'Error al obtener certificados por NIT' });
  }
});

export default router;
