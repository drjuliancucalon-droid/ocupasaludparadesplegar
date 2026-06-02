// src/pages/CertificadoPage.jsx — Certificate of Aptitude view
// Sprint 1.2: Connect CertificateView.jsx (24KB)
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { CertificateView } from '../modules/clinical/components/CertificateView';
import { useAuthStore } from '../stores/authStore';
import { useBackendData, useBackendObject } from '../hooks/useBackendData';
import { _generarCertificadoHTMLNormalizado } from '../shared/lib/printUtils';
import { openPrintWindow } from '../lib/printService';
import { ArrowLeft, Printer, FileText, Loader2 } from 'lucide-react';

export default function CertificadoPage() {
  const { id } = useParams(); // patient docNumero
  const navigate = useNavigate();
  const { currentUser } = useAuthStore();
  const { data: patients, loading } = useBackendData('/data/patients', 'siso_db_patients', 'patients');
  const { data: doctor } = useBackendObject('/data/doctor', 'siso_doctor_data', 'doctor');

  const [patient, setPatient] = useState(null);

  useEffect(() => {
    if (id && patients.length > 0) {
      const found = patients.find((p) => p.docNumero === id || p.id === id);
      setPatient(found || null);
    }
  }, [id, patients]);

  const activeDoctorData = doctor || { nombre: currentUser?.nombre || 'Médico', licencia: '' };

  const handlePrint = () => {
    if (!patient) return;
    try {
      const html = _generarCertificadoHTMLNormalizado(patient, activeDoctorData, null, '#059669');
      openPrintWindow(`Certificado — ${patient.nombres || 'Paciente'}`, html);
    } catch (err) {
      // Fallback: print the certificate view directly
      window.print();
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
      </div>
    );
  }

  if (!patient) {
    return (
      <div className="p-6 max-w-4xl mx-auto">
        <button onClick={() => navigate('/patients')} className="flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-900 mb-4">
          <ArrowLeft className="w-4 h-4" /> Volver a pacientes
        </button>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-6 text-center">
          <FileText className="w-12 h-12 text-yellow-400 mx-auto mb-3" />
          <p className="text-yellow-800 font-bold">Paciente no encontrado</p>
          <p className="text-yellow-600 text-sm mt-1">No se encontró un paciente con documento: {id}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <button onClick={() => navigate('/patients')} className="flex items-center gap-2 text-sm text-emerald-700 hover:text-emerald-900">
          <ArrowLeft className="w-4 h-4" /> Volver
        </button>
        <button onClick={handlePrint} className="bg-gradient-to-r from-emerald-600 to-teal-500 text-white px-4 py-2 rounded-xl font-bold shadow-lg hover:opacity-90 flex items-center gap-2">
          <Printer className="w-4 h-4" /> Imprimir Certificado
        </button>
      </div>

      <CertificateView
        data={patient}
        activeDoctorData={activeDoctorData}
        activeSignature={null}
        currentUser={currentUser}
        onDownloadRDA={() => {}}
        onPrintCarnet={() => {}}
      />
    </div>
  );
}
