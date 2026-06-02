import React, { useState, useMemo } from 'react';
import { useAuthStore } from '../../../stores/authStore';
import { Download, FileText, BarChart3, Users, Activity, Briefcase, Calendar } from 'lucide-react';
import { saveAs } from 'file-saver';
import * as XLSX from 'xlsx';

// Utilidad para formatear fechas
const formatDate = (dateString) => {
  if (!dateString) return '';
  const [year, month, day] = dateString.split('-');
  return `${day}/${month}/${year}`;
};

export default function ReportsPage() {
  const { currentUser } = useAuthStore();
  
  // Estados locales simulando datos del monolito (En producción, esto viene de hooks de backend)
  // NOTA: En siso-appultimo, deberías usar tus hooks existentes: usePatients(), useAgendas(), etc.
  // Para este parche, asumimos que obtienes los datos del contexto global o localStorage si no hay DB conectada aún.
  const [patients, setPatients] = useState(() => {
    const stored = localStorage.getItem(`siso_patients_${currentUser?.user}`);
    return stored ? JSON.parse(stored) : [];
  });
  
  const [reportType, setReportType] = useState('resumen'); // resumen, morbilidad, ausentismo, empresa
  const [filterEmpresa, setFilterEmpresa] = useState('');
  const [filterFechaInicio, setFilterFechaInicio] = useState('');
  const [filterFechaFin, setFilterFechaFin] = useState('');

  // Filtrado Maestro (Igual que el monolito)
  const filteredData = useMemo(() => {
    return patients.filter(p => {
      const matchEmpresa = filterEmpresa ? p.empresa?.toLowerCase().includes(filterEmpresa.toLowerCase()) : true;
      const fechaExamen = p.fechaExamen || p.fechaCreacion;
      const matchInicio = filterFechaInicio ? fechaExamen >= filterFechaInicio : true;
      const matchFin = filterFechaFin ? fechaExamen <= filterFechaFin : true;
      return matchEmpresa && matchInicio && matchFin;
    });
  }, [patients, filterEmpresa, filterFechaInicio, filterFechaFin]);

  // --- LÓGICA DE CÁLCULO (Réplica del Monolito) ---

  // 1. Resumen Ejecutivo
  const stats = useMemo(() => {
    const total = filteredData.length;
    const aptos = filteredData.filter(p => p.conceptoAptitud?.includes('APTO') && !p.conceptoAptitud.includes('RESTRICCIONES')).length;
    const conRestricciones = filteredData.filter(p => p.conceptoAptitud?.includes('RESTRICCIONES')).length;
    const noAptos = filteredData.filter(p => p.conceptoAptitud?.includes('NO APTO')).length;
    
    // Agrupación por Empresa
    const porEmpresa = filteredData.reduce((acc, curr) => {
      const emp = curr.empresa || 'Sin Empresa';
      acc[emp] = (acc[emp] || 0) + 1;
      return acc;
    }, {});

    return { total, aptos, conRestricciones, noAptos, porEmpresa };
  }, [filteredData]);

  // 2. Morbilidad (CIE-10) - Lógica Crítica del Monolito
  const morbilidadData = useMemo(() => {
    const diagnosticos = {};
    filteredData.forEach(p => {
      const dx1 = p.diagnosticoPrincipal;
      const dx2 = p.diagnosticoSecundario1;
      
      if (dx1) diagnosticos[dx1] = (diagnosticos[dx1] || 0) + 1;
      if (dx2) diagnosticos[dx2] = (diagnosticos[dx2] || 0) + 1;
    });

    return Object.entries(diagnosticos)
      .map(([codigo, cantidad]) => ({ codigo, cantidad }))
      .sort((a, b) => b.cantidad - a.cantidad); // Orden descendente
  }, [filteredData]);

  // 3. Ausentismo (Días de incapacidad sugeridos)
  const ausentismoData = useMemo(() => {
    let totalDias = 0;
    const casos = [];
    filteredData.forEach(p => {
      if (p.incapacidad && p.incapacidad.aplica && p.incapacidad.dias > 0) {
        totalDias += p.incapacidad.dias;
        casos.push({
          paciente: p.nombreCompleto,
          empresa: p.empresa,
          dias: p.incapacidad.dias,
          motivo: p.incapacidad.motivo
        });
      }
    });
    return { totalDias, casos };
  }, [filteredData]);

  // --- EXPORTACIÓN A EXCEL (Estilo Monolito) ---
  const handleExportExcel = () => {
    let dataToExport = [];
    let fileName = `Reporte_SISO_${reportType}_${new Date().toISOString().split('T')[0]}.xlsx`;

    if (reportType === 'resumen') {
      dataToExport = filteredData.map(p => ({
        Fecha: p.fechaExamen,
        Paciente: p.nombreCompleto,
        Documento: p.docNumero,
        Empresa: p.empresa,
        Cargo: p.cargo,
        Tipo_Examen: p.tipoExamen,
        Diagnostico_Principal: p.diagnosticoPrincipal,
        Concepto_Aptitud: p.conceptoAptitud,
        Vigencia_Meses: p.vigencia,
        ARL: p.arl,
        Riesgo: p.nivelRiesgo
      }));
    } else if (reportType === 'morbilidad') {
      dataToExport = morbilidadData.map(item => ({
        Codigo_CIE10: item.codigo,
        Cantidad_Casos: item.cantidad,
        Porcentaje: `${((item.cantidad / (filteredData.length || 1)) * 100).toFixed(2)}%`
      }));
    } else if (reportType === 'ausentismo') {
      dataToExport = ausentismoData.casos;
    }

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reporte");
    XLSX.writeFile(wb, fileName);
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Encabezado */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <BarChart3 className="text-indigo-600" /> Reportes y Estadísticas
          </h1>
          <p className="text-sm text-gray-500">Módulo idéntico al monolito ocupasalud</p>
        </div>
        <button 
          onClick={handleExportExcel}
          className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 shadow"
        >
          <Download size={18} /> Exportar Excel
        </button>
      </div>

      {/* Filtros Globales */}
      <div className="bg-white p-4 rounded shadow mb-6 grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Empresa</label>
          <input 
            type="text" 
            placeholder="Todas las empresas"
            className="w-full p-2 border rounded text-sm"
            value={filterEmpresa}
            onChange={(e) => setFilterEmpresa(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Desde</label>
          <input 
            type="date" 
            className="w-full p-2 border rounded text-sm"
            value={filterFechaInicio}
            onChange={(e) => setFilterFechaInicio(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-gray-600 mb-1">Hasta</label>
          <input 
            type="date" 
            className="w-full p-2 border rounded text-sm"
            value={filterFechaFin}
            onChange={(e) => setFilterFechaFin(e.target.value)}
          />
        </div>
        <div className="flex items-end">
          <button 
            onClick={() => { setFilterEmpresa(''); setFilterFechaInicio(''); setFilterFechaFin(''); }}
            className="w-full py-2 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 text-sm font-medium"
          >
            Limpiar Filtros
          </button>
        </div>
      </div>

      {/* Pestañas de Reportes */}
      <div className="flex gap-2 mb-6 border-b border-gray-200 overflow-x-auto">
        {[
          { id: 'resumen', label: 'Resumen Ejecutivo', icon: FileText },
          { id: 'morbilidad', label: 'Morbilidad (CIE-10)', icon: Activity },
          { id: 'ausentismo', label: 'Ausentismo e Incapacidades', icon: Calendar },
          { id: 'empresas', label: 'Por Empresa', icon: Briefcase },
        ].map(tab => (
          <button
            key={tab.id}
            onClick={() => setReportType(tab.id)}
            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
              reportType === tab.id 
                ? 'border-indigo-600 text-indigo-600 bg-indigo-50' 
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <tab.icon size={16} /> {tab.label}
          </button>
        ))}
      </div>

      {/* Contenido Dinámico */}
      <div className="bg-white rounded shadow p-6 min-h-[400px]">
        
        {/* VISTA 1: RESUMEN EJECUTIVO */}
        {reportType === 'resumen' && (
          <div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                <div className="text-sm text-blue-600 font-semibold">Total Exámenes</div>
                <div className="text-3xl font-bold text-blue-900">{stats.total}</div>
              </div>
              <div className="p-4 bg-green-50 rounded-lg border border-green-100">
                <div className="text-sm text-green-600 font-semibold">Aptos Sin Restricción</div>
                <div className="text-3xl font-bold text-green-900">{stats.aptos}</div>
              </div>
              <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-100">
                <div className="text-sm text-yellow-600 font-semibold">Aptos Con Restricción</div>
                <div className="text-3xl font-bold text-yellow-900">{stats.conRestricciones}</div>
              </div>
              <div className="p-4 bg-red-50 rounded-lg border border-red-100">
                <div className="text-sm text-red-600 font-semibold">No Aptos</div>
                <div className="text-3xl font-bold text-red-900">{stats.noAptos}</div>
              </div>
            </div>

            <h3 className="font-bold text-gray-700 mb-4">Últimos Registros</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-600 uppercase">
                  <tr>
                    <th className="p-3">Fecha</th>
                    <th className="p-3">Paciente</th>
                    <th className="p-3">Empresa</th>
                    <th className="p-3">Tipo</th>
                    <th className="p-3">Concepto</th>
                    <th className="p-3">Diagnóstico</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredData.slice(0, 10).map((p, i) => (
                    <tr key={i} className="border-b hover:bg-gray-50">
                      <td className="p-3">{formatDate(p.fechaExamen)}</td>
                      <td className="p-3 font-medium">{p.nombreCompleto}</td>
                      <td className="p-3">{p.empresa}</td>
                      <td className="p-3"><span className="px-2 py-1 bg-gray-200 rounded text-xs">{p.tipoExamen}</span></td>
                      <td className={`p-3 font-bold ${p.conceptoAptitud?.includes('NO') ? 'text-red-600' : 'text-green-600'}`}>
                        {p.conceptoAptitud?.substring(0, 20)}...
                      </td>
                      <td className="p-3 text-gray-500">{p.diagnosticoPrincipal}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {filteredData.length === 0 && <p className="text-center py-8 text-gray-500">No hay datos con los filtros actuales.</p>}
            </div>
          </div>
        )}

        {/* VISTA 2: MORBILIDAD */}
        {reportType === 'morbilidad' && (
          <div>
            <h3 className="font-bold text-gray-700 mb-4">Top Diagnósticos (CIE-10)</h3>
            <div className="space-y-3">
              {morbilidadData.map((item, idx) => (
                <div key={idx} className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                    {idx + 1}
                  </div>
                  <div className="flex-1">
                    <div className="flex justify-between mb-1">
                      <span className="font-bold text-gray-800">{item.codigo}</span>
                      <span className="text-sm text-gray-600">{item.cantidad} casos</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2.5">
                      <div 
                        className="bg-indigo-600 h-2.5 rounded-full" 
                        style={{ width: `${Math.min((item.cantidad / (filteredData.length || 1)) * 100, 100)}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              ))}
              {morbilidadData.length === 0 && <p className="text-center py-8 text-gray-500">No hay diagnósticos registrados.</p>}
            </div>
          </div>
        )}

        {/* VISTA 3: AUSENTISMO */}
        {reportType === 'ausentismo' && (
          <div>
            <div className="p-4 bg-orange-50 rounded-lg mb-6 border border-orange-200">
              <div className="text-sm text-orange-800 font-semibold">Total Días de Incapacidad Sugeridos</div>
              <div className="text-4xl font-bold text-orange-900">{ausentismoData.totalDias} días</div>
            </div>
            
            {ausentismoData.casos.length > 0 ? (
              <table className="w-full text-sm text-left">
                <thead className="bg-gray-100 text-gray-600 uppercase">
                  <tr>
                    <th className="p-3">Paciente</th>
                    <th className="p-3">Empresa</th>
                    <th className="p-3">Motivo</th>
                    <th className="p-3 text-right">Días</th>
                  </tr>
                </thead>
                <tbody>
                  {ausentismoData.casos.map((c, i) => (
                    <tr key={i} className="border-b">
                      <td className="p-3 font-medium">{c.paciente}</td>
                      <td className="p-3">{c.empresa}</td>
                      <td className="p-3 text-gray-600">{c.motivo}</td>
                      <td className="p-3 text-right font-bold text-red-600">{c.dias}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-center py-8 text-gray-500">No se registraron incapacidades en este periodo.</p>
            )}
          </div>
        )}

        {/* VISTA 4: POR EMPRESA */}
        {reportType === 'empresas' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Object.entries(stats.porEmpresa).map(([emp, count]) => (
              <div key={emp} className="p-6 border rounded-lg hover:shadow-md transition-shadow">
                <div className="flex items-center gap-3 mb-2">
                  <Briefcase className="text-gray-400" />
                  <h4 className="font-bold text-gray-800 truncate">{emp}</h4>
                </div>
                <div className="text-3xl font-bold text-indigo-600">{count}</div>
                <div className="text-xs text-gray-500 mt-1">Trabajadores evaluados</div>
                <button 
                  onClick={() => setFilterEmpresa(emp)}
                  className="mt-4 w-full py-2 text-xs bg-indigo-50 text-indigo-700 rounded hover:bg-indigo-100"
                >
                  Filtrar por esta empresa
                </button>
              </div>
            ))}
            {Object.keys(stats.porEmpresa).length === 0 && (
              <p className="col-span-full text-center py-8 text-gray-500">No hay datos agrupados por empresa.</p>
            )}
          </div>
        )}

      </div>
    </div>
  );
}