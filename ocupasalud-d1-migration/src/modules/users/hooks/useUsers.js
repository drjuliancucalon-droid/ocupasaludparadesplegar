import { useState, useCallback } from 'react';

/**
 * useUsers - Hook para gestión de usuarios del sistema
 */
export const useUsers = ({ syncStorage, storageKey = 'siso_users' } = {}) => {
  const [users, setUsers] = useState(() => {
    try { return JSON.parse(localStorage.getItem(storageKey) || '[]'); } catch { return []; }
  });

  const sync = useCallback((list) => {
    try { localStorage.setItem(storageKey, JSON.stringify(list)); } catch {}
    if (syncStorage) syncStorage(storageKey, JSON.stringify(list));
  }, [storageKey, syncStorage]);

  const addUser = useCallback((user) => {
    const newUser = { ...user, id: user.id || `usr_${Date.now()}`, createdAt: new Date().toISOString() };
    setUsers((prev) => { const upd = [...prev, newUser]; sync(upd); return upd; });
    return newUser;
  }, [sync]);

  const updateUser = useCallback((id, updates) => {
    setUsers((prev) => { const upd = prev.map((u) => (u.id === id ? { ...u, ...updates } : u)); sync(upd); return upd; });
  }, [sync]);

  const deleteUser = useCallback((id) => {
    setUsers((prev) => { const upd = prev.filter((u) => u.id !== id); sync(upd); return upd; });
  }, [sync]);

  const findUser = useCallback((id) => users.find((u) => u.id === id), [users]);
  const findByUsername = useCallback((username) => users.find((u) => u.usuario === username), [users]);

  return { users, setUsers, addUser, updateUser, deleteUser, findUser, findByUsername };
};
