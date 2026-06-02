// src/components/ui/InputGroup.jsx
import React from 'react';

const InputGroup = ({
  label,
  name,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder = "",
  width = "w-full",
  disabled = false,
  alertInfo = null,
  list,
}) => (
  <div className={`mb-2 ${width} px-1.5 print:mb-1`}>
    <label className="block text-[10px] font-bold text-gray-600 mb-0.5 uppercase truncate">
      {label}
      {required && <span className="text-red-500 no-print"> *</span>}
    </label>
    <div className="relative">
      <input
        type={type}
        name={name}
        value={value || ""}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        list={list}
        className={`w-full p-1.5 border border-gray-200 rounded focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 outline-none text-xs ${
          disabled ? "bg-gray-50 cursor-not-allowed" : "bg-white"
        } print:text-[9px] print:p-0 print:border-none`}
      />
      {alertInfo && (
        <div
          className={`absolute right-0 -top-5 text-[9px] font-bold px-2 py-0.5 rounded-full no-print ${alertInfo.color}`}
        >
          {alertInfo.text}
        </div>
      )}
    </div>
  </div>
);

export default InputGroup;
