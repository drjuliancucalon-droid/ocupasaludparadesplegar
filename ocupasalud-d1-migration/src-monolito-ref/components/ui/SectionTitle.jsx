// src/components/ui/SectionTitle.jsx
import React from 'react';

const SectionTitle = ({ title, icon: Icon, color }) => {
  const c = color || "emerald";
  return (
    <div
      className="print-break-avoid"
      style={{ pageBreakInside: "avoid", pageBreakAfter: "avoid" }}
    >
      <div
        className={`w-full border-b border-${c}-400 mb-2 mt-3 pb-0.5 flex items-center bg-${c}-50 p-1.5 rounded-t print:bg-transparent print:border-gray-400 print:mt-2 print:mb-1 print:p-0`}
      >
        <Icon className={`mr-2 w-4 h-4 text-${c}-600 print:hidden`} />
        <h3
          className={`text-xs font-bold uppercase tracking-wide text-${c}-800 print:text-black`}
        >
          {title}
        </h3>
      </div>
    </div>
  );
};

export default SectionTitle;
