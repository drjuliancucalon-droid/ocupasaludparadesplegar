/**
 * useSGSST.js
 * Hook personalizado para gestión del estado del módulo SG-SST
 * Usa localStorage para persistencia con prefijo 'siso_sgsst_'
 */

import { useState, useEffect, useCallback } from 'react';
import {
  riesgosCRUD,
  planesCRUD,
  capacitacionesCRUD,
  inspeccionesCRUD,
  documentosCRUD,
  accidentesCRUD,
  politicasCRUD,
  actividadesCRUD,
  getCompanyConfig,
  setCompanyConfig as saveCompanyConfig,
  calcularCumplimiento,
  calcularIndicadores,
  toggleCumplimientoEstandar,
} from '../services/sgsstService';

// Hook genérico para colecciones CRUD con localStorage
const useCollection = (crud) => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(() => {
    setItems(crud.getAll());
    setLoading(false);
  }, [crud]);

  useEffect(() => { refresh(); }, [refresh]);

  const create = useCallback((item) => {
    const newItem = crud.create(item);
    refresh();
    return newItem;
  }, [crud, refresh]);

  const update = useCallback((id, updates) => {
    const updated = crud.update(id, updates);
    refresh();
    return updated;
  }, [crud, refresh]);

  const remove = useCallback((id) => {
    crud.remove(id);
    refresh();
  }, [crud, refresh]);

  const getById = useCallback((id) => {
    return crud.getById(id);
  }, [crud]);

  return { items, loading, create, update, remove, getById, refresh, count: items.length };
};

// ─── Hook principal del SG-SST ────────────────────────────────────────────────
export const useSGSST = () => {
  const riesgos = useCollection(riesgosCRUD);
  const planes = useCollection(planesCRUD);
  const capacitaciones = useCollection(capacitacionesCRUD);
  const inspecciones = useCollection(inspeccionesCRUD);
  const documentos = useCollection(documentosCRUD);
  const accidentes = useCollection(accidentesCRUD);
  const politicas = useCollection(politicasCRUD);
  const actividades = useCollection(actividadesCRUD);

  const [companyConfig, setCompanyConfigState] = useState(getCompanyConfig());
  const [cumplimiento, setCumplimiento] = useState(null);

  const updateCompanyConfig = useCallback((config) => {
    saveCompanyConfig(config);
    setCompanyConfigState({ ...config });
  }, []);

  const refreshCumplimiento = useCallback(() => {
    const result = calcularCumplimiento(companyConfig.tipoEmpresa);
    setCumplimiento(result);
    return result;
  }, [companyConfig.tipoEmpresa]);

  useEffect(() => { refreshCumplimiento(); }, [refreshCumplimiento]);

  const toggleEstandar = useCallback((itemId) => {
    toggleCumplimientoEstandar(itemId);
    refreshCumplimiento();
  }, [refreshCumplimiento]);

  const getIndicadores = useCallback(() => {
    return calcularIndicadores(
      accidentes.items,
      companyConfig.numTrabajadores || 1,
      null
    );
  }, [accidentes.items, companyConfig.numTrabajadores]);

  // Estadísticas generales
  const getEstadisticas = useCallback(() => {
    const totalRiesgos = riesgos.count;
    const riesgosAltos = riesgos.items.filter(r => r.nivelRiesgo === 'I' || r.nivelRiesgo === 'II').length;
    const accionesAbiertas = actividades.items.filter(a => a.estado !== 'Completado').length;
    const capacitacionesCompletadas = capacitaciones.items.filter(c => c.estado === 'Completado').length;
    const totalCapacitaciones = capacitaciones.count;
    const tasaCapacitacion = totalCapacitaciones > 0 ? Math.round((capacitacionesCompletadas / totalCapacitaciones) * 100) : 0;
    const indicadores = getIndicadores();
    const inspeccionesPendientes = inspecciones.items.filter(i => i.estado === 'Pendiente').length;
    const documentosCompletos = documentos.items.filter(d => d.estado === 'Vigente' || d.estado === 'Aprobado').length;

    // Items vencidos o próximos a vencer
    const hoy = new Date();
    const en30dias = new Date(hoy.getTime() + 30 * 24 * 60 * 60 * 1000);
    const alertas = [];

    actividades.items.forEach(act => {
      if (act.fechaLimite && new Date(act.fechaLimite) < hoy && act.estado !== 'Completado') {
        alertas.push({ tipo: 'vencido', mensaje: `Actividad vencida: ${act.nombre}`, fecha: act.fechaLimite, prioridad: 'alta' });
      }
    });

    inspecciones.items.forEach(insp => {
      if (insp.proximaFecha && new Date(insp.proximaFecha) < hoy && insp.estado !== 'Completado') {
        alertas.push({ tipo: 'vencido', mensaje: `Inspección vencida: ${insp.nombre}`, fecha: insp.proximaFecha, prioridad: 'alta' });
      }
    });

    capacitaciones.items.forEach(cap => {
      if (cap.fecha && new Date(cap.fecha) > hoy && new Date(cap.fecha) <= en30dias && cap.estado !== 'Completado') {
        alertas.push({ tipo: 'proximo', mensaje: `Capacitación próxima: ${cap.nombre}`, fecha: cap.fecha, prioridad: 'media' });
      }
    });

    return {
      totalRiesgos,
      riesgosAltos,
      accionesAbiertas,
      tasaCapacitacion,
      capacitacionesCompletadas,
      totalCapacitaciones,
      indicadores,
      inspeccionesPendientes,
      documentosCompletos,
      totalDocumentos: 21,
      alertas: alertas.sort((a, b) => (a.prioridad === 'alta' ? -1 : 1)),
    };
  }, [riesgos, actividades, capacitaciones, inspecciones, documentos, getIndicadores]);

  return {
    // Colecciones
    riesgos,
    planes,
    capacitaciones,
    inspecciones,
    documentos,
    accidentes,
    politicas,
    actividades,

    // Configuración
    companyConfig,
    updateCompanyConfig,

    // Cumplimiento
    cumplimiento,
    refreshCumplimiento,
    toggleEstandar,

    // Indicadores
    getIndicadores,
    getEstadisticas,
  };
};

