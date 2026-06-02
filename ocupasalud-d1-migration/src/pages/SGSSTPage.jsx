import React from 'react';
import SSTDashboard from '../modules/sgsst/components/SSTDashboard';
import { Shield } from 'lucide-react';

export default function SGSSTPage() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Shield className="w-6 h-6 text-red-600" />
        <h1 className="text-2xl font-bold text-gray-800">SG-SST — Sistema de Gestión</h1>
      </div>
      <SSTDashboard />
    </div>
  );
}
