// backend/src/routes/admin.js — Admin-only endpoints
// Password reset, user management, system config
import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireRole, generateTokens } from '../middleware/auth.js';
import { supabase } from '../services/supabaseClient.js';

const router = Router();

// ── PBKDF2 hash (same as frontend's _pbkdf2Hash for compatibility) ──
async function pbkdf2Hash(password) {
  const enc = new TextEncoder();
  const saltBytes = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const keyMaterial = await globalThis.crypto.subtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const bits = await globalThis.crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  const hashHex = Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, '0')).join('');
  const saltHex = Array.from(saltBytes).map((b) => b.toString(16).padStart(2, '0')).join('');
  return { hash: hashHex, salt: saltHex };
}

// ── POST /api/admin/reset-password ───────────────────
// Resets a user's password. Requires service key (admin access).
const resetSchema = z.object({
  username: z.string().min(1, 'Username requerido'),
  newPassword: z.string().min(6, 'Mínimo 6 caracteres'),
});

router.post('/reset-password', async (req, res) => {
  try {
    const { username, newPassword } = resetSchema.parse(req.body);

    // Fetch current users
    const usersData = await supabase.getStoreValue('siso_users');
    if (!usersData || !Array.isArray(usersData)) {
      return res.status(500).json({ message: 'Error al obtener usuarios' });
    }

    const userIdx = usersData.findIndex((u) => u.user === username);
    if (userIdx < 0) {
      return res.status(404).json({ message: `Usuario "${username}" no encontrado` });
    }

    // Generate new PBKDF2 hash
    const { hash, salt } = await pbkdf2Hash(newPassword);

    // Update user
    usersData[userIdx].passHash = hash;
    usersData[userIdx].passSalt = salt;
    usersData[userIdx].mustChangePassword = false;

    // Save back to Supabase
    await supabase.setStoreValue('siso_users', usersData);

    console.log(`[ADMIN] Password reset for user: ${username}`);

    res.json({
      ok: true,
      message: `Contraseña de "${username}" actualizada correctamente`,
      user: username,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    console.error('Reset password error:', err.message);
    res.status(500).json({ message: 'Error al resetear contraseña' });
  }
});

// ── GET /api/admin/users — list all users ────────────
router.get('/users', async (req, res) => {
  try {
    const usersData = await supabase.getStoreValue('siso_users');
    const users = (usersData || []).map(({ passHash, passSalt, ...u }) => u);
    res.json({ users, count: users.length });
  } catch (err) {
    console.error('List users error:', err.message);
    res.status(500).json({ message: 'Error al listar usuarios' });
  }
});

export default router;