// ─── Hooks especializados para componentes individuales ───────────────────────

export const useRiesgos = () => {
  const { items, create, update, remove, refresh, count } = useCollection(riesgosCRUD);
  return { riesgos: items, crearRiesgo: create, actualizarRiesgo: update, eliminarRiesgo: remove, refresh, totalRiesgos: count };
};

export const usePlanes = () => {
  const { items, create, update, remove, refresh } = useCollection(planesCRUD);
  return { planes: items, crearPlan: create, actualizarPlan: update, eliminarPlan: remove, refresh };
};

export const useCapacitaciones = () => {
  const { items, create, update, remove, refresh } = useCollection(capacitacionesCRUD);
  return { capacitaciones: items, crearCapacitacion: create, actualizarCapacitacion: update, eliminarCapacitacion: remove, refresh };
};

export const useInspecciones = () => {
  const { items, create, update, remove, refresh } = useCollection(inspeccionesCRUD);
  return { inspecciones: items, crearInspeccion: create, actualizarInspeccion: update, eliminarInspeccion: remove, refresh };
};

export const useDocumentos = () => {
  const { items, create, update, remove, refresh } = useCollection(documentosCRUD);
  return { documentos: items, crearDocumento: create, actualizarDocumento: update, eliminarDocumento: remove, refresh };
};

export const useAccidentes = () => {
  const { items, create, update, remove, refresh } = useCollection(accidentesCRUD);
  return { accidentes: items, crearAccidente: create, actualizarAccidente: update, eliminarAccidente: remove, refresh };
};

export const usePoliticas = () => {
  const { items, create, update, remove, refresh } = useCollection(politicasCRUD);
  return { politicas: items, crearPolitica: create, actualizarPolitica: update, eliminarPolitica: remove, refresh };
};

export default useSGSST;
