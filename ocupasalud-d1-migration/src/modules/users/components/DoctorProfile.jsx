import React, { useState } from 'react';
import { User, Save, Upload, Camera } from 'lucide-react';
import { InputGroup } from '../../../shared/components/ui/InputGroup';

/**
 * DoctorProfile - Perfil y configuración del médico
 * Datos profesionales, firma digital, configuración IPS
 */
export const DoctorProfile = ({ user, onSave, onSignatureUpload }) => {
  const [form, setForm] = useState({
    nombre: '', cedula: '', titulo: 'Médico Especialista en Salud Ocupacional',
    licencia: '', ciudad: '', departamento: '', celular: '', email: '',
    telefono: '', especialidad: '', universidad: '', registroMedico: '',
    ...user,
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((p) => ({ ...p, [name]: value }));
  };

  const handleSignatureInput = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (onSignatureUpload) onSignatureUpload(reader.result);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-black text-gray-800 flex items-center gap-2">
        <User className="w-5 h-5 text-emerald-600" /> Perfil Profesional
      </h2>

      <div className="bg-white border border-gray-200 rounded-xl p-4 space-y-4">
        {/* Personal data */}
        <div className="flex flex-wrap -mx-1.5">
          <InputGroup label="Nombre completo *" name="nombre" value={form.nombre} onChange={handleChange} width="w-1/2" />
          <InputGroup label="Cédula" name="cedula" value={form.cedula} onChange={handleChange} width="w-1/4" />
          <InputGroup label="Registro Médico" name="registroMedico" value={form.registroMedico} onChange={handleChange} width="w-1/4" />
          <InputGroup label="Título profesional" name="titulo" value={form.titulo} onChange={handleChange} width="w-1/2" />
          <InputGroup label="Licencia S.O." name="licencia" value={form.licencia} onChange={handleChange} width="w-1/4" />
          <InputGroup label="Especialidad" name="especialidad" value={form.especialidad} onChange={handleChange} width="w-1/4" />
          <InputGroup label="Universidad" name="universidad" value={form.universidad} onChange={handleChange} width="w-1/2" />
          <InputGroup label="Ciudad" name="ciudad" value={form.ciudad} onChange={handleChange} width="w-1/4" />
          <InputGroup label="Departamento" name="departamento" value={form.departamento} onChange={handleChange} width="w-1/4" />
          <InputGroup label="Celular" name="celular" value={form.celular} onChange={handleChange} width="w-1/4" />
          <InputGroup label="Teléfono fijo" name="telefono" value={form.telefono} onChange={handleChange} width="w-1/4" />
          <InputGroup label="Email" name="email" type="email" value={form.email} onChange={handleChange} width="w-1/2" />
        </div>

        {/* Signature */}
        <div className="bg-gray-50 rounded-xl p-4">
          <p className="text-xs font-black text-gray-700 mb-2 flex items-center gap-1">
            <Camera className="w-4 h-4" /> Firma Digital - Ley 527/1999
          </p>
          <div className="flex items-center gap-4">
            {user?.firma ? (
              <img src={user.firma} alt="Firma" className="h-16 border border-gray-200 rounded-lg bg-white p-1" />
            ) : (
              <div className="w-32 h-16 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
                <span className="text-[10px] text-gray-400">Sin firma</span>
              </div>
            )}
            <label className="px-4 py-2 bg-blue-50 border border-blue-200 text-blue-700 rounded-lg text-xs font-bold cursor-pointer hover:bg-blue-100 flex items-center gap-1.5">
              <Upload className="w-4 h-4" /> Subir firma
              <input type="file" accept="image/*" onChange={handleSignatureInput} className="hidden" />
            </label>
          </div>
          <p className="text-[9px] text-gray-400 mt-2">
            Cargue imagen de su firma (PNG o JPG, fondo blanco/transparente). Se incluirá en certificados e HC.
          </p>
        </div>
      </div>

      <button onClick={() => onSave?.(form)}
        className="w-full py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 flex items-center justify-center gap-1.5">
        <Save className="w-4 h-4" /> Guardar Perfil
      </button>
    </div>
  );
};
