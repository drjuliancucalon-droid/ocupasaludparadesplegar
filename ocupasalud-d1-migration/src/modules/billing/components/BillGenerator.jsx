import React, { useState, useMemo } from 'react';
import { DollarSign, CheckSquare, Square, Filter, Save, Printer, Plus, Trash2 } from 'lucide-react';
import { InputGroup } from '../../../shared/components/ui/InputGroup';
import { SelectGroup } from '../../../shared/components/ui/SelectGroup';
import { numeroALetras } from '../../../shared/lib/formatters';

export const BillGenerator = ({ doctorData, companies = [], onSave, onPrint, savedBills = [], atencionesCerradas = [], patients = [] }) => {
  const [filterEmpresaId, setFilterEmpresaId] = useState('');
  const [filterMes, setFilterMes] = useState('');
  const [selectedWorkers, setSelectedWorkers] = useState({});
  const [workerValues, setWorkerValues] = useState({});
  const [marcarTodos, setMarcarTodos] = useState(false);
  const [modoCobro, setModoCobro] = useState('por_trabajador');
  const [valorUnitarioGlobal, setValorUnitarioGlobal] = useState(0);

  // Obtener todas las atenciones disponibles (fallback multiple)
  const atencionesGlobales = useMemo(() => {
    let todas = [...(atencionesCerradas || [])];
    // Fallback: usar pacientes con empresa si no hay atenciones
    if (todas.length === 0 && patients && patients.length > 0) {
      todas = patients
        .filter(p => p.empresa)
        .map(p => ({
          id: p.id,
          docNumero: p.docNumero,
          nombres: p.nombres,
          nombre: p.nombres,
          docTipo: p.docTipo,
          empresa: p.empresa,
          empresaId: p.empresaId,
          empresaNombre: p.empresa,
          fechaAtencion: p.fechaExamen || p.fecha,
          tipo: p.tipoExamen || 'Evaluacion'
        }));
    }
    return todas;
  }, [atencionesCerradas, patients]);

  const atencionesFiltradas = useMemo(() => {
    // Si no hay filtros, mostrar todas las atenciones disponibles
    if (!filterEmpresaId && !filterMes) return atencionesGlobales;
    return atencionesGlobales.filter(a => {
      const emp = (a.empresa || a.empresaNombre || "").toLowerCase();
      const filtroEmp = (filterEmpresaId || "").toLowerCase();
      const matchEmp = !filterEmpresaId || emp.includes(filtroEmp);
      const fecha = a.fechaAtencion || a.fecha || "";
      const matchMes = !filterMes || fecha.startsWith(filterMes);
      return matchEmp && matchMes;
    });
  }, [atencionesGlobales, filterEmpresaId, filterMes]);

  const trabajadoresUnicos = useMemo(() => {
    const map = new Map();
    atencionesFiltradas.forEach(a => {
      const docKey = a.docNumero || a.id;
      if (!map.has(docKey)) {
        map.set(docKey, {
          docNumero: docKey,
          nombres: a.nombres || a.nombre || a.pacienteNombre || 'Sin nombre',
          docTipo: a.docTipo || a.tipoDoc || 'CC',
          empresa: a.empresa || a.empresaNombre,
          empresaId: a.empresaId || a.empresa,
          atenciones: []
        });
      }
      map.get(docKey).atenciones.push(a);
    });
    return Array.from(map.values());
  }, [atencionesFiltradas]);

  const getCantidadAtenciones = (docNumero) => {
    const t = trabajadoresUnicos.find(x => x.docNumero === docNumero);
    return t ? t.atenciones.length : 0;
  };

  const toggleWorker = (doc) => setSelectedWorkers(prev => ({...prev, [doc]: !prev[doc]}));
  const updateWorkerValor = (doc, v) => setWorkerValues(prev => ({...prev, [doc]: parseFloat(v) || 0}));

  const handleMarcarTodos = () => {
    const nuevoEstado = !marcarTodos;
    setMarcarTodos(nuevoEstado);
    const nuevosSeleccionados = {};
    const nuevosValores = {};
    trabajadoresUnicos.forEach(t => {
      nuevosSeleccionados[t.docNumero] = nuevoEstado;
      nuevosValores[t.docNumero] = workerValues[t.docNumero] || valorUnitarioGlobal;
    });
    setSelectedWorkers(nuevosSeleccionados);
    setWorkerValues(nuevosValores);
  };

  const totalSeleccionado = useMemo(() => {
    let total = 0;
    Object.entries(selectedWorkers).forEach(([doc, sel]) => {
      if (!sel) return;
      const valor = parseFloat(workerValues[doc]) || 0;
      const cantidad = modoCobro === 'por_trabajador' ? 1 : getCantidadAtenciones(doc);
      total += valor * cantidad;
    });
    return total;
  }, [selectedWorkers, workerValues, modoCobro, trabajadoresUnicos]);

  const detalleAtenciones = useMemo(() => {
    const dets = [];
    Object.entries(selectedWorkers).forEach(([doc, sel]) => {
      if (!sel) return;
      const trab = trabajadoresUnicos.find(t => t.docNumero === doc);
      if (!trab) return;
      trab.atenciones.forEach(a => {
        dets.push({trabajador: trab.nombres, documento: trab.docTipo + ' ' + trab.docNumero, fecha: a.fechaAtencion, tipo: a.tipoAtencion || 'Evaluacion'});
      });
    });
    return dets;
  }, [selectedWorkers, trabajadoresUnicos]);

  const [bill, setBill] = useState({
    numero: 'CC-' + String(savedBills.length + 1).padStart(4, '0'),
    fecha: new Date().toISOString().split('T')[0],
    empresaId: '', empresaNombre: '', empresaNit: '',
    items: [{ id: Date.now(), descripcion: 'Evaluacion medica ocupacional', cantidad: 1, valorUnit: 0 }]
  });

  const handleChange = (field, value) => setBill((p) => ({ ...p, [field]: value }));

  const handleCompanyChange = (compId) => {
    const comp = companies.find((c) => c.id === compId);
    if (comp) setBill((p) => ({ ...p, empresaId: comp.id, empresaNombre: comp.nombre, empresaNit: comp.nit || '' }));
  };

  const handleFilterEmpresaChange = (e) => {
    const empId = e.target.value;
    setFilterEmpresaId(empId);
    const comp = companies.find(c => c.id === empId);
    if (comp) setBill(p => ({...p, empresaId: comp.id, empresaNombre: comp.nombre, empresaNit: comp.nit || ''}));
  };

  const handleSave = () => {
    const itemsParaGuardar = Object.entries(selectedWorkers).filter(([_, sel]) => sel).map(([doc, _]) => {
      const trab = trabajadoresUnicos.find(t => t.docNumero === doc);
      const cantidad = modoCobro === 'por_trabajador' ? 1 : getCantidadAtenciones(doc);
      const valor = workerValues[doc] || 0;
      return {descripcion: 'Evaluacion medica - ' + (trab?.nombres || 'Trabajador'), cantidad, valorUnit: valor, subtotal: cantidad * valor};
    });
    
    // Agregar referencias para el portal de empresas
    const billCompleto = {
      ...bill, 
      items: itemsParaGuardar.length > 0 ? itemsParaGuardar : bill.items, 
      total: totalSeleccionado, 
      detalleAtenciones,
      // Referencias para recuperación por empresa
      referenciaEmpresa: {
        nit: bill.empresaNit,
        nombre: bill.empresaNombre,
        empresaId: bill.empresaId,
        periodo: filterMes || new Date().toISOString().slice(0, 7),
        fechaGeneracion: new Date().toISOString()
      },
      // Datos adicionales para el portal
      trabajadoresCount: Object.keys(selectedWorkers).filter(([_, sel]) => sel).length,
      modoCobro: modoCobro
    };
    onSave?.(billCompleto);
  };

  const subtotal = bill.items.reduce((s, it) => s + (it.cantidad || 0) * (it.valorUnit || 0), 0);
  const total = subtotal;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-black text-gray-800 flex items-center gap-2"><DollarSign className="w-5 h-5 text-emerald-600" />Cuenta de Cobro</h2>
        <span className="text-xs font-mono text-gray-500">N. {bill.numero}</span>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
        <div className="flex items-center gap-2 mb-3"><Filter className="w-4 h-4 text-blue-600" /><p className="text-xs font-black text-blue-800 uppercase">Paso 1: Seleccionar periodo</p></div>
        <div className="flex flex-wrap -mx-1.5">
          <div className="w-1/2 px-1.5 mb-2"><label className="block text-[10px] font-black text-gray-600 mb-0.5 uppercase">Empresa</label>
            <select value={filterEmpresaId} onChange={handleFilterEmpresaChange} className="w-full p-2 border border-gray-200 rounded text-xs font-bold bg-white"><option value="">Seleccionar empresa...</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.nombre} (NIT: {c.nit || '--'})</option>)}</select></div>
          <div className="w-1/2 px-1.5 mb-2"><label className="block text-[10px] font-black text-gray-600 mb-0.5 uppercase">Mes / Periodo</label>
            <input type="month" value={filterMes} onChange={(e) => setFilterMes(e.target.value)} className="w-full p-2 border border-gray-200 rounded text-xs font-bold bg-white" /></div>
        </div>
        <p className="text-[10px] text-blue-600">{trabajadoresUnicos.length} trabajador(es) encontrado(s)</p>
      </div>

      {trabajadoresUnicos.length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3"><DollarSign className="w-4 h-4 text-amber-600" /><p className="text-xs font-black text-amber-800 uppercase">Paso 2: Modalidad de cobro</p></div>
          <div className="flex gap-4"><label className="flex items-center gap-2"><input type="radio" name="modoCobro" checked={modoCobro === 'por_trabajador'} onChange={() => setModoCobro('por_trabajador')} /><span className="text-xs font-bold">Por trabajador</span></label><label className="flex items-center gap-2"><input type="radio" name="modoCobro" checked={modoCobro === 'por_atencion'} onChange={() => setModoCobro('por_atencion')} /><span className="text-xs font-bold">Por atencion</span></label></div>
          <div className="mt-3"><label className="text-xs font-bold text-gray-600">Valor unitario:</label><input type="number" value={valorUnitarioGlobal} onChange={(e) => setValorUnitarioGlobal(parseFloat(e.target.value) || 0)} className="w-32 p-1.5 border rounded text-xs text-right font-bold" /></div>
        </div>
      )}

      {trabajadoresUnicos.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="flex justify-between items-center mb-3"><div className="flex items-center gap-2"><CheckSquare className="w-4 h-4 text-emerald-600" /><p className="text-xs font-black uppercase">Trabajadores a facturar</p></div><label className="flex items-center gap-2"><input type="checkbox" checked={marcarTodos} onChange={handleMarcarTodos} /><span className="text-xs font-bold"> Seleccionar todos</span></label></div>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {trabajadoresUnicos.map((trabajador) => {
              const cantidad = getCantidadAtenciones(trabajador.docNumero);
              const esSeleccionado = selectedWorkers[trabajador.docNumero];
              const valor = workerValues[trabajador.docNumero] || valorUnitarioGlobal;
              const subtotalFila = modoCobro === 'por_trabajador' ? valor : valor * cantidad;
              return (<div key={trabajador.docNumero} className={'flex items-center gap-2 p-2 rounded-lg border ' + (esSeleccionado ? 'bg-emerald-50 border-emerald-300' : 'bg-gray-50 border-gray-200')}>
                <button onClick={() => toggleWorker(trabajador.docNumero)}>{esSeleccionado ? <CheckSquare className="w-5 h-5 text-emerald-600" /> : <Square className="w-5 h-5 text-gray-400" />}</button>
                <div className="flex-1"><p className="text-xs font-bold">{trabajador.nombres}</p><p className="text-[10px] text-gray-500">{trabajador.docTipo} {trabajador.docNumero}</p></div>
                <div className="text-center px-2"><p className="text-[10px] text-gray-500">Cant</p><p className="text-xs font-bold">{cantidad}</p></div>
                <div className="w-24"><input type="number" value={valor} onChange={(e) => updateWorkerValor(trabajador.docNumero, e.target.value)} className="w-full p-1 border rounded text-xs text-right" disabled={!esSeleccionado} /></div>
                <div className="w-24 text-right"><p className="text-[10px] text-gray-500">Subtotal</p><p className="text-xs font-black text-emerald-700">{subtotalFila.toLocaleString('es-CO')}</p></div>
              </div>);
            })}
          </div>
          <div className="mt-4 pt-3 border-t flex justify-end"><div className="text-right"><p className="text-xs text-gray-600">Total:</p><p className="text-lg font-black text-emerald-600">{totalSeleccionado.toLocaleString('es-CO')}</p></div></div>
        </div>
      )}

      <div className="bg-gray-50 rounded-xl p-4">
        <p className="text-xs font-black text-gray-700 uppercase mb-3">Datos de la cuenta</p>
        <div className="flex flex-wrap -mx-1.5">
          <InputGroup label="N. Cuenta" name="numero" value={bill.numero} onChange={(e) => handleChange('numero', e.target.value)} width="w-1/4" />
          <InputGroup label="Fecha" name="fecha" type="date" value={bill.fecha} onChange={(e) => handleChange('fecha', e.target.value)} width="w-1/4" />
          <div className="w-1/2 px-1.5"><label className="block text-[10px] font-black text-gray-600 mb-0.5 uppercase">Empresa</label><select value={bill.empresaId} onChange={(e) => handleCompanyChange(e.target.value)} className="w-full p-1.5 border border-gray-200 rounded text-xs font-bold bg-white"><option value="">Seleccionar...</option>{companies.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></div>
        </div>
      </div>

      {detalleAtenciones.length > 0 && (<div className="bg-white border border-gray-200 rounded-xl p-4"><p className="text-xs font-black text-gray-700 uppercase mb-3">Detalle de atenciones</p><div className="max-h-40 overflow-y-auto"><table className="w-full text-[10px]"><thead className="bg-gray-100"><tr><th>Trabajador</th><th>Documento</th><th>Fecha</th><th>Tipo</th></tr></thead><tbody>{detalleAtenciones.slice(0, 15).map((det, idx) => (<tr key={idx} className="border-b"><td>{det.trabajador}</td><td>{det.documento}</td><td>{det.fecha}</td><td>{det.tipo}</td></tr>))}</tbody></table></div></div>)}

      <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4"><div className="flex justify-between text-sm font-black border-t border-emerald-300 pt-2 mt-2"><span className="text-emerald-800">TOTAL:</span><span className="text-emerald-800">{total.toLocaleString('es-CO')}</span></div></div>

      <div className="flex gap-2 pt-3 border-t"><button onClick={handleSave} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-xl text-xs font-black hover:bg-emerald-700 flex items-center justify-center gap-1.5"><Save className="w-4 h-4" />Guardar</button><button onClick={() => onPrint?.(bill)} className="py-2.5 px-6 bg-gray-100 text-gray-700 rounded-xl text-xs font-bold hover:bg-gray-200">Imprimir</button></div>
    </div>
  );
};
