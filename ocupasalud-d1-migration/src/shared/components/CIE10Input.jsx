import React from 'react';
import { _buscarCIE10 } from '../data/cie10.js';

export const CIE10Input = ({ value, onChange, placeholder, className, name }) => {
  const [query, setQuery] = React.useState(value || "");
  const [sugerencias, setSugerencias] = React.useState([]);
  const [abierto, setAbierto] = React.useState(false);
  const ref = React.useRef(null);

  React.useEffect(() => { setQuery(value || ""); }, [value]);
  React.useEffect(() => {
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setAbierto(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleInput = (e) => {
    const v = e.target.value;
    setQuery(v);
    onChange && onChange(v);
    if (v.trim().length >= 2) {
      const r = _buscarCIE10(v);
      setSugerencias(r);
      setAbierto(r.length > 0);
    } else {
      setSugerencias([]);
      setAbierto(false);
    }
  };

  const seleccionar = (item) => {
    const completo = item.code + " - " + item.desc;
    setQuery(completo);
    onChange && onChange(completo);
    setSugerencias([]);
    setAbierto(false);
  };

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <input
        name={name}
        value={query}
        onChange={handleInput}
        onFocus={() => { if (sugerencias.length > 0) setAbierto(true); }}
        placeholder={placeholder || "Buscar CIE-10 - código o descripción..."}
        className={className || "w-full p-1.5 border rounded-lg text-xs focus:ring-2 focus:ring-emerald-400 outline-none border-gray-300"}
        autoComplete="off"
        spellCheck="false"
      />
      {abierto && sugerencias.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 9999, background: "white", border: "2px solid #10b981", borderRadius: "0 0 10px 10px", boxShadow: "0 8px 24px rgba(0,0,0,0.18)", maxHeight: "220px", overflowY: "auto" }}>
          {sugerencias.map((item, idx) => (
            <div key={idx} onMouseDown={(e) => { e.preventDefault(); seleccionar(item); }}
              style={{ padding: "5px 10px", cursor: "pointer", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "flex-start", gap: "8px" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#ecfdf5")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
            >
              <span style={{ fontFamily: "monospace", fontWeight: "900", color: "#065f46", fontSize: "11px", minWidth: "54px", background: "#d1fae5", padding: "2px 5px", borderRadius: "4px", flexShrink: 0 }}>{item.code}</span>
              <span style={{ fontSize: "11px", color: "#374151", lineHeight: "1.4" }}>{item.desc}</span>
            </div>
          ))}
          <div style={{ padding: "3px 10px", background: "#f0fdf4", fontSize: "9px", color: "#6b7280", borderTop: "1px solid #e5e7eb" }}>
            {sugerencias.length} resultado(s) · CIE-10 Salud Ocupacional · Decreto 1477/2014 · Res. 1843/2025
          </div>
        </div>
      )}
    </div>
  );
};
