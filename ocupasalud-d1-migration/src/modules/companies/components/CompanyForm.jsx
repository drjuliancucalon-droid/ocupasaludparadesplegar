import React, { useState } from 'react';
import { Building2, Save, X, Plus, Trash2, MapPin } from 'lucide-react';
import { InputGroup } from '../../../shared/components/ui/InputGroup';
import { SelectGroup } from '../../../shared/components/ui/SelectGroup';

/**
 * CompanyForm - Formulario de creación/edición de empresa
 */
const INITIAL_COMPANY = {
  nombre: '', nit: '', dv: '', direccion: '', ciudad: '', departamento: '',
  telefono: '', correo: '', representante: '', arl: '', sectorEconomico: '',
  actividadEconomica: '', codigoCIIU: '', numTrabajadores: '',
  nivelRiesgo: '', logo: '', lema: '',
  sedes: [],
};

export const CompanyForm = ({ company, onSave, onCancel }) => {
  const [form, setForm] = useState({ ...INITIAL_COMPANY, ...company });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const addSede = () => {
    setForm((prev) => ({
      ...prev,
      sedes: [...(prev.sedes || []), { id: Date.now(), nombre: '', ciudad: '', direccion: '', telefono: '' }],
    }));
  };

  const updateSede = (idx, field, value) => {
    setForm((prev) => {
      const sedes = [...(prev.sedes || [])];
      sedes[idx] = { ...sedes[idx], [field]: value };
      return { ...prev, sedes };
    });
  };

  const removeSede = (idx) => {
    setForm((prev) => ({
      ...prev,
      sedes: (prev.sedes || []).filter((_, i) => i !== idx),
    }));
  };

  const handleSubmit = () => {
    if (!form.nombre?.trim()) return;
    onSave({
      ...form,
      id: form.id || `comp_${Date.now()}`,
    });
  };

  return (
    <div className="bg-white rounded-2xl shadow-xl p-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Building2 className="w-5 h-5 text-blue-600" />
          <h2 className="text-lg font-black text-gray-800">
            {company?.id ? 'Editar Empresa' : 'Nueva Empresa'}
          </h2>
        </div>
        <button onClick={onCancel} className="text-gray-400 hover:text-gray-600"><X className="w-5 h-5" /></button>
      </div>

      <div className="space-y-4">
        {/* Datos básicos */}
        <div className="flex flex-wrap -mx-1.5">
          <InputGroup label="Razón Social *" name="nombre" value={form.nombre} onChange={handleChange} width="w-1/2" />
          <InputGroup label="NIT" name="nit" value={form.nit} onChange={handleChange} width="w-1/4" />
          <InputGroup label="DV" name="dv" value={form.dv} onChange={handleChange} width="w-1/8 min-w-[60px]" />
          <InputGroup label="Representante Legal" name="representante" value={form.representante} onChange={handleChange} width="w-1/2" />
          <InputGroup label="Dirección" name="direccion" value={form.direccion} onChange={handleChange} width="w-1/3" />
          <InputGroup label="Ciudad" name="ciudad" value={form.ciudad} onChange={handleChange} width="w-1/4" />
          <InputGroup label="Departamento" name="departamento" value={form.departamento} onChange={handleChange} width="w-1/4" />
          <InputGroup label="Teléfono" name="telefono" value={form.telefono} onChange={handleChange} width="w-1/4" />
          <InputGroup label="Correo" name="correo" type="email" value={form.correo} onChange={handleChange} width="w-1/3" />
        </div>

        {/* Datos laborales */}
        <div className="flex flex-wrap -mx-1.5">
          <InputGroup label="ARL" name="arl" value={form.arl} onChange={handleChange} width="w-1/4" />
          <InputGroup label="Sector Económico" name="sectorEconomico" value={form.sectorEconomico} onChange={handleChange} width="w-1/4" />
          <InputGroup label="Actividad Económica" name="actividadEconomica" value={form.actividadEconomica} onChange={handleChange} width="w-1/3" />
          <InputGroup label="Código CIIU" name="codigoCIIU" value={form.codigoCIIU} onChange={handleChange} width="w-1/6 min-w-[80px]" />
          <InputGroup label="Nº Trabajadores" name="numTrabajadores" type="number" value={form.numTrabajadores} onChange={handleChange} width="w-1/6 min-w-[80px]" />
          <SelectGroup label="Nivel Riesgo" name="nivelRiesgo" value={form.nivelRiesgo} onChange={handleChange}
            options={['I', 'II', 'III', 'IV', 'V']} width="w-1/6 min-w-[80px]" />
        </div>

        {/* Sedes */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-black text-gray-700 uppercase flex items-center gap-1">
              <MapPin className="w-3 h-3" /> Sedes
            </p>
            <button onClick={addSede}
              className="text-[10px] px-2 py-1 bg-blue-50 text-blue-700 rounded-lg font-bold hover:bg-blue-100 flex items-center gap-1">
              <Plus className="w-3 h-3" /> Agregar sede
            </button>
          </div>
          {(form.sedes || []).map((sede, idx) => (
            <div key={sede.id || idx} className="flex gap-2 mb-2 items-end bg-gray-50 p-2 rounded-lg">
              <InputGroup label="Nombre sede" value={sede.nombre}
                onChange={(e) => updateSede(idx, 'nombre', e.target.value)} width="flex-1" />
              <InputGroup label="Ciudad" value={sede.ciudad}
                onChange={(e) => updateSede(idx, 'ciudad', e.target.value)} width="w-1/4" />
              <InputGroup label="Dirección" value={sede.direccion}
                onChange={(e) => updateSede(idx, 'direccion', e.target.value)} width="w-1/3" />
              <button onClick={() => removeSede(idx)} className="text-red-400 hover:text-red-600 pb-1">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>

        {/* Actions */}
        <div className="flex gap-2 pt-3 border-t">
          <button onClick={handleSubmit}
            className="flex-1 py-2.5 bg-blue-600 text-white rounded-xl text-xs font-black hover:bg-blue-700 flex items-center justify-center gap-1.5">
            <Save className="w-4 h-4" /> Guardar Empresa
          </button>
          <button onClick={onCancel}
            className="py-2.5 px-6 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200">
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
};
