/**
 * Billing Service - Cálculos y utilidades de facturación
 */
import { numeroALetras } from '../../../shared/lib/formatters';

export const calculateBillTotals = (items, includeIVA = false) => {
  const subtotal = items.reduce((s, it) => s + (it.cantidad || 0) * (it.valorUnit || it.precio || 0), 0);
  const ivaRate = includeIVA ? 0.19 : 0; // Servicios médicos generalmente exentos
  const iva = subtotal * ivaRate;
  const retencion = subtotal >= 1379000 ? subtotal * 0.11 : 0; // Retención para servicios de salud
  const total = subtotal + iva - retencion;
  return { subtotal, iva, retencion, total, totalLetras: numeroALetras ? numeroALetras(Math.round(total)) : '' };
};

export const generateBillNumber = (existingBills = [], prefix = 'CC') => {
  const maxNum = existingBills.reduce((max, b) => {
    const match = (b.numero || '').match(/(\d+)$/);
    return match ? Math.max(max, parseInt(match[1])) : max;
  }, 0);
  return `${prefix}-${String(maxNum + 1).padStart(4, '0')}`;
};

export const formatCurrency = (amount) => {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', maximumFractionDigits: 0 }).format(amount || 0);
};

export const exportBillsToCSV = (bills) => {
  const header = 'Numero,Fecha,Empresa,NIT,Subtotal,IVA,Total,Estado\n';
  const rows = bills.map((b) =>
    `"${b.numero}","${b.fecha}","${b.empresaNombre || ''}","${b.empresaNit || ''}",${b.subtotal || 0},${b.iva || 0},${b.total || 0},"${b.estado || 'Pendiente'}"`
  ).join('\n');
  const csv = header + rows;
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `cuentas_cobro_${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};
