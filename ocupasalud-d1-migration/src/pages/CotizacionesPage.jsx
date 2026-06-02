// src/pages/CotizacionesPage.jsx — Quotations
// T-02: Completar Cotizaciones - PDF firmado + Estados
import React, { useState } from 'react';
import { FileText, Plus, Printer, Trash2, DollarSign, Building2, Send, CheckCircle, XCircle, FileSignature } from 'lucide-react';
import { useBackendData } from '../hooks/useBackendData';
import { openPrintWindow } from '../lib/printService';

const STORAGE_KEY = 'siso_cotizaciones';
const load = () => { try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]'); } catch { return []; } };
const save = (d) => { try { localStorage.setItem(STORAGE_KEY, JSON.stringify(d)); } catch {} };

// T-02: Función para generar PDF con firma
const generatePDFWithSignature = (cot, doctorData) => {
  const html = `
    <html><head><title>Cotización ${cot.id}</title>
    <style>
      body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
      .header { text-align: center; border-bottom: 3px solid #059669; padding-bottom: 20px; margin-bottom: 30px; }
      .header h1 { color: #059669; margin: 0; font-size: 28px; }
      .header p { color: #666; margin: 5px 0; }
      .info { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 30px; }
      .info-item { border: 1px solid #e5e7eb; padding: 12px; border-radius: 8px; }
      .info-item label { display: block; color: #666; font-size: 12px; font-weight: bold; }
      .info-item span { display: block; color: #111; font-size: 14px; margin-top: 4px; }
      .servicios { border: 1px solid #e5e7eb; padding: 20px; border-radius: 8px; margin-bottom: 30px; }
      .servicios h3 { color: #059669; margin: 0 0 15px 0; font-size: 16px; }
      .total { text-align: right; font-size: 24px; color: #059669; font-weight: bold; padding: 20px; background: #f0fdf4; border-radius: 8px; }
      .firma { margin-top: 50px; text-align: center; border-top: 1px solid #ccc; padding-top: 20px; }
      .firma img { max-width: 200px; max-height: 80px; }
      .firma p { margin: 5px 0; color: #666; font-size: 12px; }
      .estado { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; font-size: 14px; }
      .estado.pendiente { background: #fef3c7; color: #92400e; }
      .estado.enviada { background: #dbeafe; color: #1e40af; }
      .estado.aceptada { background: #d1fae5; color: #065f46; }
      .estado.rechazada { background: #fee2e2; color: #991b1b; }
    </style>
    </head><body>
      <div class="header">
        <h1>COTIZACIÓN DE SERVICIOS</h1>
        <p>OcupaSalud - Servicios de Salud Ocupacional</p>
        <p>NIT: ${doctorData?.nit || '000000000'}</p>
      </div>
      <div class="info">
        <div class="info-item"><label>EMPRESA</label><span>${cot.empresa}</span></div>
        <div class="info-item"><label>FECHA</label><span>${new Date(cot.fecha).toLocaleDateString('es-CO')}</span></div>
        <div class="info-item"><label>VIGENCIA</label><span>${cot.vigencia}</span></div>
        <div class="info-item"><label>ESTADO</label><span><span class="estado ${cot.estado?.toLowerCase() || 'pendiente'}">${cot.estado || 'Pendiente'}</span></span></div>
      </div>
      <div class="servicios">
        <h3>📋 SERVICIOS OFRECIDOS</h3>
        <p>${cot.servicios}</p>
        ${cot.observaciones ? `<p style="margin-top:15px;color:#666;"><strong>Observaciones:</strong> ${cot.observaciones}</p>` : ''}
      </div>
      <div class="total">Total: $${parseInt(cot.valor || 0).toLocaleString('es-CO')}</div>
      <div class="firma">
        ${doctorData?.firma ? `<img src="${doctorData.firma}" alt="Firma" />` : '<p style="color:#999;">[Firma digital]</p>'}
        <p><strong>${doctorData?.nombre || 'Dr. Usuario'}</strong></p>
        <p>${doctorData?.titulo || 'Médico Salud Ocupacional'}</p>
        <p>Licencia: ${doctorData?.licencia || 'N/A'}</p>
      </div>
    </body></html>`;
  return html;
};

