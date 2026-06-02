// src/components/panels/RecomendacionesChecklistPanel.jsx
import React, { useState } from 'react';
import { RECOMENDACIONES_CATALOG } from '../../data/catalogos.js';
import { CheckSquare, Square, X, Sparkles } from 'lucide-react';

const RecomendacionesChecklistPanel = ({
  selected,
  onChange,
  onClose,
  onApply,
  isGenerating,
  onGenerate,
}) => {
  const [expandido, setExpandido] = useState({});
  const countSelected = Object.values(selected).filter(Boolean).length;
  const handleBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose();
  };
  const colorMap = {
    emerald: "bg-emerald-50 border-emerald-200 text-emerald-800",
    blue: "bg-blue-50 border-blue-200 text-blue-800",
    purple: "bg-purple-50 border-purple-200 text-purple-800",
    teal: "bg-teal-50 border-teal-200 text-teal-800",
  };
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[150] p-4"
      onClick={handleBackdrop}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[90vh] flex flex-col animate-fade-in">
        <div className="bg-gradient-to-r from-emerald-600 to-teal-500 p-5 rounded-t-2xl text-white flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-3">
              <ClipboardList className="w-6 h-6" />
              <div>
                <h2 className="text-lg font-black">Recomendaciones Médicas</h2>
                <p className="text-xs text-emerald-100">
                  Checklist de Recomendaciones por Categoría
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className="bg-white/20 px-3 py-1 rounded-full text-sm font-bold">
                {countSelected} seleccionadas
              </span>
              <button onClick={onClose}>
                <X className="w-5 h-5 text-white/70 hover:text-white" />
              </button>
            </div>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto p-4 space-y-2">
          {Object.entries(RECOMENDACIONES_CATALOG).map(([catKey, catData]) => {
            const selectedInCat = catData.items.filter(
              (i) => selected[i.id]
            ).length;
            const colors = colorMap[catData.color] || colorMap.emerald;
            return (
              <div
                key={catKey}
                className={`border rounded-xl overflow-hidden ${
                  selectedInCat > 0 ? "border-emerald-300" : "border-gray-200"
                }`}
              >
                <button
                  onClick={() =>
                    setExpandido((p) => ({ ...p, [catKey]: !p[catKey] }))
                  }
                  className={`w-full flex justify-between items-center p-3 text-left font-bold text-sm transition ${colors}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{catData.icon}</span>
                    <span>{catData.label}</span>
                    {selectedInCat > 0 && (
                      <span className="bg-emerald-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {selectedInCat}
                      </span>
                    )}
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 transition-transform ${
                      expandido[catKey] ? "rotate-90" : ""
                    }`}
                  />
                </button>
                {expandido[catKey] && (
                  <div className="p-2 space-y-1 bg-white">
                    {catData.items.map((item) => (
                      <label
                        key={item.id}
                        className={`checklist-item flex items-start gap-2 p-2 rounded-lg cursor-pointer transition ${
                          selected[item.id]
                            ? "bg-emerald-50 border border-emerald-200"
                            : "hover:bg-gray-50"
                        }`}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {selected[item.id] ? (
                            <CheckSquare className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-300" />
                          )}
                        </div>
                        <input
                          type="checkbox"
                          className="hidden"
                          checked={!!selected[item.id]}
                          onChange={() =>
                            onChange((p) => ({ ...p, [item.id]: !p[item.id] }))
                          }
                        />
                        <p
                          className={`text-xs leading-relaxed ${
                            selected[item.id]
                              ? "text-emerald-800 font-medium"
                              : "text-gray-700"
                          }`}
                        >
                          {item.texto}
                        </p>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="border-t p-4 flex justify-between items-center flex-shrink-0 bg-gray-50 rounded-b-2xl">
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-indigo-700 disabled:opacity-50"
          >
            {isGenerating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            Generar con IA
          </button>
          <button
            onClick={onApply || onClose}
            className="bg-emerald-600 text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-emerald-700"
          >
            ✅ Aplicar {countSelected} Recomendaciones
          </button>
        </div>
      </div>
    </div>
  );
};

export default RecomendacionesChecklistPanel;
