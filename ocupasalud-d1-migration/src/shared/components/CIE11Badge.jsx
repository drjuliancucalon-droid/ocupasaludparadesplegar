import React from 'react';
import { _equivalenciaCIE11 } from '../data/cie11.js';

export const CIE11Badge = ({ cie10value }) => {
  if (!cie10value || cie10value.trim().length < 3) return null;
  const eq = _equivalenciaCIE11(cie10value);
  if (!eq) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: "5px", background: "#fef9c3", border: "1px solid #fbbf24", borderRadius: "5px", padding: "2px 7px", marginTop: "2px", fontSize: "9px", color: "#78350f", flexWrap: "wrap" }}>
      <span style={{ fontWeight: "900", color: "#92400e", flexShrink: 0 }}>CIE-11:</span>
      <span style={{ fontFamily: "monospace", fontWeight: "800", background: "#fde68a", padding: "1px 4px", borderRadius: "3px", flexShrink: 0 }}>{eq.cie11}</span>
      <span style={{ color: "#713f12", flex: 1 }}>{eq.desc}</span>
      <span style={{ fontSize: "8px", color: "#b45309", fontStyle: "italic", flexShrink: 0 }}>Res. 1442/2024</span>
    </div>
  );
};