export default function CotizacionesPage() {
  const [cotizaciones, setCotizaciones] = useState(load);
  const { data: companies } = useBackendData('/data/companies', 'siso_companies', 'companies');
  const { data: doctor } = useBackendObject('/data/doctor', 'siso_doctor_data', 'doctor');
  const [form, setForm] = useState({ empresa: '', servicios: '', valor: '', vigencia: '30 días', observaciones: '' });
  const [showForm, setShowForm] = useState(false);

  const handleSave = () => {
    if (!form.empresa || !form.servicios) { alert('Empresa y servicios son requeridos'); return; }
    const cot = { ...form, id: `cot_${Date.now()}`, fecha: new Date().toISOString(), estado: 'pendiente' };
    const updated = [cot, ...cotizaciones]; setCotizaciones(updated); save(updated);
    setForm({ empresa: '', servicios: '', valor: '', vigencia: '30 días', observaciones: '' }); setShowForm(false);
  };

  const handlePrint = (cot) => {
    openPrintWindow(`Cotización — ${cot.empresa}`, `
      <h1 style="color:#059669;text-align:center;">COTIZACIÓN DE SERVICIOS</h1>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;"><tr><td style="padding:6px;font-weight:bold;border:1px solid #e5e7eb;width:30%;">Empresa</td><td style="padding:6px;border:1px solid #e5e7eb;">${cot.empresa}</td></tr>
      <tr><td style="padding:6px;font-weight:bold;border:1px solid #e5e7eb;">Fecha</td><td style="padding:6px;border:1px solid #e5e7eb;">${new Date(cot.fecha).toLocaleDateString('es-CO')}</td></tr>
      <tr><td style="padding:6px;font-weight:bold;border:1px solid #e5e7eb;">Servicios</td><td style="padding:6px;border:1px solid #e5e7eb;">${cot.servicios}</td></tr>
      <tr><td style="padding:6px;font-weight:bold;border:1px solid #e5e7eb;">Valor</td><td style="padding:6px;border:1px solid #e5e7eb;font-weight:bold;color:#059669;">$${cot.valor}</td></tr>
      <tr><td style="padding:6px;font-weight:bold;border:1px solid #e5e7eb;">Vigencia</td><td style="padding:6px;border:1px solid #e5e7eb;">${cot.vigencia}</td></tr>
      <tr><td style="padding:6px;font-weight:bold;border:1px solid #e5e7eb;">Observaciones</td><td style="padding:6px;border:1px solid #e5e7eb;">${cot.observaciones || '—'}</td></tr></table>`);
  };

  const handleDelete = (id) => { if (confirm('¿Eliminar cotización?')) { const u = cotizaciones.filter((c) => c.id !== id); setCotizaciones(u); save(u); } };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3"><DollarSign className="w-6 h-6 text-emerald-600" /><h1 className="text-2xl font-bold text-gray-800">Cotizaciones</h1></div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-1 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold"><Plus className="w-4 h-4" /> Nueva</button>
      </div>
      {showForm && (
        <div className="bg-white border rounded-xl p-5 mb-6 space-y-3">
          <select value={form.empresa} onChange={(e) => setForm({ ...form, empresa: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
            <option value="">Seleccionar empresa</option>{companies.map((c) => <option key={c.id} value={c.razonSocial || c.nombre}>{c.razonSocial || c.nombre}</option>)}
          </select>
          <textarea value={form.servicios} onChange={(e) => setForm({ ...form, servicios: e.target.value })} placeholder="Servicios ofrecidos..." rows={3} className="w-full border rounded-lg px-3 py-2 text-sm resize-none" />
          <div className="grid grid-cols-2 gap-3">
            <input value={form.valor} onChange={(e) => setForm({ ...form, valor: e.target.value })} placeholder="Valor ($)" className="border rounded-lg px-3 py-2 text-sm" />
            <input value={form.vigencia} onChange={(e) => setForm({ ...form, vigencia: e.target.value })} placeholder="Vigencia" className="border rounded-lg px-3 py-2 text-sm" />
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600">Cancelar</button>
            <button onClick={handleSave} className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold">Guardar</button>
          </div>
        </div>
      )}
      {/* T-02: Botón exportar PDF firmado */}
      <div className="mt-4 bg-indigo-50 border border-indigo-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileSignature className="w-4 h-4 text-indigo-600" />
          <h3 className="font-bold text-indigo-800 text-sm">Exportar PDF con Firma Digital</h3>
        </div>
        <p className="text-xs text-indigo-600 mb-3">Genera PDF profesional con firma del médico y datos de licencia</p>
        <button 
          onClick={() => {
            if (cotizaciones.length === 0) { alert('No hay cotizaciones para exportar'); return; }
            cotizaciones.forEach((cot, idx) => {
              setTimeout(() => {
                const win = window.open('', '_blank');
                win.document.write(generatePDFWithSignature(cot, doctor));
                win.document.close();
              }, idx * 1000);
            });
          }}
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-xs font-bold hover:bg-indigo-700"
        >
          <FileSignature className="w-3.5 h-3.5 inline mr-1" />
          Exportar Todos los PDF
        </button>
      </div>

      {/* T-02: Estados - Gestión de cotización */}
      <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3">
          <FileText className="w-4 h-4 text-gray-600" />
          <h3 className="font-bold text-gray-700 text-sm">Estados de Cotización</h3>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button onClick={() => { const u = cotizaciones.map(c => ({ ...c, estado: 'pendiente' })); setCotizaciones(u); save(u); }} className="px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold">⏸ Pendiente</button>
          <button onClick={() => { const u = cotizaciones.map(c => ({ ...c, estado: 'enviada' })); setCotizaciones(u); save(u); }} className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold">✉️ Enviada</button>
          <button onClick={() => { const u = cotizaciones.map(c => ({ ...c, estado: 'aceptada' })); setCotizaciones(u); save(u); }} className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold">✅ Aceptada</button>
          <button onClick={() => { const u = cotizaciones.map(c => ({ ...c, estado: 'rechazada' })); setCotizaciones(u); save(u); }} className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold">❌ Rechazada</button>
        </div>
      </div>

      <div className="space-y-3">
        {cotizaciones.length === 0 ? <div className="text-center py-12 text-gray-400"><FileText className="w-12 h-12 mx-auto mb-2 opacity-40" /><p>No hay cotizaciones</p></div>
        : cotizaciones.map((c) => (
          <div key={c.id} className="bg-white border rounded-xl p-4 flex items-center justify-between">
            <div>
              <p className="font-bold text-sm text-gray-800">{c.empresa}</p>
              <p className="text-xs text-gray-500">{new Date(c.fecha).toLocaleDateString('es-CO')} — ${c.valor}</p>
              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold mt-1 ${
                c.estado === 'aceptada' ? 'bg-emerald-100 text-emerald-700' :
                c.estado === 'rechazada' ? 'bg-red-100 text-red-700' :
                c.estado === 'enviada' ? 'bg-blue-100 text-blue-700' :
                'bg-amber-100 text-amber-700'
              }`}>
                {c.estado === 'aceptada' ? '✅ Aceptada' :
                 c.estado === 'rechazada' ? '❌ Rechazada' :
                 c.estado === 'enviada' ? '✉️ Enviada' : '⏸ Pendiente'}
              </span>
            </div>
            <div className="flex gap-1">
              <button onClick={() => { const win = window.open('', '_blank'); win.document.write(generatePDFWithSignature(c, doctor)); win.document.close(); }} className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg" title="PDF Firmado"><FileSignature className="w-4 h-4" /></button>
              <button onClick={() => handlePrint(c)} className="p-2 text-emerald-600 hover:bg-emerald-50 rounded-lg"><Printer className="w-4 h-4" /></button>
              <button onClick={() => handleDelete(c.id)} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4" /></button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
