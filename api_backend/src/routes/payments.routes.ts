import { Router } from 'express';
import { z } from 'zod';
import { buildPlanCatalog, TRIAL_DAYS } from '../config/pricing.js';
import { TIER_QUOTAS } from '../config/tiers.js';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireUser } from '../middleware/requireUser.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  handleVakifpaysCallback,
  startCheckout,
} from '../services/payments/paymentService.js';
import { env } from '../config/env.js';

export const paymentsRouter = Router();

/** Public catalog — no auth */
paymentsRouter.get(
  '/catalog',
  asyncHandler(async (_req, res) => {
    res.json({
      trialDays: TRIAL_DAYS,
      channel: 'web_pos',
      provider: 'vakifpays',
      invoiceRequired: true,
      invoiceType: 'earsiv',
      annualRule:
        'Yıllık paket 12 ay hizmet verir; müşteriye yansıyan toplam = 10 × aylık fiyat.',
      quotas: TIER_QUOTAS,
      plans: buildPlanCatalog(),
      checkoutNote:
        'Ödeme yalnızca web VakıfPayS Hosted Payment Page üzerinden alınır (App Store/Play yok).',
    });
  }),
);

paymentsRouter.post(
  '/checkout',
  requireUser,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      sku: z.string().min(1),
      customerEmail: z.string().email(),
      customerPhone: z.string().min(10),
      buyerName: z.string().optional(),
      buyerTaxId: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.message, 'VALIDATION_ERROR');
    }

    const result = await startCheckout({
      user: req.user!,
      ...parsed.data,
      customerIp: req.ip,
    });

    res.status(201).json(result);
  }),
);

/**
 * VakıfPayS RETURNURL — form POST, no auth.
 * Production: restrict by IP / verify QUERYSTATUS with provider.
 */
paymentsRouter.post(
  '/vakifpays/callback',
  asyncHandler(async (req, res) => {
    const payload: Record<string, string> = {};
    for (const [k, v] of Object.entries(req.body ?? {})) {
      payload[k] = String(v);
    }

    const result = await handleVakifpaysCallback(payload);
    const ok = result.payment.status === 'paid';
    const redirect = ok
      ? `${env.publicWebUrl}/app?paid=1`
      : `${env.publicWebUrl}/app/plans?paid=0`;

    res.redirect(303, redirect);
  }),
);
