import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { enforceQuota } from '../middleware/enforceQuota.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  endSession,
  getSession,
  listSessions,
  startSession,
} from '../services/sessionService.js';
import { endSessionSchema, startSessionSchema } from '../validators/schemas.js';

export const sessionsRouter = Router();

// Auth + trial enforced at app mount (requireUser → requireActiveAccess)

sessionsRouter.post(
  '/',
  enforceQuota('session_start'),
  asyncHandler(async (req, res) => {
    const parsed = startSessionSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.message, 'VALIDATION_ERROR');
    }

    const session = await startSession({
      userId: req.user!.id,
      mode: parsed.data.mode,
      hadNewSchoolTopic: parsed.data.hadNewSchoolTopic,
      topicsCovered: parsed.data.topicsCovered,
      metadata: parsed.data.metadata,
    });

    res.status(201).json({ session });
  }),
);

sessionsRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const limit = Number(req.query.limit ?? 20);
    const sessions = await listSessions(req.user!.id, limit);
    res.json({ sessions });
  }),
);

sessionsRouter.get(
  '/:id',
  asyncHandler(async (req, res) => {
    const session = await getSession(req.params.id, req.user!.id);
    res.json({ session });
  }),
);

sessionsRouter.post(
  '/:id/end',
  asyncHandler(async (req, res) => {
    const parsed = endSessionSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new AppError(400, parsed.error.message, 'VALIDATION_ERROR');
    }

    const session = await endSession({
      sessionId: req.params.id,
      userId: req.user!.id,
      topicsCovered: parsed.data.topicsCovered,
      tokensUsed: parsed.data.tokensUsed,
      successRate: parsed.data.successRate,
      pointsEarned: parsed.data.pointsEarned,
    });

    res.json({ session });
  }),
);
