// src/modules/clinical/components/ExamRequestTab.jsx
// Sprint 2.6: Search CUPS codes, add exams to list, print exam request
import React, { useState, useCallback } from 'react';
import { Search, Plus, Trash2, Printer, FlaskConical, Sparkles, Loader2 } from 'lucide-react';
import { _buscarCUPS } from '../../../shared/data/cups';
import { openPrintWindow } from '../../../lib/printService';
import { _sanitize } from '../../../shared/lib/security';

export const ExamRequestTab = ({ patientData = {}, doctorData = {}, aiSuggestedExams = [], onRequestAISuggestion }) => {
  const [query, setQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [selectedExams, setSelectedExams] = useState([]);
  const [isLoadingAI, setIsLoadingAI] = useState(false);

  const handleSearch = useCallback((value) => {
    setQuery(value);
    if (value.length >= 2) {
      setSearchResults(_buscarCUPS(value, 10));
    } else {
      setSearchResults([]);
    }
  }, []);

  const addExam = useCallback((exam) => {
    if (selectedExams.some((e) => e.code === exam.code)) return;
    setSelectedExams((prev) => [...prev, { ...exam, id: `ex_${Date.now()}` }]);
    setQuery('');
    setSearchResults([]);
  }, [selectedExams]);

  const removeExam = useCallback((id) => {
    setSelectedExams((prev) => prev.filter((e) => e.id !== id));
  }, []);

  const handleAISuggest = useCallback(async () => {
    if (!onRequestAISuggestion) return;
    setIsLoadingAI(true);
    try {
      const suggestions = await onRequestAISuggestion();
      if (Array.isArray(suggestions)) {
        suggestions.forEach((s) => {
          const cups = s.cups || s.code || '';
          const desc = s.description || s.desc || '';
          if (cups && !selectedExams.some((e) => e.code === cups)) {
            setSelectedExams((prev) => [...prev, {
              id: `ex_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
              code: cups,
              desc: desc,
              group: 'IA sugerido',
              justification: s.justification || '',
            }]);
          }
        });
      }
    } catch (err) {
      alert('Error IA: ' + err.message);
    } finally {
      setIsLoadingAI(false);
    }
  }, [onRequestAISuggestion, selectedExams]);

  const handlePrint = useCallback(() => {
    if (selectedExams.length === 0) {
      alert('Agregue al menos un examen para imprimir');
      return;
    }

    const s = (v) => _sanitize(v || '—');
    const html = `
      <div style="text-align:center;margin-bottom:16px;">
        <h1 style="margin:0;font-size:14pt;">SOLICITUD DE EXÁMENES PARACLÍNICOS</h1>
        <p style="font-size:9pt;color:#6b7280;">Salud Ocupacional — ${new Date().toLocaleDateString('es-CO')}</p>
      </div>

      <div class="section">
        <h2>Datos del Paciente</h2>
        <table>
          <tr><td class="label" width="20%">Nombre</td><td>${s(patientData.nombres)}</td><td class="label" width="15%">Documento</td><td>${s(patientData.docTipo)} ${s(patientData.docNumero)}</td></tr>
          <tr><td class="label">Empresa</td><td>${s(patientData.empresaNombre)}</td><td class="label">Cargo</td><td>${s(patientData.cargo)}</td></tr>
          <tr><td class="label">Tipo Examen</td><td colspan="3">${s(patientData.tipoExamen)}</td></tr>
        </table>
      </div>

      <div class="section">
        <h2>Exámenes Solicitados</h2>
        <table>
          <thead>
            <tr><th width="15%">CUPS</th><th>Descripción</th><th width="15%">Grupo</th></tr>
          </thead>
          <tbody>
            ${selectedExams.map((e) => `
              <tr>
                <td style="font-weight:700;">${s(e.code)}</td>
                <td>${s(e.desc)}</td>
                <td>${s(e.group)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>

      <div class="section" style="margin-top:20px;">
        <p><strong>Observaciones:</strong> ___________________________________________________________</p>
      </div>

      <div class="signature-area">
        <div style="width:50%;margin-top:40px;">
          <div style="border-top:1px solid #333;padding-top:4px;">
            <p style="font-size:9pt;font-weight:700;">${s(doctorData.nombre)}</p>
            <p style="font-size:7pt;color:#6b7280;">Médico SST · RM: ${s(doctorData.licencia)}</p>
          </div>
        </div>
      </div>
    `;

    openPrintWindow(`Solicitud Exámenes — ${patientData.nombres || 'Paciente'}`, html);
  }, [selectedExams, patientData, doctorData]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <FlaskConical className="w-5 h-5 text-emerald-600" />
          <h3 className="text-sm font-black text-gray-800 uppercase">Solicitud de Exámenes</h3>
        </div>
        <div className="flex gap-2">
          {onRequestAISuggestion && (
            <button
              onClick={handleAISuggest}
              disabled={isLoadingAI}
              className="flex items-center gap-1.5 bg-indigo-600 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-indigo-700 disabled:opacity-50"
            >
              {isLoadingAI ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
              Sugerir IA
            </button>
          )}
          <button
            onClick={handlePrint}
            disabled={selectedExams.length === 0}
            className="flex items-center gap-1.5 bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[11px] font-bold hover:bg-emerald-700 disabled:opacity-50"
          >
            <Printer className="w-3.5 h-3.5" /> Imprimir
          </button>
        </div>
      </div>

      {/* Search CUPS */}
      <div className="relative">
        <div className="flex items-center border border-gray-200 rounded-lg overflow-hidden focus-within:ring-2 focus-within:ring-emerald-400">
          <Search className="w-4 h-4 text-gray-400 ml-3" />
          <input
            type="text"
            value={query}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Buscar por código CUPS o nombre de examen..."
            className="flex-1 p-2 text-xs outline-none"
          />
        </div>

        {/* Search results dropdown */}
        {searchResults.length > 0 && (
          <div className="absolute z-30 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
            {searchResults.map((item) => (
              <button
                key={item.code}
                onClick={() => addExam(item)}
                className="w-full text-left px-3 py-2 text-xs hover:bg-emerald-50 flex items-center gap-3 border-b border-gray-50 last:border-0"
              >
                <span className="font-mono font-bold text-emerald-700 w-16 flex-shrink-0">{item.code}</span>
                <span className="text-gray-700 flex-1">{item.desc}</span>
                <span className="text-[10px] text-gray-400 flex-shrink-0">{item.group}</span>
                <Plus className="w-3.5 h-3.5 text-emerald-500 flex-shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected exams list */}
      {selectedExams.length > 0 ? (
        <div className="border rounded-xl overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-emerald-50 text-emerald-800">
                <th className="text-left px-3 py-2 font-bold w-20">CUPS</th>
                <th className="text-left px-3 py-2 font-bold">Descripción</th>
                <th className="text-left px-3 py-2 font-bold hidden sm:table-cell w-24">Grupo</th>
                <th className="text-right px-3 py-2 font-bold w-16">—</th>
              </tr>
            </thead>
            <tbody>
              {selectedExams.map((exam) => (
                <tr key={exam.id} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-3 py-2 font-mono font-bold text-emerald-700">{exam.code}</td>
                  <td className="px-3 py-2 text-gray-700">{exam.desc}</td>
                  <td className="px-3 py-2 text-gray-400 hidden sm:table-cell">{exam.group}</td>
                  <td className="px-3 py-2 text-right">
                    <button onClick={() => removeExam(exam.id)} className="p-1 text-red-500 hover:bg-red-50 rounded">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8 text-gray-400 text-xs">
          <FlaskConical className="w-8 h-8 mx-auto mb-2 opacity-30" />
          <p>No hay exámenes seleccionados</p>
          <p className="text-[10px]">Busque por código CUPS o use la sugerencia IA</p>
        </div>
      )}
    </div>
  );
};
