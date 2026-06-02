// src/pages/PortalCertificadosEmpresa.jsx
// Portal unificado para empresas - Visualización de todos los documentos
// Certificados, Informes, Cuentas de Cobro, Cartas de Custodia

import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import {
  Building2, FileText, Receipt, Shield, Download, Printer,
  Calendar, ChevronDown, ChevronUp, Loader2, AlertCircle,
  CheckCircle, FileSpreadsheet, FileCheck, UserCheck, ArrowLeft,
  Search, Filter, Package, Mail, Eye
} from 'lucide-react';
import { useCompanyDocuments, useCompanyCertificates, useCompanyReports, useCompanyBills, useCompanyCustodia } from '../hooks/useCompanyDocuments';
import { useAuthStore } from '../stores/authStore';
import { useBackendData, useBackendObject } from '../hooks/useBackendData';
import { 
  downloadCertificatesAsZip, 
  downloadCertificateAsHTML,
  downloadReportAsHTML,
  downloadBillAsHTML,
  downloadCustodiaAsHTML,
  downloadMultipleCertificates
} from '../utils/bulkDownload';
import { _generarCertificadoHTMLNormalizado } from '../shared/lib/printUtils';
import { openPrintWindow } from '../lib/printService';

// Tabs disponibles
const TABS = [
  { id: 'certificados', label: 'Certificados', icon: FileCheck, color: 'emerald' },
  { id: 'informes', label: 'Informes', icon: FileSpreadsheet, color: 'blue' },
  { id: 'cuentas', label: 'Cuentas de Cobro', icon: Receipt, color: 'green' },
  { id: 'custodia', label: 'Cartas de Custodia', icon: Shield, color: 'purple' },
];

// Helper para formatear fechas
const formatDate = (dateStr) => {
  if (!dateStr) return 'N/A';
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch {
    return dateStr;
  }
};

// Helper para formatear período
const formatPeriod = (mes, anio) => {
  if (!mes && !anio) return 'N/A';
  const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
  const mesNombre = meses[parseInt(mes) - 1] || mes;
  return `${mesNombre} ${anio}`;
};

