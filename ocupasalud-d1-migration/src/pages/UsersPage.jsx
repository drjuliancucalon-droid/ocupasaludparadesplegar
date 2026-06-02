// src/pages/UsersPage.jsx — Gestión completa de usuarios con stats y PBKDF2
import React, { useState, useMemo, useCallback } from 'react';
import { UserList } from '../modules/users/components/UserList';
import { UserForm } from '../modules/users/components/UserForm';
import { useAuthStore } from '../stores/authStore';
import { Settings, Loader2, Cloud, HardDrive } from 'lucide-react';

const USERS_KEY = 'siso_users';

const loadLocal = () => {
  try { return JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); } catch { return []; }
};
const saveLocal = (d) => {
  try { localStorage.setItem(USERS_KEY, JSON.stringify(d)); } catch {}
};

// Guarda en Supabase directamente (sin necesitar el hook useBackendData)
const saveSupabase = async (data) => {
  try {
    const SB_URL = import.meta.env.VITE_SUPABASE_URL;
    const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
    if (!SB_URL || !SB_KEY) return;
    await fetch(`${SB_URL}/rest/v1/siso_store`, {
      method: 'POST',
      headers: {
        apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}`,
        'Content-Type': 'application/json', Prefer: 'resolution=merge-duplicates',
      },
      body: JSON.stringify({ key: USERS_KEY, value: data }),
    });
  } catch (e) {
    console.warn('Supabase save users error:', e.message);
  }
};

export default function UsersPage() {
  const { currentUser } = useAuthStore();
  const isSuperAdmin = currentUser?.role === 'super_admin';

  // Carga inicial desde localStorage + Supabase
  const [users, setUsers] = useState(() => {
    const local = loadLocal();
    // Si hay locales úsalos; Supabase se carga en useEffect
    return local;
  });
  const [loading, setLoading] = useState(true);
  const [source, setSource]   = useState('local');
  const [showForm, setShowForm]     = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  // Cargar desde Supabase al montar
  React.useEffect(() => {
    let mounted = true;
    const load = async () => {
      try {
        const SB_URL = import.meta.env.VITE_SUPABASE_URL;
        const SB_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
        if (SB_URL && SB_KEY) {
          const r = await fetch(
            `${SB_URL}/rest/v1/siso_store?key=eq.${USERS_KEY}&select=value`,
            { headers: { apikey: SB_KEY, Authorization: `Bearer ${SB_KEY}` } }
          );
          if (r.ok) {
            const rows = await r.json();
            const sbUsers = rows?.[0]?.value;
            if (Array.isArray(sbUsers) && sbUsers.length > 0 && mounted) {
              setUsers(sbUsers);
              saveLocal(sbUsers);
              setSource('backend');
            }
          }
        }
      } catch (e) {
        console.warn('Error cargando usuarios:', e.message);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
  }, []);

  // ── Stats para super_admin ────────────────────────────────────
  const stats = useMemo(() => {
    if (!isSuperAdmin) return null;
    try {
      const patientsRaw = localStorage.getItem('siso_patients_drcucalon') || '[]';
      const patients = JSON.parse(patientsRaw);
      const certs = patients.filter(p => p.aptitud || p.certificado || p.concepto);

      // HCs y certs por médico (usando medicoId o createdBy)
      const perUser = {};
      patients.forEach(p => {
        const key = p.medicoId || p.createdBy || p.medicoNombre || 'sin_asignar';
        if (!perUser[key]) perUser[key] = { hc: 0, certs: 0 };
        perUser[key].hc++;
        if (p.aptitud || p.certificado) perUser[key].certs++;
      });

      // Tamaño localStorage
      const storageKB = Math.round(
        Object.keys(localStorage).reduce((t, k) => t + (localStorage.getItem(k) || '').length, 0) / 1024
      );

      return {
        totalPatients: patients.length,
        totalCerts: certs.length,
        storageKB,
        perUser,
      };
    } catch { return { totalPatients: 0, totalCerts: 0, storageKB: 0, perUser: {} }; }
  }, [users, isSuperAdmin]);

  // ── Filtro por organización (administrador ve solo su org) ────
  const visibleUsers = useMemo(() => {
    if (isSuperAdmin) return users;
    // Administrador: su org o si no hay orgId, todos
    return users.filter(u =>
      !currentUser?.orgId || !u.orgId || u.orgId === currentUser.orgId
    );
  }, [users, isSuperAdmin, currentUser]);

  // ── Handlers ─────────────────────────────────────────────────
  const persist = useCallback((updated) => {
    setUsers(updated);
    saveLocal(updated);
    saveSupabase(updated);
  }, []);

  const handleAdd = useCallback(() => { setEditingUser(null); setShowForm(true); }, []);
  const handleEdit = useCallback((user) => { setEditingUser(user); setShowForm(true); }, []);

  const handleDelete = useCallback((id) => {
    if (!window.confirm('¿Eliminar este usuario permanentemente?')) return;
    persist(users.filter(u => u.id !== id));
  }, [users, persist]);

  const handleToggleActive = useCallback((user) => {
    const newState = user.activo === false;
    const label = newState ? 'activar' : 'desactivar';
    if (!window.confirm(`¿${label.charAt(0).toUpperCase() + label.slice(1)} a ${user.nombre || user.usuario}?`)) return;
    persist(users.map(u => u.id === user.id ? { ...u, activo: newState } : u));
  }, [users, persist]);

  const handleResetPassword = useCallback((user) => {
    alert(`🔐 Para restablecer la contraseña de ${user.nombre || user.usuario}:\nEntra a Editar usuario → sección "Cambiar contraseña".`);
  }, []);

  const handleSave = useCallback((userData) => {
    let updated;
    if (editingUser?.id) {
      updated = users.map(u => u.id === editingUser.id ? { ...u, ...userData } : u);
    } else {
      updated = [...users, { ...userData, activo: true, createdAt: new Date().toISOString() }];
    }
    persist(updated);
    setShowForm(false);
    setEditingUser(null);
  }, [users, editingUser, persist]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <Settings className="w-6 h-6 text-gray-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Usuarios</h1>
            <p className="text-xs text-gray-400">
              {isSuperAdmin ? 'Vista global — todos los usuarios del sistema' : 'Usuarios de tu IPS'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-1 text-xs text-gray-400">
          {source === 'backend'
            ? <><Cloud className="w-3 h-3 text-emerald-500" /><span>Supabase</span></>
            : <><HardDrive className="w-3 h-3" /><span>Local</span></>}
        </div>
      </div>

      {/* Formulario crear/editar */}
      {showForm && (
        <div className="mb-6">
          <UserForm
            user={editingUser}
            onSave={handleSave}
            onCancel={() => { setShowForm(false); setEditingUser(null); }}
            existingUsers={users}
            usersList={users}
            currentUser={currentUser}
          />
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-emerald-500 animate-spin" />
          <span className="ml-3 text-gray-500">Cargando usuarios...</span>
        </div>
      ) : (
        <UserList
          users={visibleUsers}
          currentUser={currentUser}
          stats={stats}
          onAdd={handleAdd}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onToggleActive={handleToggleActive}
          onResetPassword={handleResetPassword}
        />
      )}
    </div>
  );
}
