// backend/src/routes/auth.js — Authentication endpoints
import { Router } from 'express';
import { z } from 'zod';
import { generateTokens, verifyRefreshToken } from '../middleware/auth.js';
import { supabase } from '../services/supabaseClient.js';

const router = Router();

// ── Validation schemas ───────────────────────────
const loginSchema = z.object({
  username: z.string().min(1, 'Usuario requerido').max(100),
  password: z.string().min(1, 'Contraseña requerida').max(200),
});

const refreshSchema = z.object({
  refreshToken: z.string().min(1),
});

// ── PBKDF2 password verification (matches frontend's _pbkdf2Hash) ────
async function pbkdf2Hash(password, saltHex) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), { name: 'PBKDF2' }, false, ['deriveBits']
  );
  const saltBytes = new Uint8Array(saltHex.match(/../g).map((h) => parseInt(h, 16)));
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: saltBytes, iterations: 100000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return Array.from(new Uint8Array(bits)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function sha256(str) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(str));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(password, storedHash, storedSalt) {
  if (!storedSalt) {
    // Legacy SHA-256 (no salt)
    return (await sha256(password)) === storedHash;
  }
  const hash = await pbkdf2Hash(password, storedSalt);
  return hash === storedHash;
}

// ── POST /api/auth/login ─────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = loginSchema.parse(req.body);

    // Fetch users from Supabase key-value store
    const usersData = await supabase.getStoreValue('siso_users');
    if (!usersData || !Array.isArray(usersData)) {
      return res.status(500).json({ message: 'Error al obtener datos de usuarios' });
    }

    // Find user (field is 'user' in Supabase, also check 'name' for friendly login)
    const user = usersData.find((u) => u.user === username || u.name === username);
    if (!user) {
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
    }

    // Verify password
    const isValid = await verifyPassword(password, user.passHash, user.passSalt);
    if (!isValid) {
      return res.status(401).json({ message: 'Usuario o contraseña incorrectos' });
    }

    // Generate tokens
    const tokens = generateTokens(user);

    // Return user data (without password hash)
    const { passHash, passSalt, ...safeUser } = user;
    res.json({
      user: safeUser,
      ...tokens,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    console.error('Login error:', err.message);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ── POST /api/auth/refresh ───────────────────────
router.post('/refresh', async (req, res) => {
  try {
    const { refreshToken } = refreshSchema.parse(req.body);
    const decoded = verifyRefreshToken(refreshToken);

    if (!decoded) {
      return res.status(401).json({ message: 'Refresh token inválido o expirado' });
    }

    // Fetch user to generate new tokens with current data
    const usersData = await supabase.getStoreValue('siso_users');
    const user = usersData?.find((u) => u.id === decoded.id);

    if (!user) {
      return res.status(401).json({ message: 'Usuario no encontrado' });
    }

    const tokens = generateTokens(user);
    const { passHash, passSalt, ...safeUser } = user;

    res.json({ user: safeUser, ...tokens });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    console.error('Refresh error:', err.message);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
});

// ── GET /api/auth/me ─────────────────────────────
// Returns current user data (requires auth middleware)
router.get('/me', async (req, res) => {
  // req.user is set by requireAuth middleware
  if (!req.user) {
    return res.status(401).json({ message: 'No autenticado' });
  }
  res.json({ user: req.user });
});

export default router;