export default function PortalCertificadosEmpresa() {
  const { companyId: urlCompanyId } = useParams();
  const [searchParams] = useSearchParams();
  const nitFromQuery = searchParams.get('nit');
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  
  // Estados
  const [activeTab, setActiveTab] = useState('certificados');
  const [selectedPeriod, setSelectedPeriod] = useState({ mes: '', anio: '' });
  const [searchTerm, setSearchTerm] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [selectedItems, setSelectedItems] = useState({});
  const [showFilters, setShowFilters] = useState(false);
  
  // Datos del médico para generar certificados
  const { data: doctorData } = useBackendObject('/data/doctor', 'siso_doctor_data', 'doctor');
  const { data: signatureData } = useBackendObject('/data/doctor_signature', 'siso_doctor_signature', 'signature');
  
  // Datos de la empresa
  const { data: companies } = useBackendData('/data/companies', 'siso_companies', 'companies');
  const company = useMemo(() => {
    if (urlCompanyId) {
      return companies.find(c => c.id === urlCompanyId);
    }
    if (nitFromQuery) {
      const nitLimpio = nitFromQuery.replace(/[^0-9]/g, '');
      return companies.find(c => (c.nit || '').replace(/[^0-9]/g, '') === nitLimpio);
    }
    return null;
  }, [companies, urlCompanyId, nitFromQuery]);
  
  // Hooks para obtener documentos
  const { 
    certificates, 
    reports, 
    bills, 
    cartas,
    loading: docsLoading, 
    error: docsError,
    refresh 
  } = useCompanyDocuments(company?.id, nitFromQuery);
  
  // Filtrar por período y búsqueda
  const filteredCertificates = useMemo(() => {
    let result = certificates;
    if (selectedPeriod.mes || selectedPeriod.anio) {
      result = result.filter(c => {
        const fecha = c.fechaExamen || c.cerradaAt || '';
        const [anio, mes] = fecha.split('-');
        return (!selectedPeriod.mes || mes === selectedPeriod.mes) &&
               (!selectedPeriod.anio || anio === selectedPeriod.anio);
      });
    }
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(c => 
        (c.nombres || '').toLowerCase().includes(term) ||
        (c.docNumero || '').includes(term)
      );
    }
    return result;
  }, [certificates, selectedPeriod, searchTerm]);
  
  const filteredReports = useMemo(() => {
    let result = reports;
    if (selectedPeriod.mes || selectedPeriod.anio) {
      result = result.filter(r => {
        const inicio = r.periodoInicio || '';
        const fin = r.periodoFin || '';
        return inicio.includes(`${selectedPeriod.anio}-${selectedPeriod.mes}`) ||
               fin.includes(`${selectedPeriod.anio}-${selectedPeriod.mes}`);
      });
    }
    return result;
  }, [reports, selectedPeriod]);
  
  const filteredBills = useMemo(() => {
    let result = bills;
    if (selectedPeriod.mes || selectedPeriod.anio) {
      result = result.filter(b => 
        b.periodoMes === selectedPeriod.mes || 
        b.periodoAnio === selectedPeriod.anio ||
        (b.fecha || '').includes(`${selectedPeriod.anio}-${selectedPeriod.mes}`)
      );
    }
    return result;
  }, [bills, selectedPeriod]);
  
  const filteredCartas = useMemo(() => {
    let result = cartas;
    if (selectedPeriod.mes || selectedPeriod.anio) {
      result = result.filter(c => 
        c.mes === selectedPeriod.mes || 
        c.anio === selectedPeriod.anio
      );
    }
    return result;
  }, [cartas, selectedPeriod]);
  
  // Handlers
  const handleDownloadCertificate = (cert) => {
    const activeDoctor = doctorData || { nombre: currentUser?.nombre || 'Médico' };
    const sig = signatureData?.signature || null;
    downloadCertificateAsHTML(cert, activeDoctor, sig, 
      `certificado_${cert.docNumero}_${cert.nombres?.replace(/\s+/g, '_')}.html`
    );
  };
  
  const handleDownloadAllCertificates = async () => {
    if (filteredCertificates.length === 0) return;
    
    setDownloading(true);
    try {
      const activeDoctor = doctorData || { nombre: currentUser?.nombre || 'Médico' };
      const sig = signatureData?.signature || null;
      
      await downloadCertificatesAsZip(
        filteredCertificates, 
        activeDoctor, 
        sig,
        company?.nombre || company?.razonSocial || 'Empresa'
      );
    } catch (err) {
      console.error('Error descargando ZIP:', err);
      alert('Error al generar archivo ZIP. Intente descargar individualmente.');
    } finally {
      setDownloading(false);
    }
  };
  
  const handlePrintCertificate = (cert) => {
    const activeDoctor = doctorData || { nombre: currentUser?.nombre || 'Médico' };
    const sig = signatureData?.signature || null;
    const html = _generarCertificadoHTMLNormalizado(cert, activeDoctor, sig);
    openPrintWindow(`Certificado - ${cert.nombres}`, html);
  };
  
  const handleDownloadReport = (report) => {
    downloadReportAsHTML(report, `informe_${report.empresaNombre?.replace(/\s+/g, '_')}_${report.periodoInicio}.html`);
  };
  
  const handleDownloadBill = (bill) => {
    downloadBillAsHTML(bill, `cuenta_cobro_${bill.numero}.html`);
  };
  
  const handleDownloadCustodia = (carta) => {
    downloadCustodiaAsHTML(carta);
  };
  
  // Render helpers
  const renderCertificadosTab = () => (
    <div className="space-y-4">
      {/* Acciones masivas */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex items-center gap-2">
          <FileCheck className="w-5 h-5 text-emerald-600" />
          <span className="font-bold text-gray-800">
            {filteredCertificates.length} certificados
          </span>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleDownloadAllCertificates}
            disabled={downloading || filteredCertificates.length === 0}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {downloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Package className="w-4 h-4" />
            )}
            Descargar todos (ZIP)
          </button>
        </div>
      </div>
      
      {/* Lista de certificados */}
      {filteredCertificates.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
          <FileCheck className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No hay certificados para este período</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredCertificates.map((cert) => (
            <div 
              key={cert.id} 
              className="bg-white p-4 rounded-xl border border-gray-200 hover:border-emerald-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900">{cert.nombres}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                      cert.conceptoAptitud?.toLowerCase().includes('apto') 
                        ? 'bg-green-100 text-green-700'
                        : cert.conceptoAptitud?.toLowerCase().includes('no apto')
                        ? 'bg-red-100 text-red-700'
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {cert.conceptoAptitud || 'Pendiente'}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 space-y-1">
                    <p><span className="font-medium">Documento:</span> {cert.docTipo} {cert.docNumero}</p>
                    <p><span className="font-medium">Fecha examen:</span> {formatDate(cert.fechaExamen)}</p>
                    <p><span className="font-medium">Vigencia:</span> {cert.vigencia || 'N/A'}</p>
                    <p><span className="font-medium">Código verificación:</span> 
                      <span className="font-mono text-xs bg-gray-100 px-2 py-0.5 rounded ml-1">
                        {cert.codigoVerificacion}
                      </span>
                    </p>
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => handleDownloadCertificate(cert)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-xs font-bold hover:bg-emerald-100"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Descargar
                  </button>
                  <button
                    onClick={() => handlePrintCertificate(cert)}
                    className="flex items-center gap-1 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-lg text-xs font-bold hover:bg-gray-100"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    Imprimir
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
  
  const renderInformesTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-blue-600" />
          <span className="font-bold text-gray-800">
            {filteredReports.length} informes
          </span>
        </div>
      </div>
      
      {filteredReports.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
          <FileSpreadsheet className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No hay informes para este período</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredReports.map((report) => (
            <div 
              key={report.id} 
              className="bg-white p-4 rounded-xl border border-gray-200 hover:border-blue-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1">
                    Informe {report.tipoInforme || 'Epidemiológico'}
                  </h3>
                  <div className="text-sm text-gray-500 space-y-1">
                    <p><span className="font-medium">Período:</span> {formatDate(report.periodoInicio)} - {formatDate(report.periodoFin)}</p>
                    <p><span className="font-medium">Total trabajadores:</span> {report.totalTrabajadores || 'N/A'}</p>
                    <p><span className="font-medium">Generado:</span> {formatDate(report.fechaGeneracion)}</p>
                    <p><span className="font-medium">Por:</span> {report.generadoPorNombre || report.generadoPor}</p>
                  </div>
                  {report.resumenEjecutivo && (
                    <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                      <span className="font-medium">Resumen:</span> {report.resumenEjecutivo}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleDownloadReport(report)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold hover:bg-blue-100"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
  
  const renderCuentasTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex items-center gap-2">
          <Receipt className="w-5 h-5 text-green-600" />
          <span className="font-bold text-gray-800">
            {filteredBills.length} cuentas de cobro
          </span>
        </div>
      </div>
      
      {filteredBills.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
          <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No hay cuentas de cobro para este período</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredBills.map((bill) => (
            <div 
              key={bill.id} 
              className="bg-white p-4 rounded-xl border border-gray-200 hover:border-green-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-gray-900">Cuenta de Cobro #{bill.numero}</h3>
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-green-100 text-green-700">
                      ${(bill.totalCalculado || bill.total || 0).toLocaleString('es-CO')}
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 space-y-1">
                    <p><span className="font-medium">Fecha:</span> {formatDate(bill.fecha)}</p>
                    <p><span className="font-medium">Período:</span> {formatPeriod(bill.periodoMes, bill.periodoAnio)}</p>
                    <p><span className="font-medium">Trabajadores:</span> {bill.cantidadTrabajadores || (bill.trabajadorIds?.length || 0)}</p>
                  </div>
                  {bill.trabajadorIds && bill.trabajadorIds.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs font-medium text-gray-600 mb-1">Trabajadores incluidos:</p>
                      <div className="flex flex-wrap gap-1">
                        {bill.trabajadorIds.slice(0, 5).map((tid, i) => (
                          <span key={i} className="text-xs bg-gray-100 px-2 py-0.5 rounded">
                            {tid.substring(0, 8)}...
                          </span>
                        ))}
                        {bill.trabajadorIds.length > 5 && (
                          <span className="text-xs text-gray-500">
                            +{bill.trabajadorIds.length - 5} más
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                <button
                  onClick={() => handleDownloadBill(bill)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-green-50 text-green-700 rounded-lg text-xs font-bold hover:bg-green-100"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
  
  const renderCustodiaTab = () => (
    <div className="space-y-4">
      <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-gray-200">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-purple-600" />
          <span className="font-bold text-gray-800">
            {filteredCartas.length} cartas de custodia
          </span>
        </div>
      </div>
      
      {filteredCartas.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
          <Shield className="w-12 h-12 text-gray-300 mx-auto mb-3" />
          <p className="text-gray-500 font-medium">No hay cartas de custodia para este período</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {filteredCartas.map((carta) => (
            <div 
              key={carta.id} 
              className="bg-white p-4 rounded-xl border border-gray-200 hover:border-purple-300 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <h3 className="font-bold text-gray-900 mb-1">
                    Carta de Custodia - {formatPeriod(carta.mes, carta.anio)}
                  </h3>
                  <div className="text-sm text-gray-500 space-y-1">
                    <p><span className="font-medium">Fecha de carta:</span> {formatDate(carta.fechaCarta)}</p>
                    <p><span className="font-medium">Ciudad:</span> {carta.ciudadDestino || 'N/A'}</p>
                    <p><span className="font-medium">Médico:</span> {carta.medicoNombre || 'N/A'}</p>
                    {carta.enviadaPorEmail && (
                      <p className="text-purple-600 text-xs">
                        <Mail className="w-3 h-3 inline mr-1" />
                        Enviada por email: {carta.emailDestino}
                      </p>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => handleDownloadCustodia(carta)}
                  className="flex items-center gap-1 px-3 py-1.5 bg-purple-50 text-purple-700 rounded-lg text-xs font-bold hover:bg-purple-100"
                >
                  <Download className="w-3.5 h-3.5" />
                  Descargar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
  
  // Loading state
  if (docsLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Cargando documentos...</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (docsError) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-xl border border-red-200">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-red-600 font-bold mb-2">Error al cargar documentos</p>
          <p className="text-gray-500 text-sm">{docsError}</p>
          <button 
            onClick={refresh}
            className="mt-4 px-4 py-2 bg-red-50 text-red-700 rounded-lg text-sm font-bold hover:bg-red-100"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }
  
  // No company found
  if (!company) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-6 bg-white rounded-xl border border-gray-200">
          <Building2 className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-800 font-bold mb-2">Empresa no encontrada</p>
          <p className="text-gray-500 text-sm mb-4">
            No se encontró una empresa con el ID o NIT proporcionado.
          </p>
          <button 
            onClick={() => navigate('/companies')}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-bold hover:bg-emerald-700"
          >
            Ver empresas
          </button>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 pb-20">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-4">
            <button
              onClick={() => navigate(-1)}
              className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver
            </button>
            <div className="flex items-start justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                  <Building2 className="w-6 h-6 text-emerald-600" />
                  {company.nombre || company.razonSocial || 'Empresa'}
                </h1>
                <p className="text-sm text-gray-500 mt-1">
                  NIT: {company.nit || 'N/A'} • 
                  {company.actividadeconomica && ` ${company.actividadeconomica} •`}
                  {' '}Portal de Documentos
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-black text-emerald-600">
                  {certificates.length + reports.length + bills.length + cartas.length}
                </p>
                <p className="text-xs text-gray-500">documentos totales</p>
              </div>
            </div>
          </div>
          
          {/* Tabs */}
          <div className="flex gap-1 overflow-x-auto pb-1">
            {TABS.map((tab) => {
              const Icon = tab.icon;
              const isActive = activeTab === tab.id;
              const count = {
                certificados: certificates.length,
                informes: reports.length,
                cuentas: bills.length,
                custodia: cartas.length
              }[tab.id];
              
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-2 px-4 py-2 rounded-t-lg text-sm font-bold whitespace-nowrap transition-colors ${
                    isActive 
                      ? `bg-${tab.color}-50 text-${tab.color}-700 border-b-2 border-${tab.color}-500`
                      : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {tab.label}
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-xs ${
                    isActive ? `bg-${tab.color}-100 text-${tab.color}-700` : 'bg-gray-100 text-gray-600'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
      
      {/* Filters */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
        <div className="bg-white p-4 rounded-xl border border-gray-200 mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-bold text-gray-800 flex items-center gap-2">
              <Filter className="w-4 h-4" />
              Filtros
            </h3>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>
          
          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Mes</label>
                <select
                  value={selectedPeriod.mes}
                  onChange={(e) => setSelectedPeriod(p => ({ ...p, mes: e.target.value }))}
                  className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="">Todos los meses</option>
                  <option value="01">Enero</option>
                  <option value="02">Febrero</option>
                  <option value="03">Marzo</option>
                  <option value="04">Abril</option>
                  <option value="05">Mayo</option>
                  <option value="06">Junio</option>
                  <option value="07">Julio</option>
                  <option value="08">Agosto</option>
                  <option value="09">Septiembre</option>
                  <option value="10">Octubre</option>
                  <option value="11">Noviembre</option>
                  <option value="12">Diciembre</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Año</label>
                <select
                  value={selectedPeriod.anio}
                  onChange={(e) => setSelectedPeriod(p => ({ ...p, anio: e.target.value }))}
                  className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                >
                  <option value="">Todos los años</option>
                  {Array.from({ length: 10 }, (_, i) => {
                    const year = new Date().getFullYear() - i;
                    return <option key={year} value={String(year)}>{year}</option>;
                  })}
                </select>
              </div>
              
              <div>
                <label className="block text-xs font-bold text-gray-600 mb-1 uppercase">Buscar</label>
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-2.5 text-gray-400" />
                  <input
                    type="text"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Nombre o documento..."
                    className="w-full pl-9 pr-3 py-2 border border-gray-200 rounded-lg text-sm"
                  />
                </div>
              </div>
            </div>
          )}
          
          {/* Active filters */}
          {(selectedPeriod.mes || selectedPeriod.anio || searchTerm) && (
            <div className="flex flex-wrap gap-2 mt-3 pt-3 border-t border-gray-100">
              {selectedPeriod.mes && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs">
                  Mes: {selectedPeriod.mes}
                  <button onClick={() => setSelectedPeriod(p => ({ ...p, mes: '' }))}>×</button>
                </span>
              )}
              {selectedPeriod.anio && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs">
                  Año: {selectedPeriod.anio}
                  <button onClick={() => setSelectedPeriod(p => ({ ...p, anio: '' }))}>×</button>
                </span>
              )}
              {searchTerm && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-700 rounded text-xs">
                  Búsqueda: {searchTerm}
                  <button onClick={() => setSearchTerm('')}>×</button>
                </span>
              )}
              <button
                onClick={() => {
                  setSelectedPeriod({ mes: '', anio: '' });
                  setSearchTerm('');
                }}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Limpiar todos
              </button>
            </div>
          )}
        </div>
        
        {/* Tab content */}
        <div className="min-h-[400px]">
          {activeTab === 'certificados' && renderCertificadosTab()}
          {activeTab === 'informes' && renderInformesTab()}
          {activeTab === 'cuentas' && renderCuentasTab()}
          {activeTab === 'custodia' && renderCustodiaTab()}
        </div>
      </div>
    </div>
  );
}
