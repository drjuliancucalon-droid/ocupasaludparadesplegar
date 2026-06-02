import React from 'react';
import { _buscarCUPS } from '../data/cups.js';

export const CUPSInput = ({ value, onChange, placeholder, className }) => {
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
      const r = _buscarCUPS(v);
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
        value={query}
        onChange={handleInput}
        onFocus={() => { if (sugerencias.length > 0) setAbierto(true); }}
        placeholder={placeholder || "Buscar CUPS - código o nombre del procedimiento..."}
        className={className || "w-full p-1.5 border rounded-lg text-xs focus:ring-2 focus:ring-teal-400 outline-none border-gray-300"}
        autoComplete="off"
        spellCheck="false"
      />
      {abierto && sugerencias.length > 0 && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 9999, background: "white", border: "2px solid #0d9488", borderRadius: "0 0 10px 10px", boxShadow: "0 8px 24px rgba(0,0,0,0.18)", maxHeight: "220px", overflowY: "auto" }}>
          {sugerencias.map((item, ixd) => (
            <div key={ixd} onMouseDown={(e) => { e.preventDefault(); seleccionar(item); }}
              style={{ padding: "5px 10px", cursor: "pointer", borderBottom: "1px solid #f3f4f6", display: "flex", alignItems: "flex-start", gap: "8px" }}
              onMouseEnter={(e) => (e.currentTarget.style.background = "#f0fdfa")}
              onMouseLeave={(e) => (e.currentTarget.style.background = "white")}
            >
              <div style={{ flexShrink: 0, textAlign: "center" }}>
                <span style={{ fontFamily: "monospace", fontWeight: "900", color: "#134e4a", fontSize: "10px", background: "#ccfbf1", padding: "2px 5px", borderRadius: "4px", display: "block" }}>{item.code}</span>
                <span style={{ fontSize: "8px", color: "#0d9488", fontWeight: "700", display: "block", marginTop: "1px" }}>{item.group}</span>
              </div>
              <span style={{ fontSize: "11px", color: "#374151", lineHeight: "1.4", flex: 1 }}>{item.desc}</span>
            </div>
          ))}
          <div style={{ padding: "3px 10px", background: "#f0fdfa", fontSize: "9px", color: "#6b7280", borderTop: "1px solid #e5e7eb" }}>
            {sugerencias.length} resultado(s) · CUPS Colombia · Res. 2175/2015 actualizada · MinSalud
          </div>
        </div>
      )}
    </div>
  );
};
