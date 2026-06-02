// src/shared/components/PlanGate.jsx — Feature gating por plan
// Implementación según monolito líneas 8148-8156
import { useAuthStore } from '../../stores/authStore';

export const PlanGate = ({ feature, children, fallback = null }) => {
  const canUse = useAuthStore((state) => state.canUse);
  
  if (canUse(feature)) return children;
  
  return fallback || (
    <div className="text-center py-8 opacity-60">
      <p className="text-sm text-gray-500">🔒 Requiere plan Pro</p>
      <a href="/planes" className="mt-2 text-xs text-indigo-600 underline">Ver planes</a>
    </div>
  );
};

export default PlanGate;