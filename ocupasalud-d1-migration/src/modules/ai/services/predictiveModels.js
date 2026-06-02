/**
 * Predictive Models Service - Interface for ML predictions
 * Accident prediction, absenteeism analysis, health risk scoring
 * NOTE: These are rule-based models. For full ML, integrate with a backend.
 */

/**
 * Risk score calculation based on patient data
 * Returns a risk level and contributing factors
 */
export const calculateRiskScore = (patientData) => {
  let score = 0;
  const factors = [];

  // Age-based risk
  const age = parseInt(patientData.edad) || 0;
  if (age > 55) { score += 15; factors.push('Edad > 55 años'); }
  else if (age > 45) { score += 10; factors.push('Edad > 45 años'); }

  // BMI risk
  const imc = parseFloat(patientData.imc) || 0;
  if (imc > 30) { score += 15; factors.push(`Obesidad (IMC ${imc})`); }
  else if (imc > 25) { score += 8; factors.push(`Sobrepeso (IMC ${imc})`); }

  // Blood pressure risk
  const ta = patientData.tensionArterial || '';
  const [sys, dia] = ta.split('/').map(Number);
  if (sys >= 140 || dia >= 90) { score += 20; factors.push('Hipertensión arterial'); }
  else if (sys >= 130 || dia >= 80) { score += 10; factors.push('Tensión arterial elevada'); }

  // Occupational exposure risks
  if (patientData.riesgoBiomecanico) { score += 10; factors.push('Exposición biomecánica'); }
  if (patientData.riesgoQuimico) { score += 12; factors.push('Exposición química'); }
  if (patientData.riesgoFisico) { score += 8; factors.push('Exposición física (ruido/vibración)'); }
  if (patientData.riesgoPsicosocial) { score += 10; factors.push('Riesgo psicosocial'); }

  // Habits
  if (patientData.tabaquismo === 'Sí - Actual') { score += 15; factors.push('Tabaquismo activo'); }
  if (patientData.alcoholismo === 'Sí - Actual') { score += 10; factors.push('Consumo alcohol actual'); }

  // Seniority
  const seniority = parseFloat(patientData.antiguedad) || 0;
  if (seniority > 15) { score += 8; factors.push(`Antigüedad alta (${seniority} años)`); }

  // Previous accidents
  if (patientData.accidentesTrabajoPrevios && patientData.accidentesTrabajoPrevios.trim()) {
    score += 12; factors.push('Antecedente de accidente de trabajo');
  }

  const level =
    score >= 60 ? 'ALTO' :
    score >= 35 ? 'MEDIO' :
    score >= 15 ? 'BAJO' : 'MÍNIMO';

  const color =
    level === 'ALTO' ? 'red' :
    level === 'MEDIO' ? 'orange' :
    level === 'BAJO' ? 'yellow' : 'green';

  return { score: Math.min(100, score), level, color, factors };
};

/**
 * Predict absenteeism risk based on patient profile
 */
export const predictAbsenteeism = (patientData) => {
  let riskDays = 0;
  const reasons = [];

  const imc = parseFloat(patientData.imc) || 0;
  if (imc > 30) { riskDays += 5; reasons.push('Obesidad - mayor riesgo de incapacidad'); }

  const age = parseInt(patientData.edad) || 0;
  if (age > 50) { riskDays += 3; reasons.push('Edad avanzada'); }

  if (patientData.antPatologicos?.toLowerCase().includes('lumbalgia') ||
      patientData.antPatologicos?.toLowerCase().includes('columna')) {
    riskDays += 8; reasons.push('Antecedente osteomuscular');
  }

  if (patientData.riesgoPsicosocial) {
    riskDays += 4; reasons.push('Exposición a riesgo psicosocial');
  }

  if (patientData.tabaquismo === 'Sí - Actual') {
    riskDays += 3; reasons.push('Tabaquismo activo');
  }

  return {
    estimatedDaysPerYear: riskDays,
    riskLevel: riskDays > 10 ? 'ALTO' : riskDays > 5 ? 'MEDIO' : 'BAJO',
    reasons,
  };
};

/**
 * Analyze population health trends from a list of patients
 */
export const analyzePopulationHealth = (patients) => {
  const total = patients.length;
  if (total === 0) return { totalEvaluated: 0, risks: [], trends: [] };

  const metrics = {
    overweight: 0,
    hypertension: 0,
    smokers: 0,
    highRisk: 0,
    osteomuscular: 0,
    visual: 0,
  };

  patients.forEach((p) => {
    const imc = parseFloat(p.imc) || 0;
    if (imc >= 25) metrics.overweight++;

    const ta = p.tensionArterial || '';
    const [sys] = ta.split('/').map(Number);
    if (sys >= 140) metrics.hypertension++;

    if (p.tabaquismo === 'Sí - Actual') metrics.smokers++;

    const risk = calculateRiskScore(p);
    if (risk.level === 'ALTO') metrics.highRisk++;

    const dx = [p.diagnostico1, p.diagnostico2, p.diagnostico3].filter(Boolean).join(' ').toLowerCase();
    if (dx.includes('lumbalgia') || dx.includes('tunel') || dx.includes('tendin')) metrics.osteomuscular++;
    if (dx.includes('miopia') || dx.includes('astigma') || dx.includes('presbicia')) metrics.visual++;
  });

  return {
    totalEvaluated: total,
    risks: [
      { label: 'Sobrepeso/Obesidad', count: metrics.overweight, pct: ((metrics.overweight / total) * 100).toFixed(1) },
      { label: 'Hipertensión', count: metrics.hypertension, pct: ((metrics.hypertension / total) * 100).toFixed(1) },
      { label: 'Tabaquismo activo', count: metrics.smokers, pct: ((metrics.smokers / total) * 100).toFixed(1) },
      { label: 'Riesgo alto', count: metrics.highRisk, pct: ((metrics.highRisk / total) * 100).toFixed(1) },
      { label: 'Patología osteomuscular', count: metrics.osteomuscular, pct: ((metrics.osteomuscular / total) * 100).toFixed(1) },
      { label: 'Defectos visuales', count: metrics.visual, pct: ((metrics.visual / total) * 100).toFixed(1) },
    ],
    sveRecommended: [
      metrics.osteomuscular > total * 0.2 ? 'SVE Osteomuscular (GATISO DME)' : null,
      metrics.hypertension > total * 0.15 ? 'SVE Cardiovascular' : null,
      metrics.visual > total * 0.3 ? 'SVE Visual' : null,
      metrics.smokers > total * 0.1 ? 'Programa de cesación tabáquica' : null,
    ].filter(Boolean),
  };
};
