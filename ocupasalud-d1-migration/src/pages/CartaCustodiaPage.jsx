// src/pages/CartaCustodiaPage.jsx
// Módulo Carta de Custodia — Historias Clínicas Ocupacionales
// Réplica exacta del documento oficial emitido por el Dr. Julián Cucalón
import React, { useState, useMemo, useCallback, useRef } from 'react';
import { useBackendData, useBackendObject } from '../hooks/useBackendData';
import { useAuthStore } from '../stores/authStore';
import {
  Printer, Save, Mail, Building2, Calendar,
  FileText, Check, ChevronDown, User, Info,
} from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────
const MONTHS_ES = [
  'enero','febrero','marzo','abril','mayo','junio',
  'julio','agosto','septiembre','octubre','noviembre','diciembre',
];

const formatDateEs = (isoDate) => {
  const [y, m, d] = isoDate.split('-').map(Number);
  return `${d} de ${MONTHS_ES[m - 1]} de ${y}`;
};

const SB_URL = import.meta.env.VITE_SUPABASE_URL || 'https://yqrrktrgoijgzccrxnpz.supabase.co';
const SB_KEY = import.meta.env.VITE_SUPABASE_KEY || 'sb_publishable_K88qYuJ9wsWjQqnIhLVK7Q_NroFvPI7';
const sbH = { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`, 'Content-Type': 'application/json' };

// ─── Componente ────────────────────────────────────────────────────────────
export default function CartaCustodiaPage() {
  const { currentUser } = useAuthStore();
  const { data: companies } = useBackendData('/data/companies', 'siso_companies_drcucalon', 'companies');
  const { data: doctor }    = useBackendObject('/data/doctor', 'siso_doctor_data_drcucalon', 'doctor');
  const { data: signature } = useBackendObject('/data/doctor_signature', 'siso_doctor_signature', 'signature');

  // ── Estado del formulario ──
  const today = new Date();
  const [selectedCompanyId, setSelectedCompanyId] = useState('');
  const [fechaCarta, setFechaCarta] = useState(today.toISOString().split('T')[0]);
  const [mesVal, setMesVal]   = useState(today.getMonth() === 0 ? 11 : today.getMonth() - 1);
  const [anioVal, setAnioVal] = useState(today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear());
  const [ciudadDest, setCiudadDest] = useState('Ciudad');
  const [saving, setSaving]   = useState(false);
  const [saved, setSaved]     = useState(false);

  // ── Datos del médico ──
  const docNombreRaw  = doctor?.nombre  || currentUser?.nombre || 'JULIAN CUCALON';
  const docNombre     = docNombreRaw.toUpperCase();
  const docTituloRaw  = doctor?.titulo  || 'Medico Especialista en SST';
  const docTitulo     = docTituloRaw.toUpperCase();
  const docLicencia   = doctor?.licencia || '14497-12-2019';
  const docCC         = doctor?.cedula  || doctor?.rut || '1061750704';
  const docCel        = doctor?.celular || '3182213979';
  const docEmail      = doctor?.email   || 'dr.juliancucalon@gmail.com';
  const docCiudad     = doctor?.ciudad  || 'Popayán';
  const firmaSrc      = typeof signature === 'string' ? signature
                      : signature?.data || doctor?.signature || doctor?.firma || null;

  // ── Empresa seleccionada ──
  const selectedCompany = useMemo(
    () => (companies || []).find(c => c.id === selectedCompanyId),
    [companies, selectedCompanyId]
  );
  const empresaNombre = selectedCompany?.nombre || selectedCompany?.empresaNombre || 'NOMBRE DE LA EMPRESA';
  const empresaNit = selectedCompany?.nit || '';
  const ciudadDisplay = selectedCompany?.ciudad || ciudadDest;

  const mesTexto  = MONTHS_ES[mesVal];
  const fechaTexto = formatDateEs(fechaCarta);

  // ── Guardar en Supabase ──
  const handleSave = useCallback(async () => {
    if (!selectedCompanyId) { alert('Selecciona una empresa primero'); return; }
    setSaving(true);
    try {
      const res  = await fetch(`${SB_URL}/rest/v1/siso_store?key=eq.siso_cartas_custodia&select=value`, { headers: sbH });
      const rows = await res.json();
      const prev = Array.isArray(rows?.[0]?.value) ? rows[0].value : [];
      const nueva = {
        id: `cust_${Date.now()}`,
        empresaId: selectedCompanyId,
        empresaNombre,
        empresaNit,
        fecha: fechaCarta,
        mes: mesVal, anio: anioVal,
        mesTexto: MONTHS_ES[mesVal],
        medicoNombre: docNombre,
        medicoLicencia: docLicencia,
        medicoCC: docCC,
        medicoTitulo: docTitulo,
        medicoCel: docCel,
        medicoEmail: docEmail,
        medicoCiudad: docCiudad,
        ciudadDest: ciudadDest,
        savedAt: new Date().toISOString(),
        // Referencias para el portal de empresas
        referenciaEmpresa: {
          nit: empresaNit,
          nombre: empresaNombre,
          empresaId: selectedCompanyId,
          periodo: `${MONTHS_ES[mesVal]} ${anioVal}`,
          mes: mesVal,
          anio: anioVal,
          fechaGeneracion: new Date().toISOString(),
          tipoDocumento: 'Carta de Custodia'
        }
      };
      await fetch(`${SB_URL}/rest/v1/siso_store`, {
        method: 'POST',
        headers: { ...sbH, Prefer: 'resolution=merge-duplicates,return=minimal' },
        body: JSON.stringify({ key: 'siso_cartas_custodia', value: [...prev, nueva], updated_at: new Date().toISOString() }),
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) { alert('Error guardando: ' + e.message); }
    finally { setSaving(false); }
  }, [selectedCompanyId, empresaNombre, empresaNit, fechaCarta, mesVal, anioVal, docNombre, docLicencia, docCC, docTitulo, docCel, docEmail, docCiudad, ciudadDest]);

  const handleEmail = () => {
    const to  = selectedCompany?.email || selectedCompany?.correo || '';
    const sub = encodeURIComponent(`Carta Custodia HC Ocupacionales - ${mesTexto} ${anioVal}`);
    const bod = encodeURIComponent(
      `Estimados señores ${empresaNombre},\n\n` +
      `Adjunto encontrarán la Carta de Custodia de las Historias Clínicas Ocupacionales ` +
      `del personal valorado durante el mes de ${mesTexto} de ${anioVal}.\n\n` +
      `Atentamente,\n${docNombre}\n${docTitulo}`
    );
    window.location.href = `mailto:${to}?subject=${sub}&body=${bod}`;
  };

  // ─────────────────────────────────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div className="flex h-screen bg-gray-200 overflow-hidden">

      {/* ══════════════════════════════════════════════
          PRINT STYLES — oculta el panel izquierdo
      ═══════════════════════════════════════════════ */}
      <style>{`
        @media print {.carta-wrap { padding: 0 !important; background: white !important; }
          .no-print  { display: none !important; }
          .carta-wrap { padding: 0 !important; background: white !important; }
          .carta-doc  { box-shadow: none !important; margin: 0 !important; width: 100% !important; }
          @page { margin: 0; size: letter portrait; }
          body { background: white; }
        }
      `}</style>

      {/* ══════════════ PANEL IZQUIERDO — EDITOR ══════════════ */}
      <div className="no-print w-72 bg-white border-r border-gray-200 flex flex-col flex-shrink-0 shadow-lg z-10">

        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-800 to-teal-700 p-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-white" />
            <div>
              <h2 className="text-sm font-black text-white leading-tight">Carta de Custodia</h2>
              <p className="text-[10px] text-emerald-300">Historias Clínicas Ocupacionales</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4">

          {/* Empresa */}
          <div>
            <label className="flex items-center gap-1 text-xs font-bold text-gray-700 mb-1.5">
              <Building2 className="w-3.5 h-3.5 text-emerald-600" /> Empresa destinataria *
            </label>
            <select
              value={selectedCompanyId}
              onChange={e => {
                setSelectedCompanyId(e.target.value);
                const co = (companies || []).find(c => c.id === e.target.value);
                if (co?.ciudad) setCiudadDest(co.ciudad);
              }}
              className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white"
            >
              <option value="">— Seleccionar empresa —</option>
              {(companies || []).map(c => (
                <option key={c.id} value={c.id}>{c.nombre || c.empresaNombre}</option>
              ))}
            </select>
          </div>

          {/* Fecha carta */}
          <div>
            <label className="flex items-center gap-1 text-xs font-bold text-gray-700 mb-1.5">
              <Calendar className="w-3.5 h-3.5 text-emerald-600" /> Fecha de la carta
            </label>
            <input type="date" value={fechaCarta} onChange={e => setFechaCarta(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
          </div>

          {/* Mes/Año valoraciones */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">
              Mes de valoraciones
            </label>
            <div className="flex gap-2">
              <select value={mesVal} onChange={e => setMesVal(Number(e.target.value))}
                className="flex-1 text-xs border border-gray-300 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white capitalize">
                {MONTHS_ES.map((m, i) => <option key={i} value={i}>{m}</option>)}
              </select>
              <input type="number" value={anioVal} onChange={e => setAnioVal(Number(e.target.value))}
                min="2020" max="2035"
                className="w-20 text-xs border border-gray-300 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400" />
            </div>
          </div>

          {/* Ciudad */}
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1.5">Ciudad destinatario</label>
            <input type="text" value={ciudadDest} onChange={e => setCiudadDest(e.target.value)}
              className="w-full text-xs border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-400"
              placeholder="Ciudad" />
          </div>

          {/* Doctor info */}
          <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-3 space-y-0.5">
            <p className="text-[10px] font-bold text-emerald-800 mb-1.5 flex items-center gap-1">
              <User className="w-3 h-3" /> Médico (auto desde perfil)
            </p>
            <p className="text-[10px] text-gray-700"><span className="font-bold">Nombre:</span> {docNombre}</p>
            <p className="text-[10px] text-gray-700"><span className="font-bold">CC:</span> {docCC}</p>
            <p className="text-[10px] text-gray-700"><span className="font-bold">Licencia:</span> {docLicencia}</p>
            <p className="text-[10px] text-gray-700"><span className="font-bold">Cel:</span> {docCel}</p>
            <p className="text-[10px] text-gray-700"><span className="font-bold">Email:</span> {docEmail}</p>
            {firmaSrc
              ? <p className="text-[10px] text-emerald-700 font-bold mt-1">✅ Firma digital cargada</p>
              : <p className="text-[10px] text-amber-600 mt-1">⚠ Sin firma (configura en Perfil)</p>}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-2.5">
            <p className="text-[10px] text-blue-700 flex items-start gap-1">
              <Info className="w-3 h-3 mt-0.5 shrink-0" />
              Vista previa en tiempo real → panel derecho. Usa Imprimir para generar el PDF.
            </p>
          </div>
        </div>

        {/* Botones de acción */}
        <div className="p-4 border-t border-gray-200 space-y-2 flex-shrink-0">
          <button onClick={() => window.print()}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition shadow-sm">
            <Printer className="w-4 h-4" /> Imprimir / Descargar PDF
          </button>
          <button onClick={handleSave} disabled={saving}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition border-2 ${
              saved ? 'bg-emerald-50 border-emerald-500 text-emerald-700' : 'bg-white border-emerald-300 text-emerald-700 hover:bg-emerald-50'
            } disabled:opacity-50`}>
            {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
            {saving ? 'Guardando…' : saved ? '¡Guardado!' : 'Guardar carta'}
          </button>
          <button onClick={handleEmail} disabled={!selectedCompanyId}
            className="w-full flex items-center justify-center gap-2 py-2.5 bg-white border-2 border-sky-300 text-sky-700 rounded-lg text-xs font-bold hover:bg-sky-50 disabled:opacity-40 transition">
            <Mail className="w-4 h-4" /> Enviar por Email
          </button>
        </div>
      </div>

      {/* ══════════════ PANEL DERECHO — DOCUMENTO ══════════════ */}
      <div className="flex-1 overflow-auto carta-wrap p-8 flex justify-center items-start">
        <CartaDocumento
          docNombre={docNombre}
          docTitulo={docTitulo}
          docLicencia={docLicencia}
          docCC={docCC}
          docCel={docCel}
          docEmail={docEmail}
          docCiudad={docCiudad}
          firmaSrc={firmaSrc}
          fechaTexto={fechaTexto}
          empresaNombre={empresaNombre}
          ciudadDest={ciudadDisplay}
          mesTexto={mesTexto}
          anioVal={anioVal}
        />
      </div>
    </div>
  );
}

