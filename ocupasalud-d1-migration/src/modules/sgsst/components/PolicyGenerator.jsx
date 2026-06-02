/**
 * PolicyGenerator.jsx
 * Generador de Política de SST con asistente paso a paso
 * Decreto 1072/2015 Art. 2.2.4.6.5 y 2.2.4.6.6
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  FileText, ChevronRight, ChevronLeft, Check, Building2, Factory,
  AlertTriangle, Target, Eye, Edit3, Printer, Save, History,
  Download, Award, UserCheck, Clock, Plus, Trash2, CheckCircle2,
  XCircle, Info, PenTool, ArrowRight
} from 'lucide-react';
import { politicasCRUD, getCompanyConfig, generarPoliticaSST } from '../services/sgsstService';

const PolicyGenerator = () => {
  const [step, setStep] = useState(0);
  const [companyInfo, setCompanyInfo] = useState(getCompanyConfig());
  const [selectedRisks, setSelectedRisks] = useState([]);
  const [objectives, setObjectives] = useState([
    'Identificar los peligros, evaluar y valorar los riesgos y establecer los respectivos controles.',
    'Proteger la seguridad y salud de todos los trabajadores.',
    'Cumplir la normatividad nacional vigente aplicable en materia de riesgos laborales.',
  ]);
  const [newObjective, setNewObjective] = useState('');
  const [generatedPolicy, setGeneratedPolicy] = useState('');
  const [editMode, setEditMode] = useState(false);
  const [policies, setPolicies] = useState(politicasCRUD.getAll());
  const [showHistory, setShowHistory] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState('borrador'); // borrador, en_revision, aprobada
  const [approver, setApprover] = useState('');
  const [approvalDate, setApprovalDate] = useState('');
  const [approvalComments, setApprovalComments] = useState('');
  const printRef = useRef(null);

  const riskOptions = [
    'Físico (Ruido, vibraciones, iluminación, temperaturas)',
    'Químico (Sustancias químicas, gases, vapores, polvos)',
    'Biológico (Virus, bacterias, hongos, parásitos)',
    'Biomecánico (Posturas, movimientos repetitivos, manipulación de cargas)',
    'Psicosocial (Estrés, carga laboral, relaciones interpersonales)',
    'Condiciones de seguridad (Mecánico, eléctrico, locativo, trabajo en alturas)',
    'Fenómenos naturales (Sismos, inundaciones, vendavales)',
  ];

  const sectorOptions = [
    'Agricultura, ganadería, caza, silvicultura y pesca',
    'Explotación de minas y canteras',
    'Industria manufacturera',
    'Suministro de electricidad, gas, vapor y aire acondicionado',
    'Construcción',
    'Comercio al por mayor y al por menor',
    'Transporte y almacenamiento',
    'Alojamiento y servicios de comida',
    'Información y comunicaciones',
    'Actividades financieras y de seguros',
    'Actividades inmobiliarias',
    'Actividades profesionales, científicas y técnicas',
    'Actividades de servicios administrativos y de apoyo',
    'Administración pública y defensa',
    'Educación',
    'Actividades de atención de la salud humana',
    'Otro',
  ];

  const steps = [
    { title: 'Información de la Empresa', icon: Building2 },
    { title: 'Sector Económico', icon: Factory },
    { title: 'Riesgos Principales', icon: AlertTriangle },
    { title: 'Objetivos SST', icon: Target },
    { title: 'Vista Previa', icon: Eye },
    { title: 'Aprobación', icon: Award },
  ];

  const handleGenerate = () => {
    let policy = generarPoliticaSST(companyInfo);

    // Personalizar con riesgos seleccionados
    if (selectedRisks.length > 0) {
      const riskSection = `\nRIESGOS PRINCIPALES IDENTIFICADOS:\n\n${selectedRisks.map((r, i) => `${i + 1}. ${r}`).join('\n')}\n`;
      policy = policy.replace('ALCANCE:', `${riskSection}\nALCANCE:`);
    }

    // Personalizar con objetivos
    if (objectives.length > 0) {
      const objSection = `OBJETIVOS DEL SG-SST:\n\n${objectives.map((o, i) => `${i + 1}. ${o}`).join('\n')}\n\n`;
      policy = policy.replace('COMPROMISOS:', `${objSection}COMPROMISOS:`);
    }

    setGeneratedPolicy(policy);
  };

  useEffect(() => {
    if (step === 4) handleGenerate();
  }, [step]);

  const savePolicy = () => {
    const policyData = {
      contenido: generatedPolicy,
      companyInfo: { ...companyInfo },
      riesgos: [...selectedRisks],
      objetivos: [...objectives],
      estado: approvalStatus,
      aprobadoPor: approver,
      fechaAprobacion: approvalDate,
      comentarios: approvalComments,
      version: policies.length + 1,
    };
    politicasCRUD.create(policyData);
    setPolicies(politicasCRUD.getAll());
    alert('Política guardada exitosamente');
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Política SST - ${companyInfo.nombre || 'Empresa'}</title>
        <style>
          body { font-family: 'Times New Roman', serif; padding: 40px 60px; line-height: 1.6; color: #333; }
          h1 { text-align: center; font-size: 18pt; margin-bottom: 20px; }
          .content { white-space: pre-wrap; font-size: 12pt; text-align: justify; }
          .footer { margin-top: 40px; text-align: center; font-size: 10pt; color: #666; border-top: 1px solid #ccc; padding-top: 10px; }
          .watermark { position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); font-size: 80pt; color: rgba(200,200,200,0.2); z-index: -1; }
          @media print { .no-print { display: none; } }
        </style>
      </head>
      <body>
        ${approvalStatus !== 'aprobada' ? '<div class="watermark">BORRADOR</div>' : ''}
        <div class="content">${generatedPolicy.replace(/\n/g, '<br>')}</div>
        ${approvalStatus === 'aprobada' ? `
          <div style="margin-top:30px; padding:15px; border:2px solid #22c55e; text-align:center;">
            <strong>DOCUMENTO APROBADO</strong><br>
            Aprobado por: ${approver}<br>
            Fecha: ${new Date(approvalDate).toLocaleDateString('es-CO')}<br>
            ${approvalComments ? `Observaciones: ${approvalComments}` : ''}
          </div>
        ` : ''}
        <div class="footer">
          Documento generado el ${new Date().toLocaleDateString('es-CO')} | SG-SST conforme al Decreto 1072 de 2015
        </div>
        <script>window.print();</script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  const addObjective = () => {
    if (newObjective.trim()) {
      setObjectives(prev => [...prev, newObjective.trim()]);
      setNewObjective('');
    }
  };

  const loadPolicy = (policy) => {
    setGeneratedPolicy(policy.contenido);
    setCompanyInfo(policy.companyInfo || companyInfo);
    setSelectedRisks(policy.riesgos || []);
    setObjectives(policy.objetivos || []);
    setApprovalStatus(policy.estado || 'borrador');
    setApprover(policy.aprobadoPor || '');
    setApprovalDate(policy.fechaAprobacion || '');
    setStep(4);
    setShowHistory(false);
  };

  const statusColors = {
    borrador: 'bg-gray-100 text-gray-700',
    en_revision: 'bg-yellow-100 text-yellow-700',
    aprobada: 'bg-green-100 text-green-700',
  };

  const statusLabels = {
    borrador: 'Borrador',
    en_revision: 'En Revisión',
    aprobada: 'Aprobada',
  };

  return (
    <div className="p-4 md:p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <FileText className="w-7 h-7 text-blue-600" />
            Generador de Política SST
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            Decreto 1072/2015, Art. 2.2.4.6.5 y 2.2.4.6.6 — Política de Seguridad y Salud en el Trabajo
          </p>
        </div>
        <button onClick={() => setShowHistory(true)}
          className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 text-sm font-medium">
          <History className="w-4 h-4" /> Historial ({policies.length})
        </button>
      </div>

      {/* Stepper */}
      <div className="mb-8 overflow-x-auto">
        <div className="flex items-center min-w-max gap-1">
          {steps.map((s, i) => {
            const Icon = s.icon;
            const isActive = i === step;
            const isComplete = i < step;
            return (
              <React.Fragment key={i}>
                <button onClick={() => i <= step && setStep(i)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                    isActive ? 'bg-blue-600 text-white' : isComplete ? 'bg-blue-100 text-blue-700 cursor-pointer' : 'bg-gray-100 text-gray-400'
                  }`}>
                  {isComplete ? <CheckCircle2 className="w-4 h-4" /> : <Icon className="w-4 h-4" />}
                  <span className="hidden sm:inline">{s.title}</span>
                  <span className="sm:hidden">{i + 1}</span>
                </button>
                {i < steps.length - 1 && <ChevronRight className="w-4 h-4 text-gray-300 flex-shrink-0" />}
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Content */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        {/* Step 0: Company Info */}
        {step === 0 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Información de la Empresa</h2>
            <p className="text-sm text-gray-500 mb-4">Complete los datos básicos de su organización para la política SST.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { key: 'nombre', label: 'Razón Social *', placeholder: 'Nombre de la empresa' },
                { key: 'nit', label: 'NIT *', placeholder: '900.123.456-7' },
                { key: 'ciudad', label: 'Ciudad *', placeholder: 'Bogotá D.C.' },
                { key: 'direccion', label: 'Dirección', placeholder: 'Cra 7 #123-45' },
                { key: 'representanteLegal', label: 'Representante Legal *', placeholder: 'Nombre completo' },
                { key: 'responsableSST', label: 'Responsable del SG-SST', placeholder: 'Nombre del encargado' },
                { key: 'arl', label: 'ARL', placeholder: 'Nombre de la ARL' },
                { key: 'numTrabajadores', label: 'Número de Trabajadores', placeholder: '50', type: 'number' },
              ].map(({ key, label, placeholder, type }) => (
                <div key={key}>
                  <label className="text-sm font-medium text-gray-700">{label}</label>
                  <input type={type || 'text'} value={companyInfo[key] || ''}
                    onChange={e => setCompanyInfo(prev => ({ ...prev, [key]: type === 'number' ? parseInt(e.target.value) || 0 : e.target.value }))}
                    placeholder={placeholder}
                    className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500" />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Step 1: Sector */}
        {step === 1 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Sector Económico</h2>
            <p className="text-sm text-gray-500 mb-4">Seleccione o especifique la actividad económica principal de su empresa.</p>
            <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
              {sectorOptions.map(sector => (
                <label key={sector}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    companyInfo.sector === sector ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-300 hover:bg-gray-50'
                  }`}>
                  <input type="radio" name="sector" checked={companyInfo.sector === sector}
                    onChange={() => setCompanyInfo(prev => ({ ...prev, sector }))}
                    className="w-4 h-4 text-blue-600" />
                  <span className="text-sm text-gray-700">{sector}</span>
                </label>
              ))}
            </div>
            {companyInfo.sector === 'Otro' && (
              <input type="text" value={companyInfo.sectorOtro || ''}
                onChange={e => setCompanyInfo(prev => ({ ...prev, sectorOtro: e.target.value }))}
                placeholder="Especifique el sector..."
                className="w-full px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 mt-2" />
            )}
          </div>
        )}

        {/* Step 2: Risks */}
        {step === 2 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Riesgos Principales</h2>
            <p className="text-sm text-gray-500 mb-4">
              Seleccione los tipos de peligros a los que están expuestos sus trabajadores (GTC-45).
            </p>
            <div className="space-y-2">
              {riskOptions.map(risk => (
                <label key={risk}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                    selectedRisks.includes(risk) ? 'border-orange-500 bg-orange-50' : 'border-gray-200 hover:border-orange-300 hover:bg-gray-50'
                  }`}>
                  <input type="checkbox" checked={selectedRisks.includes(risk)}
                    onChange={() => {
                      setSelectedRisks(prev =>
                        prev.includes(risk) ? prev.filter(r => r !== risk) : [...prev, risk]
                      );
                    }}
                    className="w-4 h-4 rounded text-orange-600" />
                  <AlertTriangle className="w-4 h-4 text-orange-500" />
                  <span className="text-sm text-gray-700">{risk}</span>
                </label>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              <Info className="w-3 h-3 inline mr-1" />
              Estos riesgos se incluirán como parte de la política. La evaluación detallada se realiza en la Matriz IPEVR.
            </p>
          </div>
        )}

        {/* Step 3: Objectives */}
        {step === 3 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Objetivos del SG-SST</h2>
            <p className="text-sm text-gray-500 mb-4">
              Defina los objetivos de su SG-SST conforme al Art. 2.2.4.6.7 del Decreto 1072/2015.
              Deben ser claros, medibles, cuantificables y coherentes con el plan de trabajo.
            </p>
            <div className="space-y-2">
              {objectives.map((obj, i) => (
                <div key={i} className="flex items-start gap-2 p-3 bg-gray-50 rounded-lg">
                  <span className="text-sm font-medium text-blue-600 mt-0.5">{i + 1}.</span>
                  <span className="text-sm text-gray-700 flex-1">{obj}</span>
                  <button onClick={() => setObjectives(prev => prev.filter((_, idx) => idx !== i))}
                    className="text-red-400 hover:text-red-600 p-1"><Trash2 className="w-4 h-4" /></button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input type="text" value={newObjective} onChange={e => setNewObjective(e.target.value)}
                placeholder="Agregar nuevo objetivo..."
                onKeyDown={e => e.key === 'Enter' && addObjective()}
                className="flex-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              <button onClick={addObjective}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-1">
                <Plus className="w-4 h-4" /> Agregar
              </button>
            </div>
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-700">
                <Info className="w-3 h-3 inline mr-1" />
                Los objetivos deben ser: específicos, medibles, alcanzables, relevantes y con plazo definido (SMART).
                Art. 2.2.4.6.7 Dec. 1072/2015.
              </p>
            </div>
          </div>
        )}

        {/* Step 4: Preview */}
        {step === 4 && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-gray-800">Vista Previa de la Política</h2>
              <div className="flex gap-2">
                <button onClick={() => setEditMode(!editMode)}
                  className={`flex items-center gap-1 px-3 py-1.5 rounded-lg text-sm font-medium ${editMode ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}>
                  <Edit3 className="w-4 h-4" /> {editMode ? 'Modo Vista' : 'Editar'}
                </button>
                <button onClick={handlePrint}
                  className="flex items-center gap-1 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 text-sm font-medium">
                  <Printer className="w-4 h-4" /> Imprimir / PDF
                </button>
              </div>
            </div>
            {editMode ? (
              <textarea value={generatedPolicy} onChange={e => setGeneratedPolicy(e.target.value)}
                className="w-full h-[500px] px-4 py-3 border rounded-lg text-sm font-mono focus:ring-2 focus:ring-blue-500 resize-none" />
            ) : (
              <div ref={printRef} className="bg-white border rounded-lg p-8 shadow-inner max-h-[500px] overflow-y-auto">
                <pre className="whitespace-pre-wrap text-sm leading-relaxed font-serif text-gray-800">{generatedPolicy}</pre>
              </div>
            )}
          </div>
        )}

        {/* Step 5: Approval */}
        {step === 5 && (
          <div className="space-y-4">
            <h2 className="text-lg font-semibold text-gray-800 mb-2">Firma Digital y Aprobación</h2>
            <p className="text-sm text-gray-500 mb-4">
              La política debe ser firmada por el empleador o contratante (Art. 2.2.4.6.5 Dec. 1072/2015).
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">Estado</label>
                <select value={approvalStatus} onChange={e => setApprovalStatus(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500">
                  <option value="borrador">Borrador</option>
                  <option value="en_revision">En Revisión</option>
                  <option value="aprobada">Aprobada</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Aprobado por</label>
                <input type="text" value={approver} onChange={e => setApprover(e.target.value)}
                  placeholder="Nombre del aprobador"
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Fecha de Aprobación</label>
                <input type="date" value={approvalDate} onChange={e => setApprovalDate(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="text-sm font-medium text-gray-700">Cargo del Aprobador</label>
                <input type="text" placeholder="Representante Legal"
                  className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-700">Comentarios / Observaciones</label>
              <textarea value={approvalComments} onChange={e => setApprovalComments(e.target.value)}
                placeholder="Observaciones de la revisión..."
                className="w-full mt-1 px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 h-24 resize-none" />
            </div>

            {approvalStatus === 'aprobada' && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-green-600" />
                <div>
                  <p className="font-semibold text-green-800">Política Aprobada</p>
                  <p className="text-sm text-green-600">
                    Aprobada por {approver} el {approvalDate ? new Date(approvalDate).toLocaleDateString('es-CO') : '—'}
                  </p>
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={savePolicy}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                <Save className="w-5 h-5" /> Guardar Política (Versión {policies.length + 1})
              </button>
              <button onClick={handlePrint}
                className="flex items-center gap-2 px-4 py-3 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium">
                <Printer className="w-5 h-5" /> Exportar PDF
              </button>
            </div>
          </div>
        )}

        {/* Navigation */}
        <div className="flex justify-between mt-6 pt-4 border-t border-gray-100">
          <button onClick={() => setStep(Math.max(0, step - 1))} disabled={step === 0}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-30 disabled:cursor-not-allowed text-gray-700 hover:bg-gray-100">
            <ChevronLeft className="w-4 h-4" /> Anterior
          </button>
          {step < steps.length - 1 && (
            <button onClick={() => setStep(step + 1)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium">
              Siguiente <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* History Modal */}
      {showHistory && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowHistory(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="p-6">
              <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">
                <History className="w-6 h-6 text-blue-600" />
                Historial de Políticas
              </h2>
              {policies.length === 0 ? (
                <div className="text-center py-8">
                  <FileText className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No hay políticas guardadas</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {policies.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map((policy, i) => (
                    <div key={policy.id} className="flex items-center gap-3 p-4 border rounded-lg hover:bg-gray-50">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-gray-800">Versión {policy.version || policies.length - i}</span>
                          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${statusColors[policy.estado] || statusColors.borrador}`}>
                            {statusLabels[policy.estado] || 'Borrador'}
                          </span>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          <Clock className="w-3 h-3 inline mr-1" />
                          {new Date(policy.createdAt).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                        </p>
                        {policy.aprobadoPor && (
                          <p className="text-xs text-gray-500 mt-0.5">
                            <UserCheck className="w-3 h-3 inline mr-1" />
                            Aprobado por: {policy.aprobadoPor}
                          </p>
                        )}
                      </div>
                      <button onClick={() => loadPolicy(policy)}
                        className="px-3 py-1.5 text-sm text-blue-600 hover:bg-blue-50 rounded-lg font-medium">
                        Cargar
                      </button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-end mt-4">
                <button onClick={() => setShowHistory(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 text-sm font-medium">
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PolicyGenerator;
