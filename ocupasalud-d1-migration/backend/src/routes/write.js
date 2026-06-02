// backend/src/routes/write.js — Write endpoints (save/update data to Supabase)
// All mutations go through the backend — frontend never writes directly
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/auth.js';
import { supabase } from '../services/supabaseClient.js';

const router = Router();
router.use(requireAuth);

// ── Helper: read-modify-write for siso_store ────────
// Since siso_store is key-value (not relational), we read the array,
// modify it, and write it back. This matches the monolith's pattern.
async function readModifyWrite(key, modifier) {
  const current = await supabase.getStoreValue(key);
  const arr = Array.isArray(current) ? current : [];
  const result = modifier(arr);
  await supabase.setStoreValue(key, result);
  return result;
}

// ═══ SAVE PATIENT / HC ═══════════════════════════════
const patientSchema = z.object({
  docNumero: z.string().min(1, 'Documento requerido'),
  nombres: z.string().min(1, 'Nombre requerido'),
}).passthrough(); // Allow all other HC fields

router.post('/patients/save', async (req, res) => {
  try {
    const patient = patientSchema.parse(req.body);
    const userId = req.user.user;
    const key = `siso_patients_${userId}`;

    const updated = await readModifyWrite(key, (patients) => {
      const idx = patients.findIndex((p) => p.docNumero === patient.docNumero);
      const now = new Date().toISOString();

      if (idx >= 0) {
        // Update existing patient (merge)
        patients[idx] = { ...patients[idx], ...patient, fechaModificacion: now };
      } else {
        // New patient
        patients.push({
          ...patient,
          id: `pat_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          fechaCreacion: now,
          fechaModificacion: now,
          medicoId: userId,
        });
      }
      return patients;
    });

    // Also save to audit log
    await auditLog(userId, 'SAVE_PATIENT', `${patient.nombres} (${patient.docNumero})`);

    res.json({ ok: true, count: updated.length });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    console.error('Save patient error:', err.message);
    res.status(500).json({ message: 'Error al guardar paciente' });
  }
});

// ═══ SAVE HC (Historia Clínica) ══════════════════════
router.post('/hc/save', async (req, res) => {
  try {
    const hcData = req.body;
    if (!hcData.docNumero) {
      return res.status(400).json({ message: 'Documento del paciente requerido' });
    }

    const userId = req.user.user;
    const key = `siso_patients_${userId}`;
    const now = new Date().toISOString();

    // Add HC metadata
    const hcToSave = {
      ...hcData,
      id: hcData.id || `hc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      fechaModificacion: now,
      medicoId: userId,
      medicoNombre: req.user.nombre || userId,
    };

    if (!hcToSave.fechaCreacion) {
      hcToSave.fechaCreacion = now;
    }

    // Save to patient list (HC data is embedded in the patient record)
    const updated = await readModifyWrite(key, (patients) => {
      const idx = patients.findIndex((p) => p.docNumero === hcData.docNumero);
      if (idx >= 0) {
        // Merge HC data into existing patient
        patients[idx] = { ...patients[idx], ...hcToSave };
      } else {
        // Create new patient from HC
        patients.push(hcToSave);
      }
      return patients;
    });

    await auditLog(userId, 'SAVE_HC', `HC ${hcToSave.tipoExamen || 'ocupacional'} - ${hcToSave.nombres} (${hcToSave.docNumero})`);

    res.json({ ok: true, hcId: hcToSave.id, count: updated.length });
  } catch (err) {
    console.error('Save HC error:', err.message);
    res.status(500).json({ message: 'Error al guardar historia clínica' });
  }
});

// ═══ SAVE COMPANY ════════════════════════════════════
router.post('/companies/save', async (req, res) => {
  try {
    const company = req.body;
    if (!company.razonSocial && !company.nombre) {
      return res.status(400).json({ message: 'Razón social requerida' });
    }

    const userId = req.user.user;
    const key = `siso_companies_${userId}`;
    const now = new Date().toISOString();

    const updated = await readModifyWrite(key, (companies) => {
      const companyId = company.id || `emp_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
      const idx = companies.findIndex((c) => c.id === company.id);

      if (idx >= 0) {
        companies[idx] = { ...companies[idx], ...company, fechaModificacion: now };
      } else {
        companies.push({ ...company, id: companyId, fechaCreacion: now });
      }
      return companies;
    });

    await auditLog(userId, 'SAVE_COMPANY', company.razonSocial || company.nombre);
    res.json({ ok: true, count: updated.length });
  } catch (err) {
    console.error('Save company error:', err.message);
    res.status(500).json({ message: 'Error al guardar empresa' });
  }
});

// ═══ SAVE APPOINTMENT ════════════════════════════════
router.post('/agenda/save', async (req, res) => {
  try {
    const appointment = req.body;
    const userId = req.user.user;
    const key = `siso_agendados_${userId}`;
    const now = new Date().toISOString();

    const updated = await readModifyWrite(key, (appointments) => {
      const apptId = appointment.id || `cita_${Date.now()}`;
      const idx = appointments.findIndex((a) => a.id === appointment.id);

      if (idx >= 0) {
        appointments[idx] = { ...appointments[idx], ...appointment, fechaModificacion: now };
      } else {
        appointments.push({ ...appointment, id: apptId, fechaCreacion: now });
      }
      return appointments;
    });

    res.json({ ok: true, count: updated.length });
  } catch (err) {
    console.error('Save appointment error:', err.message);
    res.status(500).json({ message: 'Error al guardar cita' });
  }
});

// ═══ SAVE BILL ═══════════════════════════════════════
router.post('/bills/save', async (req, res) => {
  try {
    const bill = req.body;
    const userId = req.user.user;
    const key = `siso_saved_bills_${userId}`;
    const now = new Date().toISOString();

    // Asegurar que la factura tenga referencias completas
    const billConReferencias = {
      ...bill,
      // Indexación por empresa
      empresaId: bill.empresaId || bill.companyId || null,
      empresaNit: bill.empresaNit || bill.nit || null,
      // Array de IDs de trabajadores incluidos
      trabajadorIds: bill.trabajadorIds || bill.workerIds || 
        (bill.items ? bill.items
          .filter(i => i.descripcion && i.descripcion.includes(' - '))
          .map(i => i.descripcion.split(' - ')[1])
          .filter(n => n && n !== 'Trabajador')
        : []),
      // Array de IDs de atenciones facturadas
      atencionesIds: bill.atencionesIds || bill.attentionIds || [],
      // Período de facturación
      periodoMes: bill.periodoMes || bill.mes || null,
      periodoAnio: bill.periodoAnio || bill.anio || null,
      // Totales calculados
      totalCalculado: bill.total || bill.amount || 0,
      cantidadTrabajadores: bill.cantidadTrabajadores || 
        (bill.trabajadorIds ? bill.trabajadorIds.length : 0),
    };

    const updated = await readModifyWrite(key, (bills) => {
      const billId = billConReferencias.id || `bill_${Date.now()}`;
      const idx = bills.findIndex((b) => b.id === billConReferencias.id);

      if (idx >= 0) {
        bills[idx] = { ...bills[idx], ...billConReferencias, fechaModificacion: now };
      } else {
        bills.push({ ...billConReferencias, id: billId, fechaCreacion: now });
      }
      return bills;
    });

    await auditLog(userId, 'SAVE_BILL', billConReferencias.numero || 'Nueva factura');
    res.json({ ok: true, count: updated.length, billId: billConReferencias.id });
  } catch (err) {
    console.error('Save bill error:', err.message);
    res.status(500).json({ message: 'Error al guardar factura' });
  }
});

// ═══ SAVE REPORT (Informe epidemiológico) ═══════════════
router.post('/reports/save', async (req, res) => {
  try {
    const report = req.body;
    const userId = req.user.user;
    const key = `siso_saved_reports_${userId}`;
    const now = new Date().toISOString();

    // Validar datos requeridos
    if (!report.companyId && !report.empresaId) {
      return res.status(400).json({ message: 'companyId o empresaId es requerido' });
    }

    // Construir objeto de informe con metadatos completos
    const reportData = {
      ...report,
      id: report.id || `report_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      // Indexación por empresa
      companyId: report.companyId || report.empresaId,
      empresaId: report.empresaId || report.companyId,
      empresaNombre: report.empresaNombre || report.companyName || null,
      empresaNit: report.empresaNit || report.nit || null,
      // Período del informe
      periodoInicio: report.periodoInicio || report.startDate || report.reportStartDate || null,
      periodoFin: report.periodoFin || report.endDate || report.reportEndDate || null,
      periodoMes: report.periodoMes || report.mes || null,
      periodoAnio: report.periodoAnio || report.anio || null,
      // Datos del informe
      tipoInforme: report.tipoInforme || report.type || 'epidemiologico',
      totalTrabajadores: report.totalTrabajadores || report.totalWorkers || 0,
      resumenEjecutivo: report.resumenEjecutivo || report.executiveSummary || null,
      conclusiones: report.conclusiones || report.conclusions || null,
      analisisJustificado: report.analisisJustificado || null,
      recomendacionesInforme: report.recomendacionesInforme || null,
      matrizLegalNormativa: report.matrizLegalNormativa || null,
      pveRecomendados: report.pveRecomendados || [],
      tablaMorbilidad: report.tablaMorbilidad || report.tabla || [],
      // Datos estadísticos (para regenerar informe si es necesario)
      estadisticas: report.estadisticas || report.stats || null,
      // Metadatos
      generadoPor: userId,
      generadoPorNombre: req.user.nombre || userId,
      fechaGeneracion: report.fechaGeneracion || report.generatedAt || now,
      fechaModificacion: now,
      fechaCreacion: report.fechaCreacion || report.createdAt || now,
    };

    const updated = await readModifyWrite(key, (reports) => {
      const idx = reports.findIndex((r) => r.id === reportData.id);
      if (idx >= 0) {
        reports[idx] = { ...reports[idx], ...reportData, fechaModificacion: now };
      } else {
        reports.push(reportData);
      }
      return reports;
    });

    await auditLog(userId, 'SAVE_REPORT', `Informe ${reportData.tipoInforme} - ${reportData.empresaNombre || reportData.companyId}`);
    res.json({ ok: true, count: updated.length, reportId: reportData.id });
  } catch (err) {
    console.error('Save report error:', err.message);
    res.status(500).json({ message: 'Error al guardar informe' });
  }
});

// ═══ SAVE CUSTODIA (Carta de custodia con indexación) ═══
router.post('/custodia/save', async (req, res) => {
  try {
    const carta = req.body;
    const userId = req.user.user;
    const key = `siso_cartas_custodia_${userId}`;
    const now = new Date().toISOString();

    // Validar datos requeridos
    if (!carta.empresaId && !carta.companyId) {
      return res.status(400).json({ message: 'empresaId o companyId es requerido' });
    }

    // Construir objeto de carta con metadatos completos
    const cartaData = {
      ...carta,
      id: carta.id || `cust_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      // Indexación por empresa
      empresaId: carta.empresaId || carta.companyId,
      companyId: carta.companyId || carta.empresaId,
      empresaNombre: carta.empresaNombre || carta.companyName || carta.nombreEmpresa || null,
      empresaNit: carta.empresaNit || carta.nit || carta.companyNit || null,
      // Período de la carta
      mes: carta.mes || carta.mesVal || null,
      anio: carta.anio || carta.anioVal || null,
      mesTexto: carta.mesTexto || carta.monthName || null,
      fechaCarta: carta.fechaCarta || carta.letterDate || now.split('T')[0],
      // Datos del médico
      medicoNombre: carta.medicoNombre || carta.doctorName || req.user.nombre || userId,
      medicoLicencia: carta.medicoLicencia || carta.doctorLicense || null,
      medicoCC: carta.medicoCC || carta.doctorId || null,
      // Contenido de la carta
      ciudadDestino: carta.ciudadDestino || carta.ciudad || carta.destinationCity || null,
      contenidoHTML: carta.contenidoHTML || carta.htmlContent || null,
      // Estado
      enviadaPorEmail: carta.enviadaPorEmail || carta.sentByEmail || false,
      fechaEnvio: carta.fechaEnvio || carta.sentAt || null,
      emailDestino: carta.emailDestino || carta.destinationEmail || null,
      // Metadatos
      creadaPor: userId,
      fechaCreacion: carta.fechaCreacion || carta.createdAt || now,
      fechaModificacion: now,
    };

    const updated = await readModifyWrite(key, (cartas) => {
      const idx = cartas.findIndex((c) => c.id === cartaData.id);
      if (idx >= 0) {
        cartas[idx] = { ...cartas[idx], ...cartaData, fechaModificacion: now };
      } else {
        cartas.push(cartaData);
      }
      return cartas;
    });

    await auditLog(userId, 'SAVE_CUSTODIA', `Carta custodia - ${cartaData.empresaNombre || cartaData.empresaId} - ${cartaData.mesTexto}/${cartaData.anio}`);
    res.json({ ok: true, count: updated.length, custodiaId: cartaData.id });
  } catch (err) {
    console.error('Save custodia error:', err.message);
    res.status(500).json({ message: 'Error al guardar carta de custodia' });
  }
});

// ═══ DELETE (soft — marks as deleted) ════════════════
router.post('/delete', async (req, res) => {
  try {
    const { collection, itemId } = req.body;
    if (!collection || !itemId) {
      return res.status(400).json({ message: 'collection y itemId requeridos' });
    }

    const userId = req.user.user;
    const keyMap = {
      patients: `siso_patients_${userId}`,
      companies: `siso_companies_${userId}`,
      agenda: `siso_agendados_${userId}`,
      bills: `siso_saved_bills_${userId}`,
    };
    const key = keyMap[collection];
    if (!key) return res.status(400).json({ message: 'Colección inválida' });

    const updated = await readModifyWrite(key, (items) => {
      return items.filter((item) => item.id !== itemId);
    });

    await auditLog(userId, 'DELETE', `${collection}/${itemId}`);
    res.json({ ok: true, count: updated.length });
  } catch (err) {
    console.error('Delete error:', err.message);
    res.status(500).json({ message: 'Error al eliminar' });
  }
});

// ── Audit logger ─────────────────────────────────────
async function auditLog(userId, action, detail) {
  try {
    const current = await supabase.getStoreValue('siso_audit_log');
    const logs = Array.isArray(current) ? current : [];
    logs.push({
      ts: new Date().toISOString(),
      action,
      user: userId,
      detail: String(detail).substring(0, 200),
    });
    // Keep last 500 entries
    if (logs.length > 500) logs.splice(0, logs.length - 500);
    await supabase.setStoreValue('siso_audit_log', logs);
  } catch (err) {
    console.error('Audit log error:', err.message);
  }
}

export default router;