// ─── Documento — réplica exacta del PDF ───────────────────────────────────
function CartaDocumento({
  docNombre, docTitulo, docLicencia, docCC, docCel, docEmail, docCiudad,
  firmaSrc, fechaTexto, empresaNombre, ciudadDest, mesTexto, anioVal,
}) {
  const s = {
    wrap: {
      fontFamily: '"Arial", "Helvetica", sans-serif',
      fontSize: '11pt',
      color: '#111',
      background: 'white',
      width: '816px',
      minHeight: '1056px',
      padding: '40px 60px 40px',
      boxSizing: 'border-box',
      position: 'relative',
    },
    // Header row
    headerRow: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: '8px',
    },
    // Logo area
    logoWrap: { display: 'flex', alignItems: 'center', gap: '10px' },
    logoBadge: {
      width: '50px', height: '50px',
      background: 'linear-gradient(135deg, #065f46 0%, #0f766e 100%)',
      borderRadius: '10px',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0,
    },
    logoBadgeText: { color: 'white', fontWeight: 900, fontSize: '15px', letterSpacing: '-0.5px' },
    doctorBrand: { lineHeight: 1 },
    doctorBrandName: { fontSize: '13pt', fontWeight: 900, color: '#111', margin: 0, lineHeight: 1.25 },
    doctorBrandSub:  { fontSize: '7.5pt', color: '#4B5563', margin: 0, letterSpacing: '0.06em', marginTop: '3px' },
    // Right info
    rightInfo: { textAlign: 'right', fontSize: '8.5pt', color: '#374151', lineHeight: 1.55 },
    // Separator
    sep: {
      height: '2px',
      background: 'linear-gradient(90deg, #065f46 0%, #0f766e 60%, #0d9488 100%)',
      margin: '10px 0 24px',
      border: 'none',
    },
    // Body
    p: { fontSize: '11pt', lineHeight: '1.65', marginBottom: '14px', textAlign: 'justify' },
    pClosing: { fontSize: '11pt', lineHeight: '1.65', marginBottom: '52px' },
    // Subject
    subject: { textAlign: 'center', fontWeight: 700, fontSize: '11pt', marginBottom: '26px' },
    // Footer
    footerSep: { height: '1px', background: '#374151', margin: '12px 0 10px', border: 'none' },
    footerText: { textAlign: 'center', fontSize: '8pt', color: '#374151', lineHeight: 1.8, margin: 0 },
  };

  return (
    <div className="carta-doc shadow-2xl" style={s.wrap}>

      {/* ── ENCABEZADO ── */}
      <div style={s.headerRow}>
        {/* Izquierda: Logo */}
        <div style={s.logoWrap}>
          <div style={s.logoBadge}>
            <span style={s.logoBadgeText}>JC</span>
          </div>
          <div style={s.doctorBrand}>
            <p style={s.doctorBrandName}>DR. JULIAN CUCALON</p>
            <p style={s.doctorBrandSub}>MEDICO ESPECIALISTA EN SST</p>
          </div>
        </div>
        {/* Derecha: Datos del médico */}
        <div style={s.rightInfo}>
          <p style={{ margin: 0, fontWeight: 700 }}>{docNombre}</p>
          <p style={{ margin: 0 }}>Licencia: Resolución {docLicencia} (Cauca)</p>
          <p style={{ margin: 0 }}>{docCiudad.toUpperCase()}</p>
          <p style={{ margin: 0 }}>Cel: {docCel}</p>
          <p style={{ margin: 0 }}>Email: {docEmail.toUpperCase()}</p>
        </div>
      </div>

      {/* ── SEPARADOR TEAL ── */}
      <hr style={s.sep} />

      {/* ── FECHA ── */}
      <p style={{ textAlign: 'right', marginBottom: '28px', fontSize: '11pt' }}>
        {fechaTexto}
      </p>

      {/* ── DESTINATARIO ── */}
      <div style={{ marginBottom: '28px' }}>
        <p style={{ margin: 0, fontSize: '11pt' }}>Señores</p>
        <p style={{ margin: 0, fontSize: '11pt', fontWeight: 700 }}>{empresaNombre}</p>
        <p style={{ margin: 0, fontSize: '11pt' }}>{ciudadDest}</p>
      </div>

      {/* ── ASUNTO ── */}
      <p style={s.subject}>
        ASUNTO: CARTA CUSTODIA DE LAS HISTORIAS CLÍNICAS OCUPACIONALES
      </p>

      {/* ── SALUDO ── */}
      <p style={s.p}>Cordial Saludo,</p>

      {/* ── PÁRRAFO 1 ── */}
      <p style={s.p}>
        Por medio de la presente se hace constar la custodia de las Historias Clínicas Ocupacionales
        del personal valorado durante el <strong>mes de {mesTexto} de {anioVal}.</strong>
      </p>

      {/* ── PÁRRAFO 2 ── */}
      <p style={s.p}>
        Dichas valoraciones fueron realizadas por el <strong>Dr. {docNombre}</strong>, identificado
        con cédula de ciudadanía número <strong>{docCC}</strong>, MEDICO ESPECIALISTA EN SST, con
        Licencia de Salud Ocupacional <strong>Resolución {docLicencia} (Cauca).</strong>
      </p>

      {/* ── PÁRRAFO 3 ── */}
      <p style={s.p}>
        Doy garantía de que el archivo de las historias clínicas se encuentra bajo custodia
        electrónica en la ciudad de {docCiudad}, dando así estricto cumplimiento a lo establecido en
        la <strong>Resolución 1072 de 2015</strong> del Ministerio de la Protección Social. La
        custodia está garantizada por un periodo de <strong>15 años</strong> contados a partir de la
        fecha de la última atención, conforme a lo dispuesto en la{' '}
        <strong>Resolución 1843 de 2025</strong> del Ministerio de Salud y Protección Social.
      </p>

      {/* ── PÁRRAFO 4 ── */}
      <p style={s.p}>
        Asimismo, se certifica que se cuenta con un sistema de historia clínica sistematizado que
        cumple a cabalidad con los requisitos técnicos y de seguridad exigidos por la normatividad
        vigente para garantizar la confidencialidad e integridad de la información.
      </p>

      {/* ── CIERRE ── */}
      <p style={s.pClosing}>Atentamente,</p>

      {/* ── FIRMA DIGITAL ── */}
      <div style={{ textAlign: 'center', marginBottom: '14px' }}>
        {firmaSrc ? (
          <img src={firmaSrc} alt="Firma digital"
            style={{ maxHeight: '72px', maxWidth: '190px', objectFit: 'contain', display: 'block', margin: '0 auto 6px' }} />
        ) : (
          <div style={{
            height: '64px', width: '190px', margin: '0 auto 6px',
            border: '1.5px dashed #9CA3AF', borderRadius: '6px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <span style={{ fontSize: '8pt', color: '#9CA3AF' }}>Firma digital</span>
          </div>
        )}
      </div>

      {/* ── SEPARADOR PIE ── */}
      <hr style={s.footerSep} />

      {/* ── PIE DE PÁGINA ── */}
      <div style={s.footerText}>
        <p style={{ margin: 0, fontWeight: 700 }}>{docNombre}</p>
        <p style={{ margin: 0 }}>{docTitulo}</p>
        <p style={{ margin: 0 }}>CC: {docCC}</p>
        <p style={{ margin: 0 }}>Licencia SST: Resolución {docLicencia} (Cauca)</p>
        <p style={{ margin: 0 }}>Cel: {docCel}</p>
        <p style={{ margin: 0 }}>
          Generado electrónicamente {docEmail} Integral de Salud Ocupacional
        </p>
        <p style={{ margin: 0 }}>{docCiudad} – Cauca</p>
      </div>
    </div>
  );
}
