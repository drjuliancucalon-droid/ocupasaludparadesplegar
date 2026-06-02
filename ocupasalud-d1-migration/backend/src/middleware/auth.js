// backend/src/middleware/auth.js — JWT authentication middleware
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';

/**
 * Require valid JWT token in Authorization header.
 * Attaches decoded user to req.user
 */
export function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Token de autenticación requerido' });
  }

  const token = authHeader.slice(7);
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = decoded;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ message: 'Token expirado', code: 'TOKEN_EXPIRED' });
    }
    return res.status(401).json({ message: 'Token inválido' });
  }
}

/**
 * Require specific roles. Use after requireAuth.
 * @param {...string} roles - Allowed roles
 */
export function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'No autenticado' });
    }
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'No tienes permisos para esta acción' });
    }
    next();
  };
}

/**
 * Generate JWT tokens pair (access + refresh)
 */
export function generateTokens(user) {
  const payload = {
    id: user.id,
    user: user.user,
    nombre: user.name || user.nombre || user.user,
    role: user.role,
    empresaId: user.empresaId || null,
  };

  const token = jwt.sign(payload, config.jwt.secret, { expiresIn: config.jwt.expiry });
  const refreshToken = jwt.sign(
    { id: user.id, type: 'refresh' },
    config.jwt.refreshSecret,
    { expiresIn: config.jwt.refreshExpiry }
  );

  return { token, refreshToken };
}

/**
 * Verify refresh token
 */
export function verifyRefreshToken(refreshToken) {
  try {
    return jwt.verify(refreshToken, config.jwt.refreshSecret);
  } catch {
    return null;
  }
}
