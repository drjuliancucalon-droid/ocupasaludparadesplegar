// src/pages/Companies.jsx
// ═══════════════════════════════════════════════════════════════════════
// EMPRESAS — Gestión completa de empresas/clientes: CRUD, convenios,
// tarifas, portal empresa, multi-sede, perfil IPS
// ═══════════════════════════════════════════════════════════════════════
import React, { useState, useMemo, useCallback, useRef } from 'react';
import {
  Building2, Plus, Search, Trash2, Edit3, Eye, X, Save, Upload,
  Users, MapPin, Phone, Mail, FileText, Calendar, DollarSign,
  Shield, Globe, ChevronDown, ChevronUp, CheckCircle2, AlertTriangle,
  Briefcase, UserPlus, Settings, Copy, Lock, Unlock, Image,
  Building, CreditCard, Star, ExternalLink,
} from 'lucide-react';
import { _isAdmin, _isAdminOrEmpresa } from '../shared/data/planConfig.js';

// ═══════════════════════════════════════════════════════════════════════
// COMPANIES COMPONENT
// ═══════════════════════════════════════════════════════════════════════
export default function Companies({
  companies = [], setCompanies, newComp = {}, setNewComp,
  patientsList = [], currentUser, _sync, goTo, initialCompanyState,
  // Companies tab state from App
  companiesTab, setCompaniesTab, editingCompany, setEditingCompany,
  // Encuestas
  encuestas = [], setEncuestas,
  // IPS mode
  mode,
  ipsPerfilForm, setIpsPerfilForm,
  // Portal empresa
  portalActivadoInfo, setPortalActivadoInfo,
  portalEmpresaAdmin, setPortalEmpresaAdmin,
  sedeForm, setSedeForm,
  // Sync helpers
  _syncCompanies, _sbSet,
  showAlert, showConfirm,
  usersList = [],
  ...rest
}) {
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [detailCompany, setDetailCompany] = useState(null);
  const [showConvenio, setShowConvenio] = useState(false);
  const logoInputRef = useRef(null);

  // ── IPS Profile mode ────────────────────────────────────────────────
  if (mode === 'perfilips') return renderPerfilIPS();

  // ── Format COP ──────────────────────────────────────────────────────
  const formatCOP = (n) => {
    const v = parseFloat(n) || 0;
    return v.toLocaleString('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 });
  };

  // ── Filter companies ────────────────────────────────────────────────
  const filteredCompanies = useMemo(() => {
    if (!searchTerm) return companies;
    const q = searchTerm.toLowerCase();
    return companies.filter(c =>
      (c.nombre || '').toLowerCase().includes(q) ||
      (c.nit || '').toLowerCase().includes(q) ||
      (c.ciudad || '').toLowerCase().includes(q) ||
      (c.gerente || '').toLowerCase().includes(q)
    );
  }, [companies, searchTerm]);

  // ── Patient count for company ───────────────────────────────────────
  const getPatientCount = useCallback((comp) => {
    return patientsList.filter(p =>
      p.empresaId === comp.id || p.empresaNit === comp.nit ||
      (p.empresaNombre || '').toLowerCase() === (comp.nombre || '').toLowerCase()
    ).length;
  }, [patientsList]);

  // ── Reset form ──────────────────────────────────────────────────────
  const resetForm = () => {
    if (initialCompanyState) {
      setNewComp({ ...initialCompanyState });
    } else {
      setNewComp({
        nombre: '', nit: '', dv: '', codActividad: '', actividad: '',
        direccion: '', ciudad: '', telefono: '', correo: '', arl: '', gerente: '',
        tarifaIngreso: '', tarifaPeriodico: '', tarifaEgreso: '', tarifaConsulta: '',
        condicionesPago: 'contado', convenioFecha: '', convenioVencimiento: '',
        descuento: '', portalActivo: false, notasConvenio: '',
        medicoIds: [], sedes: [], logo: '', lema: '',
      });
    }
  };

  // ── Save company ────────────────────────────────────────────────────
  const handleSaveCompany = () => {
    if (!newComp.nombre || !newComp.nit) {
      showAlert?.('⚠️ Nombre y NIT son obligatorios.');
      return;
    }

    const companyToSave = {
      ...newComp,
      id: editingCompany?.id || 'EMP-' + Date.now(),
      fechaCreacion: editingCompany?.fechaCreacion || new Date().toISOString(),
      ultimaModificacion: new Date().toISOString(),
      creadoPor: currentUser?.user,
    };

    setCompanies(prev => {
      const exists = prev.findIndex(c => c.id === companyToSave.id);
      const updated = exists >= 0
        ? prev.map(c => c.id === companyToSave.id ? companyToSave : c)
        : [...prev, companyToSave];
      _syncCompanies?.(updated);
      return updated;
    });

    resetForm();
    setShowModal(false);
    setEditingCompany?.(null);
    showAlert?.(`✅ Empresa "${companyToSave.nombre}" guardada.`);
  };

  // ── Edit company ────────────────────────────────────────────────────
  const handleEditCompany = (comp) => {
    setNewComp({ ...comp });
    setEditingCompany?.(comp);
    setShowModal(true);
  };

  // ── Delete company ──────────────────────────────────────────────────
  const handleDeleteCompany = (comp) => {
    showConfirm?.(`¿Eliminar la empresa "${comp.nombre}"? Esta acción no se puede deshacer.`, () => {
      setCompanies(prev => {
        const updated = prev.filter(c => c.id !== comp.id);
        _syncCompanies?.(updated);
        return updated;
      });
      showAlert?.(`🗑️ Empresa "${comp.nombre}" eliminada.`);
    });
  };

  // ── Logo upload ─────────────────────────────────────────────────────
  const handleLogoUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 500 * 1024) {
      showAlert?.('⚠️ El logo debe ser menor a 500 KB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setNewComp(prev => ({ ...prev, logo: reader.result }));
    };
    reader.readAsDataURL(file);
  };

  // ── Toggle portal ───────────────────────────────────────────────────
  const handleTogglePortal = (comp) => {
    setCompanies(prev => {
      const updated = prev.map(c =>
        c.id === comp.id ? { ...c, portalActivo: !c.portalActivo } : c
      );
      _syncCompanies?.(updated);
      return updated;
    });
    showAlert?.(comp.portalActivo ? '🔒 Portal empresa desactivado.' : '🌐 Portal empresa activado.');
  };

  // ── Add sede ────────────────────────────────────────────────────────
  const handleAddSede = () => {
    if (!sedeForm?.nombre || !sedeForm?.ciudad) {
      showAlert?.('⚠️ Complete nombre y ciudad de la sede.');
      return;
    }
    setNewComp(prev => ({
      ...prev,
      sedes: [...(prev.sedes || []), { ...sedeForm, id: 'SEDE-' + Date.now() }],
    }));
    setSedeForm?.({ nombre: '', ciudad: '', direccion: '' });
  };

  // ── Encuestas: Create ───────────────────────────────────────────────
  const [newEncuesta, setNewEncuesta] = useState({ empresaId: '', empresaNombre: '', tipoExamen: 'INGRESO', fechaLimite: '' });
  
  const handleCrearEncuesta = () => {
    if (!newEncuesta.empresaId || !newEncuesta.empresaNombre) {
      showAlert?.('⚠️ Seleccione una empresa.');
      return;
    }
    const token = Math.random().toString(36).substring(2, 10);
    const enc = {
      id: Date.now(),
      token,
      empresaId: newEncuesta.empresaId,
      empresaNombre: newEncuesta.empresaNombre,
      tipoExamen: newEncuesta.tipoExamen,
      fechaLimite: newEncuesta.fechaLimite,
      fechaCreacion: new Date().toISOString(),
      respuestas: [],
      estado: 'activa',
    };
    const updated = [...encuestas, enc];
    setEncuestas?.(updated);
    localStorage.setItem("siso_encuestas", JSON.stringify(updated));
    const url = window.location.origin + window.location.pathname + "#encuesta?token=" + token;
    showAlert?.("✅ Encuesta creada!\n\n📋 Link:\n" + url + "\n\nComparta este link con los trabajadores.");
    setNewEncuesta({ empresaId: '', empresaNombre: '', tipoExamen: 'INGRESO', fechaLimite: '' });
  };

  // ── Encuestas: Ver respuestas ───────────────────────────────────────
  const handleVerRespuestas = (enc) => {
    showAlert?.(`📊 Encuesta: ${enc.empresaNombre}\n\nToken: ${enc.token}\nEstado: ${enc.estado}\nRespuestas: ${enc.respuestas?.length || 0}\n\n(En versión completa mostraría tabla de trabajadores)`);
  };

  // ── Copiar link ─────────────────────────────────────────────────────
  const handleCopiarLink = (token) => {
    const url = window.location.origin + window.location.pathname + "#encuesta?token=" + token;
    navigator.clipboard?.writeText(url);
    showAlert?.("📋 Link copiado al portapapeles:\n" + url);
  };

  // ── Remove sede ─────────────────────────────────────────────────────
  const handleRemoveSede = (sedeId) => {
    setNewComp(prev => ({
      ...prev,
      sedes: (prev.sedes || []).filter(s => s.id !== sedeId),
    }));
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: COMPANY MODAL
  // ═══════════════════════════════════════════════════════════════════════
  const renderModal = () => {
    if (!showModal) return null;
    return (
      <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl max-w-3xl w-full my-8">
          {/* Modal header */}
          <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-t-2xl p-5 text-white flex items-center justify-between">
            <h3 className="font-black text-lg flex items-center gap-2">
              <Building2 className="w-5 h-5" />
              {editingCompany ? `Editar: ${editingCompany.nombre}` : 'Nueva Empresa'}
            </h3>
            <button onClick={() => { setShowModal(false); resetForm(); setEditingCompany?.(null); }}
              className="p-1 hover:bg-white/20 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-6 max-h-[70vh] overflow-y-auto">
            {/* Logo */}
            <div className="flex items-center gap-4">
              {newComp.logo ? (
                <img src={newComp.logo} alt="Logo" className="w-16 h-16 rounded-xl object-cover border" />
              ) : (
                <div className="w-16 h-16 bg-gray-100 rounded-xl flex items-center justify-center">
                  <Image className="w-6 h-6 text-gray-400" />
                </div>
              )}
              <div>
                <button onClick={() => logoInputRef.current?.click()}
                  className="flex items-center gap-2 px-3 py-1.5 bg-purple-100 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-200">
                  <Upload className="w-3 h-3" /> Subir Logo
                </button>
                <p className="text-[10px] text-gray-400 mt-1">PNG/JPG, máx 500 KB</p>
                <input type="file" ref={logoInputRef} accept="image/*" className="hidden" onChange={handleLogoUpload} />
              </div>
            </div>

            {/* Datos básicos */}
            <div>
              <h4 className="font-black text-sm text-gray-800 mb-3 flex items-center gap-2">
                <Building className="w-4 h-4 text-purple-600" /> Datos de la Empresa
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-gray-600 block mb-1">Razón Social *</label>
                  <input type="text" value={newComp.nombre || ''}
                    onChange={e => setNewComp(p => ({ ...p, nombre: e.target.value }))}
                    className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Nombre de la empresa" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">NIT *</label>
                  <input type="text" value={newComp.nit || ''}
                    onChange={e => setNewComp(p => ({ ...p, nit: e.target.value }))}
                    className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="900.123.456" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">DV</label>
                  <input type="text" maxLength={1} value={newComp.dv || ''}
                    onChange={e => setNewComp(p => ({ ...p, dv: e.target.value }))}
                    className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="0" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Actividad Económica</label>
                  <input type="text" value={newComp.actividad || ''}
                    onChange={e => setNewComp(p => ({ ...p, actividad: e.target.value }))}
                    className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="CIIU" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Código Actividad</label>
                  <input type="text" value={newComp.codActividad || ''}
                    onChange={e => setNewComp(p => ({ ...p, codActividad: e.target.value }))}
                    className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Ej: 8621" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs font-bold text-gray-600 block mb-1">Dirección</label>
                  <input type="text" value={newComp.direccion || ''}
                    onChange={e => setNewComp(p => ({ ...p, direccion: e.target.value }))}
                    className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Dirección completa" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Ciudad</label>
                  <input type="text" value={newComp.ciudad || ''}
                    onChange={e => setNewComp(p => ({ ...p, ciudad: e.target.value }))}
                    className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Ciudad" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Teléfono</label>
                  <input type="tel" value={newComp.telefono || ''}
                    onChange={e => setNewComp(p => ({ ...p, telefono: e.target.value }))}
                    className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="3001234567" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Correo</label>
                  <input type="email" value={newComp.correo || ''}
                    onChange={e => setNewComp(p => ({ ...p, correo: e.target.value }))}
                    className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="correo@empresa.com" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">ARL</label>
                  <input type="text" value={newComp.arl || ''}
                    onChange={e => setNewComp(p => ({ ...p, arl: e.target.value }))}
                    className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="ARL de la empresa" />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-600 block mb-1">Gerente / Representante Legal</label>
                  <input type="text" value={newComp.gerente || ''}
                    onChange={e => setNewComp(p => ({ ...p, gerente: e.target.value }))}
                    className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    placeholder="Nombre completo" />
                </div>
              </div>
            </div>

            {/* Convenio */}
            <div>
              <button onClick={() => setShowConvenio(!showConvenio)}
                className="flex items-center gap-2 text-sm font-black text-indigo-700 hover:text-indigo-900">
                {showConvenio ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                <CreditCard className="w-4 h-4" /> Convenio / Tarifas
              </button>
              {showConvenio && (
                <div className="mt-3 bg-indigo-50 border border-indigo-200 rounded-xl p-4 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">Tarifa Ingreso (COP)</label>
                      <input type="number" min="0" value={newComp.tarifaIngreso || ''}
                        onChange={e => setNewComp(p => ({ ...p, tarifaIngreso: e.target.value }))}
                        className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                        placeholder="0" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">Tarifa Periódico (COP)</label>
                      <input type="number" min="0" value={newComp.tarifaPeriodico || ''}
                        onChange={e => setNewComp(p => ({ ...p, tarifaPeriodico: e.target.value }))}
                        className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                        placeholder="0" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">Tarifa Egreso (COP)</label>
                      <input type="number" min="0" value={newComp.tarifaEgreso || ''}
                        onChange={e => setNewComp(p => ({ ...p, tarifaEgreso: e.target.value }))}
                        className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                        placeholder="0" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">Tarifa Consulta (COP)</label>
                      <input type="number" min="0" value={newComp.tarifaConsulta || ''}
                        onChange={e => setNewComp(p => ({ ...p, tarifaConsulta: e.target.value }))}
                        className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                        placeholder="0" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">Condiciones de Pago</label>
                      <select value={newComp.condicionesPago || 'contado'}
                        onChange={e => setNewComp(p => ({ ...p, condicionesPago: e.target.value }))}
                        className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500">
                        <option value="contado">Contado</option>
                        <option value="30dias">30 días</option>
                        <option value="60dias">60 días</option>
                        <option value="90dias">90 días</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">Descuento (%)</label>
                      <input type="number" min="0" max="100" value={newComp.descuento || ''}
                        onChange={e => setNewComp(p => ({ ...p, descuento: e.target.value }))}
                        className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                        placeholder="0" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">Fecha Convenio</label>
                      <input type="date" value={newComp.convenioFecha || ''}
                        onChange={e => setNewComp(p => ({ ...p, convenioFecha: e.target.value }))}
                        className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                    </div>
                    <div>
                      <label className="text-xs font-bold text-gray-600 block mb-1">Vencimiento Convenio</label>
                      <input type="date" value={newComp.convenioVencimiento || ''}
                        onChange={e => setNewComp(p => ({ ...p, convenioVencimiento: e.target.value }))}
                        className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500" />
                    </div>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-600 block mb-1">Notas del Convenio</label>
                    <textarea value={newComp.notasConvenio || ''}
                      onChange={e => setNewComp(p => ({ ...p, notasConvenio: e.target.value }))}
                      className="w-full p-2.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
                      rows={2} placeholder="Observaciones adicionales..." />
                  </div>
                </div>
              )}
            </div>

            {/* Multi-sede */}
            <div>
              <h4 className="font-black text-sm text-gray-800 mb-3 flex items-center gap-2">
                <MapPin className="w-4 h-4 text-teal-600" /> Sedes
              </h4>
              <div className="space-y-2">
                {(newComp.sedes || []).map(sede => (
                  <div key={sede.id || sede.nombre} className="flex items-center justify-between bg-gray-50 rounded-lg p-3">
                    <div>
                      <p className="text-sm font-bold">{sede.nombre}</p>
                      <p className="text-xs text-gray-500">{sede.ciudad} — {sede.direccion}</p>
                    </div>
                    <button onClick={() => handleRemoveSede(sede.id)}
                      className="text-red-400 hover:text-red-600">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mt-2">
                <input type="text" value={sedeForm?.nombre || ''} onChange={e => setSedeForm?.(p => ({ ...p, nombre: e.target.value }))}
                  className="p-2 border border-gray-200 rounded-lg text-xs" placeholder="Nombre sede" />
                <input type="text" value={sedeForm?.ciudad || ''} onChange={e => setSedeForm?.(p => ({ ...p, ciudad: e.target.value }))}
                  className="p-2 border border-gray-200 rounded-lg text-xs" placeholder="Ciudad" />
                <input type="text" value={sedeForm?.direccion || ''} onChange={e => setSedeForm?.(p => ({ ...p, direccion: e.target.value }))}
                  className="p-2 border border-gray-200 rounded-lg text-xs" placeholder="Dirección" />
                <button onClick={handleAddSede}
                  className="px-3 py-2 bg-teal-600 text-white rounded-lg text-xs font-bold hover:bg-teal-700">
                  + Agregar Sede
                </button>
              </div>
            </div>
          </div>

          {/* Modal footer */}
          <div className="p-5 border-t border-gray-100 flex gap-3 justify-end">
            <button onClick={() => { setShowModal(false); resetForm(); setEditingCompany?.(null); }}
              className="px-5 py-2.5 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200">
              Cancelar
            </button>
            <button onClick={handleSaveCompany}
              className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 shadow">
              <Save className="w-4 h-4" /> {editingCompany ? 'Actualizar' : 'Guardar'}
            </button>
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: COMPANY DETAIL
  // ═══════════════════════════════════════════════════════════════════════
  const renderDetail = () => {
    if (!detailCompany) return null;
    const c = detailCompany;
    const patCount = getPatientCount(c);

    return (
      <div className="fixed inset-0 bg-black/40 flex items-start justify-center z-50 p-4 overflow-y-auto">
        <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full my-8">
          <div className="bg-gradient-to-r from-indigo-600 to-blue-600 rounded-t-2xl p-5 text-white flex items-center justify-between">
            <div className="flex items-center gap-3">
              {c.logo ? (
                <img src={c.logo} alt="" className="w-12 h-12 rounded-xl object-cover border-2 border-white/30" />
              ) : (
                <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center">
                  <Building2 className="w-6 h-6" />
                </div>
              )}
              <div>
                <h3 className="font-black text-lg">{c.nombre}</h3>
                <p className="text-blue-100 text-sm">NIT: {c.nit}{c.dv ? `-${c.dv}` : ''}</p>
              </div>
            </div>
            <button onClick={() => setDetailCompany(null)} className="p-1 hover:bg-white/20 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-6 space-y-5">
            {/* Stats */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-blue-50 rounded-xl p-3 text-center">
                <p className="text-xs font-bold text-blue-600">Pacientes</p>
                <p className="text-xl font-black text-blue-700">{patCount}</p>
              </div>
              <div className="bg-emerald-50 rounded-xl p-3 text-center">
                <p className="text-xs font-bold text-emerald-600">Tarifa Ingreso</p>
                <p className="text-sm font-black text-emerald-700">{c.tarifaIngreso ? formatCOP(c.tarifaIngreso) : '—'}</p>
              </div>
              <div className="bg-purple-50 rounded-xl p-3 text-center">
                <p className="text-xs font-bold text-purple-600">Sedes</p>
                <p className="text-xl font-black text-purple-700">{(c.sedes || []).length || 1}</p>
              </div>
              <div className="bg-amber-50 rounded-xl p-3 text-center">
                <p className="text-xs font-bold text-amber-600">Portal</p>
                <p className="text-sm font-black text-amber-700">{c.portalActivo ? '🟢 Activo' : '🔴 Inactivo'}</p>
              </div>
            </div>

            {/* Info grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              <div className="flex items-start gap-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-gray-700">Dirección</p>
                  <p className="text-gray-500">{c.direccion || 'No registrada'}, {c.ciudad || ''}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Phone className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-gray-700">Teléfono</p>
                  <p className="text-gray-500">{c.telefono || 'No registrado'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Mail className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-gray-700">Correo</p>
                  <p className="text-gray-500">{c.correo || 'No registrado'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Shield className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-gray-700">ARL</p>
                  <p className="text-gray-500">{c.arl || 'No registrada'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Users className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-gray-700">Gerente</p>
                  <p className="text-gray-500">{c.gerente || 'No registrado'}</p>
                </div>
              </div>
              <div className="flex items-start gap-2">
                <Briefcase className="w-4 h-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-bold text-gray-700">Actividad</p>
                  <p className="text-gray-500">{c.actividad || 'No registrada'}</p>
                </div>
              </div>
            </div>

            {/* Convenio info */}
            {(c.tarifaIngreso || c.condicionesPago || c.convenioFecha) && (
              <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4">
                <h4 className="font-black text-sm text-indigo-800 mb-2">📋 Convenio</h4>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <p><strong>Pago:</strong> {c.condicionesPago || 'Contado'}</p>
                  <p><strong>Descuento:</strong> {c.descuento ? `${c.descuento}%` : '0%'}</p>
                  <p><strong>Desde:</strong> {c.convenioFecha || '—'}</p>
                  <p><strong>Hasta:</strong> {c.convenioVencimiento || '—'}</p>
                </div>
                {c.notasConvenio && <p className="text-xs text-gray-600 mt-2 italic">{c.notasConvenio}</p>}
              </div>
            )}

            {/* Sedes */}
            {(c.sedes || []).length > 0 && (
              <div>
                <h4 className="font-black text-sm text-gray-800 mb-2">🏢 Sedes</h4>
                <div className="space-y-2">
                  {c.sedes.map((s, i) => (
                    <div key={s.id || i} className="bg-gray-50 rounded-lg p-3 text-sm">
                      <p className="font-bold">{s.nombre}</p>
                      <p className="text-gray-500 text-xs">{s.ciudad} — {s.direccion}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div className="p-5 border-t border-gray-100 flex gap-3 flex-wrap">
            <button onClick={() => { setDetailCompany(null); handleEditCompany(c); }}
              className="flex items-center gap-2 px-4 py-2 bg-amber-100 text-amber-700 rounded-xl text-sm font-bold hover:bg-amber-200">
              <Edit3 className="w-4 h-4" /> Editar
            </button>
            <button onClick={() => handleTogglePortal(c)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold ${
                c.portalActivo
                  ? 'bg-red-100 text-red-700 hover:bg-red-200'
                  : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
              }`}>
              {c.portalActivo ? <Lock className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
              {c.portalActivo ? 'Desactivar Portal' : 'Activar Portal'}
            </button>
            {/* NUEVO: Botón para acceder al portal de certificados */}
            {c.portalActivo && (
              <button 
                onClick={() => goTo?.('portal-certificados-empresa', { empresaId: c.id })}
                className="flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-700 rounded-xl text-sm font-bold hover:bg-blue-200"
              >
                <ExternalLink className="w-4 h-4" /> Portal Certificados
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

  // ═══════════════════════════════════════════════════════════════════════
  // RENDER: PERFIL IPS
  // ═══════════════════════════════════════════════════════════════════════
  function renderPerfilIPS() {
    const handleSaveIPS = () => {
      if (!ipsPerfilForm?.nombre) {
        showAlert?.('⚠️ Ingrese el nombre de la IPS.');
        return;
      }
      const myComp = companies.find(c => c.id === currentUser?.empresaId);
      if (myComp) {
        setCompanies(prev => {
          const updated = prev.map(c =>
            c.id === myComp.id ? { ...c, ...ipsPerfilForm } : c
          );
          _syncCompanies?.(updated);
          return updated;
        });
      }
      showAlert?.('✅ Perfil IPS actualizado.');
    };

    return (
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="bg-gradient-to-r from-violet-600 to-purple-600 rounded-2xl p-6 text-white">
          <h2 className="text-xl font-black flex items-center gap-2">
            <Settings className="w-6 h-6" /> Perfil IPS
          </h2>
          <p className="text-violet-100 text-sm mt-1">Configure los datos de su institución</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-gray-600 block mb-1">Nombre IPS</label>
              <input type="text" value={ipsPerfilForm?.nombre || ''}
                onChange={e => setIpsPerfilForm?.(p => ({ ...p, nombre: e.target.value }))}
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">NIT</label>
              <input type="text" value={ipsPerfilForm?.nit || ''}
                onChange={e => setIpsPerfilForm?.(p => ({ ...p, nit: e.target.value }))}
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">DV</label>
              <input type="text" value={ipsPerfilForm?.dv || ''}
                onChange={e => setIpsPerfilForm?.(p => ({ ...p, dv: e.target.value }))}
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Ciudad</label>
              <input type="text" value={ipsPerfilForm?.ciudad || ''}
                onChange={e => setIpsPerfilForm?.(p => ({ ...p, ciudad: e.target.value }))}
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Teléfono</label>
              <input type="tel" value={ipsPerfilForm?.telefono || ''}
                onChange={e => setIpsPerfilForm?.(p => ({ ...p, telefono: e.target.value }))}
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-bold text-gray-600 block mb-1">Dirección</label>
              <input type="text" value={ipsPerfilForm?.direccion || ''}
                onChange={e => setIpsPerfilForm?.(p => ({ ...p, direccion: e.target.value }))}
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Correo</label>
              <input type="email" value={ipsPerfilForm?.correo || ''}
                onChange={e => setIpsPerfilForm?.(p => ({ ...p, correo: e.target.value }))}
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm" />
            </div>
            <div>
              <label className="text-xs font-bold text-gray-600 block mb-1">Lema</label>
              <input type="text" value={ipsPerfilForm?.lema || ''}
                onChange={e => setIpsPerfilForm?.(p => ({ ...p, lema: e.target.value }))}
                className="w-full p-2.5 border border-gray-200 rounded-lg text-sm" />
            </div>
          </div>
          <button onClick={handleSaveIPS}
            className="flex items-center gap-2 px-5 py-2.5 bg-purple-600 text-white rounded-xl font-bold text-sm hover:bg-purple-700 shadow">
            <Save className="w-4 h-4" /> Guardar Perfil
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-purple-600 to-indigo-600 rounded-2xl p-6 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-xl font-black flex items-center gap-2">
              <Building2 className="w-6 h-6" /> Empresas
            </h2>
            <p className="text-purple-100 text-sm mt-1">{companies.length} empresas registradas</p>
          </div>
          {(_isAdmin(currentUser?.role) || currentUser?.role === 'medico') && (
            <button onClick={() => { resetForm(); setEditingCompany?.(null); setShowModal(true); }}
              className="flex items-center gap-2 px-4 py-2.5 bg-white/20 hover:bg-white/30 rounded-xl font-bold text-sm">
              <Plus className="w-4 h-4" /> Nueva Empresa
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input type="text" value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
          placeholder="Buscar por nombre, NIT, ciudad o gerente..." />
      </div>

      {/* Company list */}
      {filteredCompanies.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-10 text-center">
          <Building2 className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-bold">
            {searchTerm ? 'No se encontraron empresas' : 'No hay empresas registradas'}
          </p>
          <p className="text-gray-400 text-xs mt-1">
            {searchTerm ? 'Intente con otro término de búsqueda' : 'Agregue su primera empresa'}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredCompanies.map(comp => {
            const patCount = getPatientCount(comp);
            const isExpiring = comp.convenioVencimiento &&
              new Date(comp.convenioVencimiento) <= new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) &&
              new Date(comp.convenioVencimiento) >= new Date();

            return (
              <div key={comp.id || comp.nit}
                className="bg-white border border-gray-200 rounded-xl p-5 hover:shadow-lg transition group">
                <div className="flex items-start gap-3">
                  {comp.logo ? (
                    <img src={comp.logo} alt="" className="w-12 h-12 rounded-xl object-cover border" />
                  ) : (
                    <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Building2 className="w-6 h-6 text-purple-600" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-black text-gray-800 text-sm truncate">{comp.nombre}</p>
                      {comp.portalActivo && (
                        <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-[9px] font-black rounded-md">PORTAL</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">NIT: {comp.nit}{comp.dv ? `-${comp.dv}` : ''}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[10px] text-gray-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> {comp.ciudad || '—'}
                      </span>
                      <span className="text-[10px] text-blue-600 font-bold flex items-center gap-1">
                        <Users className="w-3 h-3" /> {patCount} pacientes
                      </span>
                      {(comp.sedes || []).length > 0 && (
                        <span className="text-[10px] text-teal-600 font-bold">{comp.sedes.length} sedes</span>
                      )}
                    </div>
                    {isExpiring && (
                      <p className="text-[10px] text-amber-600 font-bold mt-1 flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" /> Convenio próximo a vencer ({comp.convenioVencimiento})
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2 mt-3 opacity-0 group-hover:opacity-100 transition">
                  <button onClick={() => setDetailCompany(comp)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200">
                    <Eye className="w-3 h-3" /> Ver
                  </button>
                  <button onClick={() => handleEditCompany(comp)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-bold hover:bg-amber-200">
                    <Edit3 className="w-3 h-3" /> Editar
                  </button>
                  <button onClick={() => handleTogglePortal(comp)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-200">
                    <Globe className="w-3 h-3" /> Portal
                  </button>
                  {_isAdmin(currentUser?.role) && (
                    <button onClick={() => handleDeleteCompany(comp)}
                      className="flex items-center gap-1 px-3 py-1.5 bg-red-100 text-red-700 rounded-lg text-xs font-bold hover:bg-red-200">
                      <Trash2 className="w-3 h-3" /> Eliminar
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modals */}
      {renderModal()}
      {renderDetail()}

      {/* ── SECCIÓN ENCUESTAS SOCIODEMOGRÁFICAS ── */}
      <div className="bg-gradient-to-r from-teal-600 to-cyan-600 rounded-2xl p-6 text-white mt-8">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-black flex items-center gap-2">
              📋 Encuestas Sociodemográficas
            </h3>
            <p className="text-teal-100 text-sm mt-1">{encuestas.length} encuestas creadas</p>
          </div>
        </div>
      </div>

      {/* Crear nueva encuesta */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h4 className="font-bold text-gray-800 mb-4 text-sm">Crear Nueva Encuesta</h4>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Empresa</label>
            <select 
              value={newEncuesta.empresaId}
              onChange={e => {
                const emp = companies.find(c => c.id === e.target.value);
                setNewEncuesta({ ...newEncuesta, empresaId: e.target.value, empresaNombre: emp?.nombre || '' });
              }}
              className="w-full p-2.5 border border-gray-200 rounded-lg text-sm"
            >
              <option value="">Seleccionar empresa</option>
              {companies.map(c => (
                <option key={c.id} value={c.id}>{c.nombre}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Tipo Examen</label>
            <select 
              value={newEncuesta.tipoExamen}
              onChange={e => setNewEncuesta({ ...newEncuesta, tipoExamen: e.target.value })}
              className="w-full p-2.5 border border-gray-200 rounded-lg text-sm"
            >
              <option value="INGRESO">Ingreso</option>
              <option value="PERIODICO">Periódico</option>
              <option value="EGRESO">Egreso</option>
              <option value="RETIRO">Retiro</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">Fecha Límite</label>
            <input 
              type="date" 
              value={newEncuesta.fechaLimite}
              onChange={e => setNewEncuesta({ ...newEncuesta, fechaLimite: e.target.value })}
              className="w-full p-2.5 border border-gray-200 rounded-lg text-sm"
            />
          </div>
          <div className="flex items-end">
            <button 
              onClick={handleCrearEncuesta}
              className="w-full px-4 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-bold hover:bg-teal-700"
            >
              🔗 Crear Link
            </button>
          </div>
        </div>
      </div>

      {/* Lista de encuestas */}
      {encuestas.length === 0 ? (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-8 text-center">
          <FileText className="w-10 h-10 text-gray-300 mx-auto mb-2" />
          <p className="text-gray-500 text-sm">No hay encuestas creadas</p>
          <p className="text-gray-400 text-xs">Cree una上方 para comenzar</p>
        </div>
      ) : (
        <div className="space-y-3">
          {[...encuestas].reverse().map(enc => (
            <div key={enc.id} className="bg-white border border-gray-200 rounded-xl p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-bold text-gray-800">{enc.empresaNombre}</p>
                  <p className="text-xs text-gray-500">
                    {enc.tipoExamen} · {enc.fechaCreacion?.split('T')[0]} · 
                    <span className={`ml-1 font-bold ${enc.estado === 'activa' ? 'text-green-600' : 'text-gray-500'}`}>
                      {enc.estado}
                    </span>
                  </p>
                </div>
                <div className="flex gap-2">
                  <button 
                    onClick={() => handleCopiarLink(enc.token)}
                    className="px-3 py-1.5 bg-blue-100 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-200"
                  >
                    📋 Copiar Link
                  </button>
                  <button 
                    onClick={() => handleVerRespuestas(enc)}
                    className="px-3 py-1.5 bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-200"
                  >
                    👁️ Ver Respuestas ({enc.respuestas?.length || 0})
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
