// src/pages/PatientsPage.jsx — Patient management with backend data
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { PatientList } from '../modules/patients/components/PatientList';
import { useBackendData } from '../hooks/useBackendData';
import { Users, Loader2, Cloud, HardDrive } from 'lucide-react';

export default function PatientsPage() {
  const navigate = useNavigate();
  const { data: patients, loading, source } = useBackendData(
    '/data/patients', 'siso_db_patients', 'patients'
  );

  const handleSelectPatient = (patient) => {
    if (patient?.docNumero) {
      navigate(`/patients/${patient.docNumero}/hc`);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Users className="w-6 h-6 text-emerald-600" />
          <h1 className="text-2xl font-bold text-gray-800">Pacientes</h1>
          {!loading && (
            <span className="text-xs text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">
              {patients.length} registros
            </span>
          )}
        </div>
        {!loading && (
          <div className="flex items-center gap-1 text-xs text-gray-400">
            {source === 'backend' ? <Cloud className="w-3 h-3 text-emerald-500" /> : <HardDrive className="w-3 h-3" />}
            <span>{source === 'backend' ? 'Supabase' : 'Local'}</span>
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <span className="ml-3 text-gray-500">Cargando pacientes...</span>
        </div>
      ) : (
        <PatientList onSelect={handleSelectPatient} pacientes={patients} />
      )}
    </div>
  );
}
