// src/components/panels/RestriccionesChecklistPanel.jsx
import React, { useState } from 'react';
import { RESTRICCIONES_CATALOG } from '../../data/catalogos.js';
import { CheckSquare, Square, X } from 'lucide-react';

const RestriccionesChecklistPanel = ({
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
    blue: "bg-blue-50 border-blue-200 text-blue-800",
    orange: "bg-orange-50 border-orange-200 text-orange-800",
    purple: "bg-purple-50 border-purple-200 text-purple-800",
    teal: "bg-teal-50 border-teal-200 text-teal-800",
    green: "bg-green-50 border-green-200 text-green-800",
    red: "bg-red-50 border-red-200 text-red-800",
    sky: "bg-sky-50 border-sky-200 text-sky-800",
    violet: "bg-violet-50 border-violet-200 text-violet-800",
    yellow: "bg-yellow-50 border-yellow-200 text-yellow-800",
    indigo: "bg-indigo-50 border-indigo-200 text-indigo-800",
    amber: "bg-amber-50 border-amber-200 text-amber-800",
    rose: "bg-rose-50 border-rose-200 text-rose-800",
  };
  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-[150] p-4"
      onClick={handleBackdrop}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl flex flex-col"
        style={{ height: "90vh", maxHeight: "90vh" }}
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-red-600 to-orange-500 px-5 py-3.5 rounded-t-2xl text-white flex-shrink-0">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5" />
              <div>
                <h2 className="font-black text-base">
                  Restricciones Médico-Laborales
                </h2>
                <p className="text-xs text-red-100">
                  Seleccione por segmento · GTC-45 / GATISO
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {countSelected > 0 && (
                <span className="bg-white/25 px-3 py-1 rounded-full text-sm font-bold">
                  {countSelected} seleccionadas
                </span>
              )}
              <button onClick={onClose}>
                <X className="w-5 h-5 text-white/80 hover:text-white" />
              </button>
            </div>
          </div>
        </div>
        {/* Lista scrollable */}
        <div
          className="overflow-y-auto p-4 space-y-1.5"
          style={{ flex: "1 1 0", minHeight: 0 }}
        >
          {Object.entries(RESTRICCIONES_CATALOG).map(([catKey, catData]) => {
            const selectedInCat = catData.items.filter(
              (i) => selected[i.id]
            ).length;
            const colors =
              colorMap[catData.color] ||
              "bg-gray-50 border-gray-200 text-gray-800";
            return (
              <div
                key={catKey}
                className={`border rounded-xl overflow-hidden ${
                  selectedInCat > 0 ? "border-red-300" : "border-gray-200"
                }`}
              >
                <button
                  onClick={() =>
                    setExpandido((p) => ({ ...p, [catKey]: !p[catKey] }))
                  }
                  className={`w-full flex justify-between items-center px-4 py-3 text-left font-bold text-sm transition ${colors}`}
                >
                  <div className="flex items-center gap-2">
                    <span className="text-base">{catData.icon}</span>
                    <span>{catData.label}</span>
                    {selectedInCat > 0 && (
                      <span className="bg-red-600 text-white text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {selectedInCat}
                      </span>
                    )}
                  </div>
                  <ChevronRight
                    className={`w-4 h-4 transition-transform flex-shrink-0 ${
                      expandido[catKey] ? "rotate-90" : ""
                    }`}
                  />
                </button>
                {expandido[catKey] && (
                  <div className="px-3 pt-1 pb-2 space-y-1 bg-white">
                    {catData.items.map((item) => (
                      <label
                        key={item.id}
                        className={`flex items-start gap-2 px-2 py-2.5 rounded-lg cursor-pointer transition ${
                          selected[item.id]
                            ? "bg-red-50 border border-red-200"
                            : "hover:bg-gray-50 border border-transparent"
                        }`}
                      >
                        <div className="mt-0.5 flex-shrink-0">
                          {selected[item.id] ? (
                            <CheckSquare className="w-4 h-4 text-red-600" />
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
                        <div className="flex-1 min-w-0">
                          <p
                            className={`text-sm leading-relaxed ${
                              selected[item.id]
                                ? "text-red-800 font-medium"
                                : "text-gray-700"
                            }`}
                          >
                            {item.texto}
                          </p>
                          <span className="text-[10px] text-gray-400 font-mono">
                            {item.normativa}
                          </span>
                        </div>
                      </label>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {/* Footer siempre visible */}
        <div className="border-t px-5 py-4 flex justify-between items-center flex-shrink-0 bg-gray-50 rounded-b-2xl gap-3">
          <button
            onClick={onGenerate}
            disabled={isGenerating}
            className="flex items-center gap-2 bg-indigo-600 text-white px-5 py-3 rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-50"
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
            className="flex items-center gap-2 bg-red-600 text-white px-7 py-3 rounded-xl text-sm font-bold hover:bg-red-700 shadow-md"
          >
            <CheckSquare className="w-5 h-5" />
            {countSelected > 0
              ? `✅ Aplicar ${countSelected} restricciones`
              : "✅ Aplicar selección"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default RestriccionesChecklistPanel;
