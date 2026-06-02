// src/components/ui/MedicamentoAutocomplete.jsx
import React, { useState, useRef, useEffect } from 'react';
import { MEDICAMENTOS_CO_BASE, getCustomMeds } from '../../data/medicamentos.js';
import { Pill } from 'lucide-react';

const MedicamentoAutocomplete = ({
  value,
  onChange,
  placeholder,
  onSelectMed,
}) => {
  const [query, setQuery] = useState(value || "");
  const [suggestions, setSuggestions] = useState([]);
  const [show, setShow] = useState(false);
  const [customMeds, setCustomMeds] = useState(() => getCustomMeds());
  const ref = useRef(null);
  const allMeds = [...MEDICAMENTOS_CO_BASE, ...customMeds];
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    const q = query.toLowerCase();
    const res = [];
    allMeds.forEach((med) => {
      if (med.g.toLowerCase().includes(q))
        res.push({
          label: med.g,
          sub: `${med.cat} · ${med.dosis}`,
          full: med.g,
          dosis: med.dosis,
          presentaciones: med.p,
          isGeneric: true,
        });
      med.p.forEach((p) => {
        if (p.toLowerCase().includes(q))
          res.push({
            label: p,
            sub: `${med.g} · ${med.cat}`,
            full: p,
            dosis: med.dosis,
            presentaciones: med.p,
            isGeneric: false,
          });
      });
    });
    setSuggestions(res.slice(0, 10));
    setShow(true);
  }, [query, customMeds]);
  useEffect(() => {
    const h = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setShow(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);
  const handleAddCustom = () => {
    if (!query.trim() || query.length < 3) return;
    const exists = allMeds.some(
      (m) =>
        m.g.toLowerCase() === query.toLowerCase() ||
        m.p.some((p) => p.toLowerCase() === query.toLowerCase())
    );
    if (!exists) {
      const newEntry = {
        g: query.trim(),
        p: [query.trim()],
        cat: "Personalizado",
        dosis: "Según prescripción",
      };
      addCustomMed(newEntry);
      setCustomMeds((prev) => [...prev, newEntry]);
    }
    onChange(query.trim());
    if (onSelectMed)
      onSelectMed({
        label: query.trim(),
        dosis: "",
        presentaciones: [query.trim()],
      });
    setSuggestions([]);
    setShow(false);
  };
  return (
    <div className="relative" ref={ref}>
      <div className="flex gap-1">
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            onChange(e.target.value);
          }}
          onFocus={() => query.length >= 2 && setShow(true)}
          placeholder={placeholder || "Nombre genérico o comercial..."}
          className="flex-1 p-1.5 border border-gray-200 rounded-l text-xs focus:ring-2 focus:ring-emerald-400 outline-none"
        />
        <button
          type="button"
          onClick={handleAddCustom}
          title="Agregar como medicamento personalizado"
          className="px-2 bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-r text-xs font-bold hover:bg-emerald-200 flex items-center gap-0.5"
        >
          <Plus className="w-3 h-3" /> Añadir
        </button>
      </div>
      {show && suggestions.length > 0 && (
        <div className="absolute z-50 bg-white border border-emerald-200 rounded-xl shadow-xl mt-1 w-full max-h-52 overflow-y-auto">
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setQuery(s.label);
                onChange(s.label);
                if (onSelectMed) onSelectMed(s);
                setSuggestions([]);
                setShow(false);
              }}
              className="w-full text-left px-3 py-1.5 hover:bg-emerald-50 border-b border-gray-50 last:border-none"
            >
              <div className="flex items-center gap-1.5">
                <Pill className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                <p className="text-xs font-bold text-emerald-900">{s.label}</p>
                {s.isGeneric && (
                  <span className="text-[9px] bg-emerald-100 text-emerald-700 px-1 rounded">
                    Genérico
                  </span>
                )}
              </div>
              <p className="text-[10px] text-gray-500 ml-5">{s.sub}</p>
            </button>
          ))}
          {suggestions.length === 0 && query.length >= 2 && (
            <div className="px-3 py-2 text-[10px] text-gray-400 italic">
              No encontrado -- pulse "Añadir" para agregarlo a su base de datos
            </div>
          )}
        </div>
      )}
      {show && suggestions.length === 0 && query.length >= 2 && (
        <div className="absolute z-50 bg-white border border-emerald-200 rounded-xl shadow-xl mt-1 w-full">
          <div className="px-3 py-2 text-[10px] text-gray-400 italic flex items-center gap-2">
            <AlertCircle className="w-3 h-3" />
            No encontrado en base de datos -- pulse "Añadir" para guardarlo.
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicamentoAutocomplete;
