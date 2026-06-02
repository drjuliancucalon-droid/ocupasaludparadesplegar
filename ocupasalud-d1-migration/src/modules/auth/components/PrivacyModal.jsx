import React from 'react';
import { Shield, CheckCircle2 } from 'lucide-react';

/**
 * PrivacyModal - Aviso de privacidad (Ley 1581/2012)
 * Decreto 1078/2015 Art. 2.2.2.25.2.2 - Tratamiento datos sensibles
 */
export const PrivacyModal = ({ onAccept }) => (
  <div className="fixed inset-0 bg-black/60 z-[9999] flex items-center justify-center p-4 font-sans">
    <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden animate-fade-in">
      <div className="bg-gradient-to-r from-blue-700 to-blue-600 p-5 text-white">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Shield className="w-5 h-5 text-white" />
          </div>
          <div>
            <h2 className="font-black text-base uppercase tracking-tight">
              Política de Privacidad y Tratamiento de Datos
            </h2>
            <p className="text-blue-100 text-[11px] font-medium">
              Ley 1581 de 2012 · Decreto 1078 de 2015
            </p>
          </div>
        </div>
      </div>
      <div className="p-5 max-h-72 overflow-y-auto text-xs text-gray-700 space-y-3 leading-relaxed">
        <p>
          <span className="font-black text-gray-900">Responsable del tratamiento:</span>{' '}
          El profesional médico registrado en esta plataforma es el responsable del tratamiento
          de los datos personales y de salud gestionados en OCUPASALUD.
        </p>
        <p>
          <span className="font-black text-gray-900">Datos tratados:</span>{' '}
          Datos de identificación, datos de salud (historia clínica, diagnósticos, resultados
          de exámenes) y datos laborales de los trabajadores evaluados.
        </p>
        <p>
          <span className="font-black text-gray-900">Finalidad:</span>{' '}
          Gestión de historias clínicas ocupacionales, emisión de certificados de aptitud laboral
          y cumplimiento del Sistema de Gestión de Seguridad y Salud en el Trabajo (SG-SST)
          conforme a la Res. 1843/2025.
        </p>
        <p>
          <span className="font-black text-gray-900">Base legal:</span>{' '}
          El tratamiento de datos de salud está autorizado por la Ley 1562/2012 (riesgos laborales)
          y la Resolución 1843/2025 (evaluaciones médicas ocupacionales).
        </p>
        <p>
          <span className="font-black text-gray-900">Confidencialidad:</span>{' '}
          Las historias clínicas son documentos privados sometidos a reserva. Solo personal médico
          autorizado puede acceder a ellas (Res. 1995/1999 Art. 14). Se conservan por un mínimo
          de 20 años (Res. 1995/1999 Art. 15).
        </p>
        <p>
          <span className="font-black text-gray-900">Derechos del titular (Habeas Data):</span>{' '}
          Conocer, actualizar, rectificar y suprimir sus datos personales. Para ejercer estos
          derechos contacte directamente al médico responsable.
        </p>
        <p className="text-[10px] text-gray-400 border-t pt-2">
          Al continuar usando esta plataforma, el profesional médico declara conocer y cumplir
          las obligaciones del responsable del tratamiento establecidas en la Ley 1581 de 2012
          y sus decretos reglamentarios.
        </p>
      </div>
      <div className="px-5 pb-5">
        <button
          onClick={onAccept}
          className="w-full bg-gradient-to-r from-blue-700 to-blue-600 text-white py-3 rounded-xl font-black text-sm hover:opacity-90 transition shadow-lg flex items-center justify-center gap-2"
        >
          <CheckCircle2 className="w-4 h-4" /> He leído y acepto la Política de Privacidad
        </button>
        <p className="text-[10px] text-center text-gray-400 mt-2">
          Esta aceptación queda registrada con fecha y hora
        </p>
        <button
          onClick={onAccept}
          className="mt-2 w-full text-[10px] text-blue-500 underline hover:text-blue-700"
        >
          Ya acepté anteriormente - Continuar al sistema
        </button>
      </div>
    </div>
  </div>
);
