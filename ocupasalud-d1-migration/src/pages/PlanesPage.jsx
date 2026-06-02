// src/pages/PlanesPage.jsx — Plans and licenses
import React, { useState } from 'react';
import { LicenseManager } from '../modules/users/components/LicenseManager';
import { useAuthStore } from '../stores/authStore';
import { CreditCard } from 'lucide-react';

const USERS_KEY = 'siso_users';

function loadFromStorage(key, fallback = []) {
  try { return JSON.parse(localStorage.getItem(key) || 'null') || fallback; }
  catch { return fallback; }
}

export default function PlanesPage() {
  const { currentUser } = useAuthStore();
  const [users] = useState(() => loadFromStorage(USERS_KEY));

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <CreditCard className="w-6 h-6 text-purple-600" />
        <h1 className="text-2xl font-bold text-gray-800">Planes y Licencias</h1>
      </div>
      <LicenseManager users={users} currentUser={currentUser} />
    </div>
  );
}
