import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireUser } from '../middleware/requireUser.js';
import { getQuotaSnapshot } from '../services/quotaService.js';
import { TIER_QUOTAS } from '../config/tiers.js';

export const quotasRouter = Router();

quotasRouter.use(requireUser);

quotasRouter.get(
  '/me',
  asyncHandler(async (req, res) => {
    const snapshot = await getQuotaSnapshot(req.user!);
    res.json({
      quota: snapshot,
      catalog: TIER_QUOTAS,
    });
  }),
);
