// backend/src/server.js — Express server entry point
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config, validateConfig } from './config/env.js';
import { requireAuth } from './middleware/auth.js';

// Routes
import healthRouter from './routes/health.js';
import authRouter from './routes/auth.js';
import aiRouter from './routes/ai.js';
import dataRouter from './routes/data.js';
import writeRouter from './routes/write.js';
import adminRouter from './routes/admin.js';

const app = express();

// ── Security middleware ──────────────────────────
app.use(helmet());
// Accept both 5173 and 5174 (Vite may use alternate port)
const corsOrigins = [config.corsOrigin, config.corsOrigin.replace(':5173', ':5174')].filter(Boolean);
app.use(cors({ origin: corsOrigins, credentials: true }));
app.use(express.json({ limit: '10mb' }));

// ── Rate limiting ────────────────────────────────
// General: 100 requests per minute
app.use(rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiadas solicitudes. Intenta en un momento.' },
}));

// Login: stricter — 30 attempts per 15 minutes (increased for dev)
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Demasiados intentos de login. Intenta en 15 minutos.' },
});

// AI: moderate — 30 requests per minute
const aiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Límite de solicitudes de IA alcanzado. Espera un momento.' },
});

// ── Routes ───────────────────────────────────────
app.use('/api/health', healthRouter);
app.use('/api/auth', loginLimiter, authRouter);
app.use('/api/ai', aiLimiter, aiRouter);
app.use('/api/data', dataRouter);
app.use('/api/write', writeRouter);
app.use('/api/admin', adminRouter);

// ── 404 handler ──────────────────────────────────
app.use('/api/{*path}', (req, res) => {
  res.status(404).json({ message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` });
});

// ── Error handler ────────────────────────────────
app.use((err, req, res, _next) => {
  console.error('Server error:', err);
  res.status(500).json({ message: 'Error interno del servidor' });
});

// ── Start ────────────────────────────────────────
validateConfig();

app.listen(config.port, () => {
  console.log(`\n🏥 SISO OcupaSalud Pro — Backend v2.0.0`);
  console.log(`   Servidor: http://localhost:${config.port}`);
  console.log(`   Health:   http://localhost:${config.port}/api/health`);
  console.log(`   CORS:     ${config.corsOrigin}`);
  console.log(`   Entorno:  ${config.nodeEnv}\n`);
});

export default app;
