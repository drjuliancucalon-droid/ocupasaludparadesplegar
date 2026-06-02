// backend/src/routes/health.js — Health check endpoint
import { Router } from 'express';
import { config } from '../config/env.js';

const router = Router();

router.get('/', (req, res) => {
  const aiProviders = Object.entries(config.ai)
    .filter(([, v]) => v?.trim())
    .map(([k]) => k);

  res.json({
    status: 'ok',
    version: '2.0.0',
    timestamp: new Date().toISOString(),
    environment: config.nodeEnv,
    supabase: !!(config.supabase.url && config.supabase.url.length > 10),
    aiProviders: aiProviders.length,
  });
});

export default router;
