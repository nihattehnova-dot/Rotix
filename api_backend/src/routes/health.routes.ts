import { Router } from 'express';
import { isSupabaseConfigured } from '../services/supabase.js';
import { env } from '../config/env.js';

export const healthRouter = Router();

healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'rotix-api',
    phase: 'mvp-complete',
    brand: 'Rotix',
    mascot: 'Roti',
    timestamp: new Date().toISOString(),
    flags: {
      billingGate: env.billingGateEnabled,
      headerAuth: env.allowHeaderAuth,
      parentReportCron: env.parentReportCron,
    },
    integrations: {
      supabase: isSupabaseConfigured(),
      gemini: Boolean(env.geminiApiKey),
      vakifpays: Boolean(env.vakifpays.merchantUser),
      whatsapp: Boolean(env.whatsappApiUrl),
      sms: Boolean(env.smsApiUrl),
    },
    websocket: '/ws',
  });
});
