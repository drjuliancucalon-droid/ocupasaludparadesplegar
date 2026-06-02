// src/components/ui/SelectGroup.jsx
import React from 'react';

const SelectGroup = ({
  label,
  name,
  value,
  onChange,
  options,
  required = false,
  width = "w-full",
  disabled = false,
}) => (
  <div className={`mb-2 ${width} px-1.5 print:mb-1`}>
    <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase truncate">
      {label}
      {required && <span className="text-red-500 no-print"> *</span>}
    </label>
    <div className="relative">
      <select
        name={name}
        value={value || ""}
        onChange={onChange}
        disabled={disabled}
        className={`w-full p-1.5 border border-gray-200 rounded focus:ring-2 focus:ring-emerald-400 outline-none text-xs bg-white appearance-none ${
          disabled ? "bg-gray-50 cursor-not-allowed" : ""
        } print:text-[9px] print:p-0 print:border-none`}
      >
        <option value="">Seleccione...</option>
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-2 top-2 h-3 w-3 text-gray-400 no-print" />
    </div>
  </div>
);

export default SelectGroup;
