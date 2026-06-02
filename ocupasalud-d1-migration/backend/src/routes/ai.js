// backend/src/routes/ai.js — Secure AI proxy
// API keys NEVER leave this server. Frontend sends prompts, server calls providers.
import { Router } from 'express';
import { z } from 'zod';
import { config } from '../config/env.js';
import { requireAuth } from '../middleware/auth.js';

const router = Router();

// All AI routes require authentication
router.use(requireAuth);

// ── Validation ───────────────────────────────────
const analyzeSchema = z.object({
  prompt: z.string().min(1).max(50000),
  systemPrompt: z.string().max(10000).optional(),
  preferredProvider: z.enum(['gemini', 'groq', 'together', 'openrouter']).optional(),
});

// ── Provider configs ─────────────────────────────
const PROVIDERS = {
  gemini: {
    models: ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-2.0-flash-lite'],
    call: async (prompt, systemPrompt, apiKey) => {
      for (const model of PROVIDERS.gemini.models) {
        try {
          const res = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
            {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                systemInstruction: { parts: [{ text: systemPrompt }] },
                contents: [{ role: 'user', parts: [{ text: prompt }] }],
                generationConfig: { maxOutputTokens: 4096, temperature: 0.3 },
              }),
              signal: AbortSignal.timeout(40000),
            }
          );
          if (!res.ok) continue;
          const data = await res.json();
          const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (text?.trim().length > 5) return text.trim();
        } catch { continue; }
      }
      throw new Error('Gemini: todos los modelos fallaron');
    },
  },
  groq: {
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'gemma2-9b-it'],
    call: async (prompt, systemPrompt, apiKey) => {
      for (const model of PROVIDERS.groq.models) {
        try {
          const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
              model, max_tokens: 4096, temperature: 0.3,
              messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
            }),
            signal: AbortSignal.timeout(40000),
          });
          if (!res.ok) continue;
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content;
          if (text?.trim().length > 5) return text.trim();
        } catch { continue; }
      }
      throw new Error('Groq: todos los modelos fallaron');
    },
  },
  together: {
    models: ['meta-llama/Llama-3.3-70B-Instruct-Turbo', 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo'],
    call: async (prompt, systemPrompt, apiKey) => {
      for (const model of PROVIDERS.together.models) {
        try {
          const res = await fetch('https://api.together.ai/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
            body: JSON.stringify({
              model, max_tokens: 4096, temperature: 0.3,
              messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
            }),
            signal: AbortSignal.timeout(40000),
          });
          if (!res.ok) continue;
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content;
          if (text?.trim().length > 5) return text.trim();
        } catch { continue; }
      }
      throw new Error('Together: todos los modelos fallaron');
    },
  },
  openrouter: {
    models: ['openrouter/auto', 'meta-llama/llama-3.3-70b-instruct:free', 'deepseek/deepseek-chat-v3-0324:free'],
    call: async (prompt, systemPrompt, apiKey) => {
      for (const model of PROVIDERS.openrouter.models) {
        try {
          const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${apiKey}`,
              'X-Title': 'SISO OcupaSalud Pro',
            },
            body: JSON.stringify({
              model, max_tokens: 4096, temperature: 0.3,
              messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }],
            }),
            signal: AbortSignal.timeout(40000),
          });
          if (!res.ok) continue;
          const data = await res.json();
          const text = data.choices?.[0]?.message?.content;
          if (text?.trim().length > 5) return text.trim();
        } catch { continue; }
      }
      throw new Error('OpenRouter: todos los modelos fallaron');
    },
  },
};

const DEFAULT_SYSTEM_PROMPT =
  'Eres un médico ocupacional colombiano experto. Respondes siempre en español. ' +
  'Conoces la normatividad colombiana (Res.1843/2025, Decreto 1072/2015, Guías GATISO, GTC-45). ' +
  'Responde en formato estructurado con viñetas cuando sea apropiado.';

// ── POST /api/ai/analyze ─────────────────────────
router.post('/analyze', async (req, res) => {
  try {
    const { prompt, systemPrompt, preferredProvider } = analyzeSchema.parse(req.body);
    const sys = systemPrompt || DEFAULT_SYSTEM_PROMPT;

    // Build provider order: preferred first, then others
    const order = [preferredProvider, 'gemini', 'groq', 'together', 'openrouter']
      .filter((p, i, arr) => p && arr.indexOf(p) === i);

    let lastError = null;
    for (const providerKey of order) {
      const apiKey = config.ai[providerKey];
      if (!apiKey?.trim()) continue;

      const provider = PROVIDERS[providerKey];
      if (!provider) continue;

      try {
        const result = await provider.call(prompt, sys, apiKey.trim());
        return res.json({ result, provider: providerKey });
      } catch (e) {
        lastError = e;
        continue;
      }
    }

    res.status(503).json({
      message: 'No hay proveedores de IA disponibles. Configura al menos una API key en el servidor.',
      error: lastError?.message,
    });
  } catch (err) {
    if (err instanceof z.ZodError) {
      return res.status(400).json({ message: err.errors[0].message });
    }
    console.error('AI error:', err.message);
    res.status(500).json({ message: 'Error al procesar la solicitud de IA' });
  }
});

// ── GET /api/ai/status ───────────────────────────
// Returns which providers are configured (without revealing keys)
router.get('/status', (req, res) => {
  const providers = {};
  for (const [key, value] of Object.entries(config.ai)) {
    providers[key] = { configured: !!value?.trim(), name: PROVIDERS[key] ? key : 'unknown' };
  }
  res.json({ providers });
});

export default router;
