// src/pages/Bill.jsx
// ═══════════════════════════════════════════════════════════════════════
// FACTURACIÓN — Generador de cuentas de cobro, portafolio, cotizaciones y propuestas
// ═══════════════════════════════════════════════════════════════════════
import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  Receipt, Plus, Trash2, Printer, FileText, Download, Save,
  Search, Eye, Edit3, ChevronDown, ChevronUp, X, Building2,
  DollarSign, FileCheck, Package, Send, Copy, Calendar,
  AlertTriangle, CheckCircle2, BarChart3, Briefcase,
} from 'lucide-react';
import { numeroALetras, getSpanishDate } from '../shared/lib/formatters.js';
import { _isAdmin } from '../shared/data/planConfig.js';

// ═══════════════════════════════════════════════════════════════════════
// BILL COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export default function Bill({
  billData, setBillData, companies = [], savedBillsList = [], setSavedBillsList,
  currentUser, activeDoctorData, _sync, goTo,
  // Portafolio props
  portafolioItems = [], setPortafolioItems, portafolioForm = {}, setPortafolioForm,
  portafolioEditId, setPortafolioEditId,
  // Cotizaciones props
  cotizaciones = [], setCotizaciones, cotizacionForm = {}, setCotizacionForm,
  cotizacionView, setCotizacionView, cotizacionSelId, setCotizacionSelId,
  // Propuestas props
  propForm = {}, setPropForm, selSvc, setSelSvc, propModulo, setPropModulo,
  // Misc
  patientsList = [], usersList = [], showAlert, showConfirm,
  dianProvider, setDianProvider, dianApiKey, setDianApiKey,
  showDianPanel, setShowDianPanel,
  mode,
  ...rest
}) {
  const [activeTab, setActiveTab] = useState('nueva');
  const [lineItems, setLineItems] = useState([
    { id: Date.now(), servicio: 'Examen médico ocupacional de ingreso', cantidad: 1, precioUnitario: 0, subtotal: 0 },
  ]);
  const [searchBill, setSearchBill] = useState('');
  const [previewBill, setPreviewBill] = useState(null);
  const [editingBillId, setEditingBillId] = useState(null);

  // ── Portafolio mode ─────────────────────────────────────────────────
  if (mode === 'portafolio') return renderPortafolio();
  if (mode === 'cotizaciones') return renderCotizaciones();
  if (mode === 'propuestas') return renderPropuestas();

  // ── Helpers ─────────────────────────────────────────────────────────
  const formatCOP = (n) => {
    const v = parseFloat(n) || 0;
    return v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
  };

  const calcTotal = () => lineItems.reduce((s, li) => s + (parseFloat(li.cantidad) || 0) * (parseFloat(li.precioUnitario) || 0), 0);

  const addLineItem = () => {
    setLineItems(prev => [...prev, {
      id: Date.now(), servicio: '', cantidad: 1, precioUnitario: 0, subtotal: 0,
    }]);
  };

  const removeLineItem = (id) => {
    if (lineItems.length <= 1) return;
    setLineItems(prev => prev.filter(li => li.id !== id));
  };

  const updateLineItem = (id, field, value) => {
    setLineItems(prev => prev.map(li => {
      if (li.id !== id) return li;
      const updated = { ...li, [field]: value };
      updated.subtotal = (parseFloat(updated.cantidad) || 0) * (parseFloat(updated.precioUnitario) || 0);
      return updated;
    }));
  };

  // ── Company selection ───────────────────────────────────────────────
  const handleCompanySelect = (compId) => {
    const comp = companies.find(c => c.id === compId);
    if (comp) {
      setBillData(prev => ({
        ...prev,
        companyId: comp.id,
        clientName: comp.nombre,
        clientNit: comp.nit,
      }));
    }
  };

  // ── Save bill ───────────────────────────────────────────────────────
  const handleSaveBill = () => {
    const total = calcTotal();
    if (!billData.clientName) {
      showAlert?.('⚠️ Seleccione o ingrese un cliente.');
      return;
    }
    if (total <= 0) {
      showAlert?.('⚠️ El total debe ser mayor a cero.');
      return;
    }

    const newBill = {
      id: editingBillId || 'BILL-' + Date.now(),
      ...billData,
      amount: total,
      amountWords: numeroALetras(total).toLowerCase() + ' pesos mcte',
      lineItems: [...lineItems],
      total,
      fechaCreacion: new Date().toISOString(),
      creadoPor: currentUser?.user,
      doctorNombre: activeDoctorData?.nombre || '',
      doctorCedula: activeDoctorData?.cedula || '',
      doctorLicencia: activeDoctorData?.licencia || '',
      banco: activeDoctorData?.banco || '',
      tipoCuenta: activeDoctorData?.tipoCuenta || '',
      numeroCuenta: activeDoctorData?.numeroCuenta || '',
      estado: 'Emitida',
    };

    setSavedBillsList(prev => {
      const exists = prev.findIndex(b => b.id === newBill.id);
      const updated = exists >= 0
        ? prev.map(b => b.id === newBill.id ? newBill : b)
        : [newBill, ...prev];
      _sync?.('siso_saved_bills', JSON.stringify(updated));
      return updated;
    });

    showAlert?.('✅ Cuenta de cobro guardada correctamente.');
    setEditingBillId(null);
    setActiveTab('lista');
  };

  // ── Print ───────────────────────────────────────────────────────────
  const handlePrint = (bill) => {
    const b = bill || { ...billData, lineItems, total: calcTotal(), amountWords: numeroALetras(calcTotal()).toLowerCase() + ' pesos mcte' };
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><title>Cuenta de Cobro ${b.number || ''}</title>
      <style>body{font-family:Arial,sans-serif;padding:40px;max-width:800px;margin:auto}
      h1{text-align:center;color:#065f46;border-bottom:3px solid #065f46;padding-bottom:10px}
      table{width:100%;border-collapse:collapse;margin:20px 0}
      th,td{border:1px solid #ccc;padding:8px;text-align:left;font-size:13px}
      th{background:#f0fdf4;font-weight:bold}
      .total{font-size:18px;font-weight:bold;text-align:right;margin:20px 0}
      .bank{background:#f0f9ff;padding:15px;border-radius:8px;margin:20px 0}
      .footer{margin-top:60px;text-align:center;font-size:11px;color:#666}
      .firma{margin-top:80px;text-align:center;border-top:1px solid #333;display:inline-block;padding-top:5px;min-width:300px}
      @media print{body{padding:20px}}</style></head><body>
      <h1>CUENTA DE COBRO N° ${b.number || '001'}</h1>
      <p><strong>Fecha:</strong> ${getSpanishDate(b.date)}</p>
      <p><strong>Señores:</strong> ${b.clientName || 'N/A'}</p>
      <p><strong>NIT:</strong> ${b.clientNit || 'N/A'}</p>
      <hr/>
      <p><strong>Concepto:</strong> ${b.concept || ''}</p>
      <table><thead><tr><th>Servicio</th><th>Cant.</th><th>Precio Unit.</th><th>Subtotal</th></tr></thead>
      <tbody>${(b.lineItems || []).map(li => `<tr><td>${li.servicio}</td><td>${li.cantidad}</td><td>$${(parseFloat(li.precioUnitario) || 0).toLocaleString('es-CO')}</td><td>$${(li.subtotal || 0).toLocaleString('es-CO')}</td></tr>`).join('')}</tbody></table>
      <div class="total">TOTAL: $${(b.total || 0).toLocaleString('es-CO')} COP</div>
      <p><em>Son: ${b.amountWords || ''}</em></p>
      <div class="bank"><strong>Datos Bancarios:</strong><br/>
      Banco: ${b.banco || activeDoctorData?.banco || ''}<br/>
      Tipo: ${b.tipoCuenta || activeDoctorData?.tipoCuenta || ''}<br/>
      N° Cuenta: ${b.numeroCuenta || activeDoctorData?.numeroCuenta || ''}<br/>
      Titular: ${b.doctorNombre || activeDoctorData?.nombre || ''}<br/>
      Cédula: ${b.doctorCedula || activeDoctorData?.cedula || ''}</div>
      <div style="text-align:center;margin-top:60px">
        <div class="firma">${b.doctorNombre || activeDoctorData?.nombre || ''}<br/>
        ${activeDoctorData?.titulo || 'Médico Especialista SST'}<br/>
        Lic. ${b.doctorLicencia || activeDoctorData?.licencia || ''}</div>
      </div>
      <div class="footer">Generado por SISO OcupaSalud Pro</div>
      </body></html>`);
    printWindow.document.close();
    printWindow.print();
  };

  // ── DIAN XML Export ─────────────────────────────────────────────────
  const handleDianExport = (bill) => {
    const b = bill || { ...billData, lineItems, total: calcTotal() };
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2">
  <cbc:UBLVersionID>UBL 2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>10</cbc:CustomizationID>
  <cbc:ProfileID>DIAN 2.1</cbc:ProfileID>
  <cbc:ID>${b.number || '001'}</cbc:ID>
  <cbc:IssueDate>${b.date || new Date().toISOString().split('T')[0]}</cbc:IssueDate>
  <cbc:InvoiceTypeCode>01</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>COP</cbc:DocumentCurrencyCode>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${activeDoctorData?.nombre || ''}</cbc:Name></cac:PartyName>
      <cac:PartyIdentification><cbc:ID>${activeDoctorData?.cedula || ''}</cbc:ID></cac:PartyIdentification>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyName><cbc:Name>${b.clientName || ''}</cbc:Name></cac:PartyName>
      <cac:PartyIdentification><cbc:ID>${b.clientNit || ''}</cbc:ID></cac:PartyIdentification>
    </cac:Party>
  </cac:AccountingCustomerParty>
  <cac:LegalMonetaryTotal>
    <cbc:PayableAmount currencyID="COP">${b.total || 0}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
  ${(b.lineItems || []).map((li, i) => `
  <cac:InvoiceLine>
    <cbc:ID>${i + 1}</cbc:ID>
    <cbc:InvoicedQuantity>${li.cantidad}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="COP">${li.subtotal || 0}</cbc:LineExtensionAmount>
    <cac:Item><cbc:Description>${li.servicio}</cbc:Description></cac:Item>
    <cac:Price><cbc:PriceAmount currencyID="COP">${li.precioUnitario}</cbc:PriceAmount></cac:Price>
  </cac:InvoiceLine>`).join('')}
</Invoice>`;

    const blob = new Blob([xml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `factura_${b.number || '001'}_${b.date || 'sin_fecha'}.xml`;
    a.click();
    URL.revokeObjectURL(url);
    showAlert?.('✅ XML DIAN exportado correctamente.');
  };

  // ── Edit bill ───────────────────────────────────────────────────────
  const handleEditBill = (bill) => {
    setBillData({
      number: bill.number || '01',
      type: bill.type || 'empresa',
      companyId: bill.companyId || '',
      clientName: bill.clientName || '',
      clientNit: bill.clientNit || '',
      medicoId: bill.medicoId || '',
      tipoServicio: bill.tipoServicio || 'ingreso',
      date: bill.date || new Date().toISOString().split('T')[0],
      amount: bill.amount || '',
      amountWords: bill.amountWords || '',
      concept: bill.concept || '',
      bankName: bill.bankName || '',
      accountType: bill.accountType || '',
      accountNumber: bill.accountNumber || '',
      totalPacientes: bill.totalPacientes || 0,
      precioPaciente: bill.precioPaciente || 0,
      billDoctorId: bill.billDoctorId || '',
      emitidaPor: bill.emitidaPor || 'organizacion',
    });
    setLineItems(bill.lineItems || [{ id: Date.now(), servicio: '', cantidad: 1, precioUnitario: 0, subtotal: 0 }]);
    setEditingBillId(bill.id);
    setActiveTab('nueva');
  };

  // ── Delete bill ─────────────────────────────────────────────────────
  const handleDeleteBill = (billId) => {
    showConfirm?.('¿Está seguro de eliminar esta cuenta de cobro?', () => {
      setSavedBillsList(prev => {
        const updated = prev.filter(b => b.id !== billId);
        _sync?.('siso_saved_bills', JSON.stringify(updated));
        return updated;
      });
    });
  };

  // ── Filtered bills ──────────────────────────────────────────────────
  const filteredBills = useMemo(() => {
    if (!searchBill) return savedBillsList;
    const q = searchBill.toLowerCase();
    return savedBillsList.filter(b =>
      (b.clientName || '').toLowerCase().includes(q) ||
      (b.number || '').toLowerCase().includes(q) ||
      (b.date || '').includes(q)
    );
  }, [savedBillsList, searchBill]);

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: NUEVA CUENTA
  // ═══════════════════════════════════════════════════════════════════════
  const renderNuevaCuenta = () => (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-600 rounded-2xl p-6 text-white">
        <h2 className="text-xl font-black flex items-center gap-2">
          <Receipt className="w-6 h-6" />
          {editingBillId ? 'Editar Cuenta de Cobro' : 'Nueva Cuenta de Cobro'}
        </h2>
        <p className="text-emerald-100 text-sm mt-1">Complete los datos para generar la cuenta de cobro</p>
      </div>

      {/* Datos generales */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="font-black text-gray-800 text-sm flex items-center gap-2">
          <FileText className="w-4 h-4 text-emerald-600" /> Datos Generales
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">N° Cuenta</label>
            <input type="text" value={billData.number || ''}
              onChange={e => setBillData(prev => ({ ...prev, number: e.target.value }))}
              className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="001" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Fecha</label>
            <input type="date" value={billData.date || ''}
              onChange={e => setBillData(prev => ({ ...prev, date: e.target.value }))}
              className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Tipo</label>
            <select value={billData.type || 'empresa'}
              onChange={e => setBillData(prev => ({ ...prev, type: e.target.value }))}
              className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
              <option value="empresa">Empresa</option>
              <option value="particular">Particular</option>
            </select>
          </div>
        </div>
      </div>

      {/* Cliente */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="font-black text-gray-800 text-sm flex items-center gap-2">
          <Building2 className="w-4 h-4 text-purple-600" /> Cliente
        </h3>
        {billData.type === 'empresa' && companies.length > 0 && (
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Seleccionar Empresa</label>
            <select value={billData.companyId || ''}
              onChange={e => handleCompanySelect(e.target.value)}
              className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500">
              <option value="">— Seleccione empresa —</option>
              {companies.map(c => (
                <option key={c.id || c.nit} value={c.id}>{c.nombre} (NIT: {c.nit})</option>
              ))}
            </select>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Nombre / Razón Social</label>
            <input type="text" value={billData.clientName || ''}
              onChange={e => setBillData(prev => ({ ...prev, clientName: e.target.value }))}
              className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="Nombre del cliente" />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">NIT / Cédula</label>
            <input type="text" value={billData.clientNit || ''}
              onChange={e => setBillData(prev => ({ ...prev, clientNit: e.target.value }))}
              className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
              placeholder="NIT o cédula" />
          </div>
        </div>
      </div>

      {/* Concepto */}
      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <h3 className="font-black text-gray-800 text-sm flex items-center gap-2">
          <DollarSign className="w-4 h-4 text-amber-600" /> Concepto y Detalle
        </h3>
        <div>
          <label className="text-xs font-bold text-gray-600 block mb-1">Concepto General</label>
          <textarea value={billData.concept || ''}
            onChange={e => setBillData(prev => ({ ...prev, concept: e.target.value }))}
            className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
            rows={2} />
        </div>

        {/* Line items */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-gray-600">Ítems</label>
            <button onClick={addLineItem}
              className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-200">
              <Plus className="w-3 h-3" /> Agregar
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  <th className="text-left p-2 text-xs font-bold text-gray-600">Servicio</th>
                  <th className="text-center p-2 text-xs font-bold text-gray-600 w-20">Cant.</th>
                  <th className="text-right p-2 text-xs font-bold text-gray-600 w-32">Precio Unit.</th>
                  <th className="text-right p-2 text-xs font-bold text-gray-600 w-32">Subtotal</th>
                  <th className="w-10"></th>
                </tr>
              </thead>
              <tbody>
                {lineItems.map(li => (
                  <tr key={li.id} className="border-b border-gray-100">
                    <td className="p-1">
                      <input type="text" value={li.servicio}
                        onChange={e => updateLineItem(li.id, 'servicio', e.target.value)}
                        className="w-full p-2 border border-gray-200 rounded-lg text-xs"
                        placeholder="Tipo de servicio" />
                    </td>
                    <td className="p-1">
                      <input type="number" min="1" value={li.cantidad}
                        onChange={e => updateLineItem(li.id, 'cantidad', e.target.value)}
                        className="w-full p-2 border border-gray-200 rounded-lg text-xs text-center" />
                    </td>
                    <td className="p-1">
                      <input type="number" min="0" value={li.precioUnitario}
                        onChange={e => updateLineItem(li.id, 'precioUnitario', e.target.value)}
                        className="w-full p-2 border border-gray-200 rounded-lg text-xs text-right" />
                    </td>
                    <td className="p-2 text-right text-xs font-bold text-gray-700">
                      {formatCOP((parseFloat(li.cantidad) || 0) * (parseFloat(li.precioUnitario) || 0))}
                    </td>
                    <td className="p-1 text-center">
                      <button onClick={() => removeLineItem(li.id)}
                        className="text-red-400 hover:text-red-600">
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Total */}
          <div className="flex justify-end">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 min-w-[250px]">
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-gray-700">TOTAL:</span>
                <span className="text-xl font-black text-emerald-700">{formatCOP(calcTotal())}</span>
              </div>
              <p className="text-[10px] text-gray-500 mt-1 italic">
                Son: {numeroALetras(calcTotal()).toLowerCase()} pesos mcte
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Datos bancarios */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 space-y-2">
        <h3 className="font-black text-blue-800 text-sm flex items-center gap-2">
          🏦 Datos Bancarios para Pago
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
          <p><strong>Banco:</strong> {activeDoctorData?.banco || 'No configurado'}</p>
          <p><strong>Tipo cuenta:</strong> {activeDoctorData?.tipoCuenta || 'N/A'}</p>
          <p><strong>N° Cuenta:</strong> {activeDoctorData?.numeroCuenta || 'N/A'}</p>
          <p><strong>Titular:</strong> {activeDoctorData?.nombre || 'N/A'}</p>
          <p><strong>Cédula:</strong> {activeDoctorData?.cedula || 'N/A'}</p>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-3">
        <button onClick={handleSaveBill}
          className="flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-xl font-bold text-sm hover:bg-emerald-700 shadow">
          <Save className="w-4 h-4" /> Guardar Cuenta
        </button>
        <button onClick={() => handlePrint()}
          className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-bold text-sm hover:bg-blue-700 shadow">
          <Printer className="w-4 h-4" /> Imprimir
        </button>
        <button onClick={() => handleDianExport()}
          className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 shadow">
          <Download className="w-4 h-4" /> Exportar DIAN XML
        </button>
      </div>
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: LISTA DE CUENTAS
  // ═══════════════════════════════════════════════════════════════════════
  const renderListaCuentas = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="font-black text-gray-800">Cuentas de Cobro Guardadas ({savedBillsList.length})</h3>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input type="text" value={searchBill}
            onChange={e => setSearchBill(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm w-64"
            placeholder="Buscar cuenta..." />
        </div>
      </div>

      {filteredBills.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-10 text-center">
          <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-bold">No hay cuentas guardadas</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredBills.map(bill => (
            <div key={bill.id} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md transition">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-black text-gray-800 text-sm">
                    Cuenta N° {bill.number} — {bill.clientName}
                  </p>
                  <p className="text-xs text-gray-500">
                    {getSpanishDate(bill.date)} · NIT: {bill.clientNit || 'N/A'} · {bill.estado || 'Emitida'}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-emerald-700">{formatCOP(bill.total || bill.amount || 0)}</span>
                </div>
              </div>
              <div className="flex gap-2 mt-3">
                <button onClick={() => handlePrint(bill)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200">
                  <Printer className="w-3 h-3" /> Imprimir
                </button>
                <button onClick={() => handleDianExport(bill)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-200">
                  <Download className="w-3 h-3" /> DIAN XML
                </button>
                <button onClick={() => handleEditBill(bill)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-200">
                  <Edit3 className="w-3 h-3" /> Editar
                </button>
                <button onClick={() => handleDeleteBill(bill.id)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200">
                  <Trash2 className="w-3 h-3" /> Eliminar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: PORTAFOLIO
  // ═══════════════════════════════════════════════════════════════════════
  function renderPortafolio() {
    const handleSaveItem = () => {
      if (!portafolioForm.nombre || !portafolioForm.precio) {
        showAlert?.('⚠️ Complete nombre y precio.');
        return;
      }
      const item = {
        id: portafolioEditId || 'PORT-' + Date.now(),
        ...portafolioForm,
        precio: parseFloat(portafolioForm.precio) || 0,
      };
      if (portafolioEditId) {
        setPortafolioItems?.(prev => prev.map(i => i.id === portafolioEditId ? item : i));
      } else {
        setPortafolioItems?.(prev => [...prev, item]);
      }
      setPortafolioForm?.({ nombre: '', codigo: '', precio: '', unidad: 'Sesión', descripcion: '' });
      setPortafolioEditId?.(null);
      showAlert?.('✅ Servicio guardado.');
    };

    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-2xl p-6 text-white">
          <h2 className="text-xl font-black flex items-center gap-2"><Package className="w-6 h-6" /> Portafolio de Servicios</h2>
          <p className="text-indigo-100 text-sm mt-1">Administre sus servicios y tarifas</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <input type="text" value={portafolioForm?.nombre || ''} onChange={e => setPortafolioForm?.(p => ({ ...p, nombre: e.target.value }))}
              className="p-2.5 border border-gray-200 rounded-lg text-sm" placeholder="Nombre del servicio" />
            <input type="text" value={portafolioForm?.codigo || ''} onChange={e => setPortafolioForm?.(p => ({ ...p, codigo: e.target.value }))}
              className="p-2.5 border border-gray-200 rounded-lg text-sm" placeholder="Código" />
            <input type="number" value={portafolioForm?.precio || ''} onChange={e => setPortafolioForm?.(p => ({ ...p, precio: e.target.value }))}
              className="p-2.5 border border-gray-200 rounded-lg text-sm" placeholder="Precio COP" />
            <button onClick={handleSaveItem}
              className="px-4 py-2.5 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700">
              {portafolioEditId ? 'Actualizar' : 'Agregar'}
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {(portafolioItems || []).map(item => (
            <div key={item.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center justify-between">
              <div>
                <p className="font-bold text-sm text-gray-800">{item.nombre}</p>
                <p className="text-xs text-gray-500">{item.codigo} · {item.unidad}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="font-black text-indigo-700">{formatCOP(item.precio)}</span>
                <button onClick={() => { setPortafolioEditId?.(item.id); setPortafolioForm?.({ ...item, precio: String(item.precio) }); }}
                  className="text-amber-600 hover:text-amber-800"><Edit3 className="w-4 h-4" /></button>
                <button onClick={() => setPortafolioItems?.(prev => prev.filter(i => i.id !== item.id))}
                  className="text-red-500 hover:text-red-700"><Trash2 className="w-4 h-4" /></button>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: COTIZACIONES
  // ═══════════════════════════════════════════════════════════════════════
  function renderCotizaciones() {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-6 text-white">
          <h2 className="text-xl font-black flex items-center gap-2"><Send className="w-6 h-6" /> Cotizaciones</h2>
          <p className="text-teal-100 text-sm mt-1">Genere y gestione cotizaciones para sus clientes</p>
        </div>

        <div className="space-y-3">
          {(cotizaciones || []).length === 0 ? (
            <div className="bg-gray-50 border rounded-xl p-10 text-center">
              <Send className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 font-bold">No hay cotizaciones aún</p>
            </div>
          ) : (
            cotizaciones.map(cot => (
              <div key={cot.id || cot.fecha} className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="font-bold text-sm">{cot.clienteNombre || 'Sin nombre'} — {cot.clienteEmpresa || ''}</p>
                <p className="text-xs text-gray-500">{cot.fecha} · {cot.estado}</p>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: PROPUESTAS
  // ═══════════════════════════════════════════════════════════════════════
  function renderPropuestas() {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl p-6 text-white">
          <h2 className="text-xl font-black flex items-center gap-2"><Briefcase className="w-6 h-6" /> Propuestas Comerciales</h2>
          <p className="text-amber-100 text-sm mt-1">Genere propuestas de servicios SST para empresas</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Empresa</label>
              <input type="text" value={propForm?.empresa || ''} onChange={e => setPropForm?.(p => ({ ...p, empresa: e.target.value }))}
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">NIT</label>
              <input type="text" value={propForm?.nit || ''} onChange={e => setPropForm?.(p => ({ ...p, nit: e.target.value }))}
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Contacto</label>
              <input type="text" value={propForm?.contacto || ''} onChange={e => setPropForm?.(p => ({ ...p, contacto: e.target.value }))}
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">N° Trabajadores</label>
              <input type="number" value={propForm?.numTrabajadores || ''} onChange={e => setPropForm?.(p => ({ ...p, numTrabajadores: e.target.value }))}
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Tab bar */}
      <div className="flex gap-2 overflow-x-auto pb-2">
        {[
          { id: 'nueva', label: 'Nueva Cuenta', icon: Plus },
          { id: 'lista', label: `Guardadas (${savedBillsList.length})`, icon: FileText },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold whitespace-nowrap transition ${
              activeTab === tab.id
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-white text-gray-600 border border-gray-200 hover:bg-gray-50'
            }`}>
            <tab.icon className="w-4 h-4" /> {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'nueva' && renderNuevaCuenta()}
      {activeTab === 'lista' && renderListaCuentas()}
    </div>
  );
}
