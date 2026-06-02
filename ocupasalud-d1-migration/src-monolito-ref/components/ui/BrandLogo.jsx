// src/components/ui/BrandLogo.jsx
import React from 'react';

const BrandLogo = ({ data }) => {
  const doc = data || DEFAULT_DOCTOR_DATA;
  const parts = (doc.nombre || "").trim().split(/\s+/);
  const initials =
    parts.length >= 2
      ? `${parts[0][0]}${parts[parts.length > 2 ? 2 : 1][0]}`
      : "DR";
  return (
    <div className="flex items-center space-x-2">
      <div className="h-10 w-10 bg-gradient-to-tr from-emerald-700 to-teal-500 rounded-xl flex items-center justify-center text-white shadow-md flex-shrink-0">
        <div className="flex flex-col items-center leading-none">
          <Stethoscope className="w-3.5 h-3.5 mb-0.5" strokeWidth={2.5} />
          <span className="text-[10px] font-black tracking-tighter">
            {initials}
          </span>
        </div>
      </div>
      <div className="flex flex-col justify-center">
        <p className="text-[10px] font-black text-gray-900 uppercase leading-tight whitespace-normal break-words">
          {doc.nombre || "MÉDICO"}
        </p>
        <div className="h-0.5 w-8 bg-gradient-to-r from-emerald-500 to-teal-400 my-0.5 rounded-full" />
        <p className="text-[8px] font-bold text-gray-500 uppercase whitespace-normal break-words">
          {doc.titulo || "Salud Ocupacional"}
        </p>
        <p className="text-[8px] font-bold text-emerald-600 whitespace-normal break-words">
          RM: {doc.licencia || "--"}
        </p>
        {doc.ciudad && (
          <p className="text-[8px] text-gray-400 whitespace-normal break-words">
            {doc.ciudad}
          </p>
        )}
      </div>
    </div>
  );
};

export default BrandLogo;
