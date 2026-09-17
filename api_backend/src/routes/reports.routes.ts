import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { runDailyParentReports } from '../services/parentReportService.js';

export const reportsRouter = Router();

/** Manual trigger for ops / testing */
reportsRouter.post(
  '/parent/run',
  asyncHandler(async (_req, res) => {
    const result = await runDailyParentReports();
    res.json({ ok: true, ...result });
  }),
);
