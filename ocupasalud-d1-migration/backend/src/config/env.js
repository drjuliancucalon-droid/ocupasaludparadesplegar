// backend/src/config/env.js — Environment configuration
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Ensure .env is loaded from backend/ directory regardless of cwd
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '3001', 10),
  nodeEnv: process.env.NODE_ENV || 'development',

  // Supabase
  supabase: {
    url: process.env.SUPABASE_URL || '',
    anonKey: process.env.SUPABASE_ANON_KEY || '',
    serviceKey: process.env.SUPABASE_SERVICE_KEY || '',
  },

  // JWT
  jwt: {
    secret: process.env.JWT_SECRET || 'CHANGE-THIS-IN-PRODUCTION-' + Date.now(),
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'CHANGE-REFRESH-' + Date.now(),
    expiry: process.env.JWT_EXPIRY || '30m',
    refreshExpiry: process.env.JWT_REFRESH_EXPIRY || '7d',
  },

  // AI Provider Keys (NEVER sent to frontend)
  ai: {
    gemini: process.env.GEMINI_API_KEY || '',
    groq: process.env.GROQ_API_KEY || '',
    together: process.env.TOGETHER_API_KEY || '',
    openrouter: process.env.OPENROUTER_API_KEY || '',
  },

  // CORS
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
};

// Validate required config on startup
export function validateConfig() {
  const warnings = [];
  if (!process.env.JWT_SECRET) warnings.push('JWT_SECRET not set — using random value (insecure for production)');
  if (!config.supabase.url) warnings.push('SUPABASE_URL not set — database features will not work');
  if (!config.supabase.anonKey) warnings.push('SUPABASE_ANON_KEY not set');

  if (warnings.length > 0) {
    console.warn('\n⚠️  Configuration warnings:');
    warnings.forEach((w) => console.warn(`   - ${w}`));
    console.warn('   Copy .env.example to backend/.env and fill in values.\n');
  }

  return warnings.length === 0;
}
