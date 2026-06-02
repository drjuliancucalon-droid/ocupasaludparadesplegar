// src/components/ui/DoctorSignature.jsx
import React from 'react';

const DoctorSignature = ({ signature, data, showData = true }) => {
  const doc = data || DEFAULT_DOCTOR_DATA;
  return (
    <div className="flex flex-col items-center justify-center w-full">
      <div className="h-16 w-52 flex items-center justify-center mb-0.5">
        {signature ? (
          <img
            src={signature}
            alt="Firma"
            className="max-h-full max-w-full object-contain drop-shadow-sm"
          />
        ) : (
          <div className="h-14 w-full border-b-2 border-dashed border-gray-400 flex items-end justify-center pb-1">
            <span className="text-[9px] text-gray-300 italic">Firma</span>
          </div>
        )}
      </div>
      {showData && (
        <div className="text-center border-t-2 border-gray-900 pt-1 w-full">
          <p className="font-black text-[10px] uppercase tracking-tight text-gray-900 leading-tight">
            {doc.nombre || "Nombre del Profesional"}
          </p>
          <p className="text-[9px] text-gray-700 font-semibold leading-tight">
            {doc.titulo || "Especialista SST"}
          </p>
          <p className="text-[9px] text-gray-600 leading-tight">
            C.C. {doc.cedula || "--"}
          </p>
          <p className="text-[9px] font-black text-emerald-700 leading-tight">
            RM: {doc.licencia || "--"}
          </p>
          {doc.celular && (
            <p className="text-[9px] text-gray-500 leading-tight">
              Tel: {doc.celular}
            </p>
          )}
          {doc.ciudad && (
            <p className="text-[9px] text-gray-500 leading-tight">
              {doc.ciudad}
            </p>
          )}
        </div>
      )}
    </div>
  );
};
// PERF-02: memo evita re-render cuando signature/data no cambian (se usa en ~15 lugares)
const DoctorSignatureMemo = React.memo(DoctorSignature);
// BrandLogo: logotipo compacto para cabecera de documentos

export { DoctorSignatureMemo };
export default DoctorSignature;
