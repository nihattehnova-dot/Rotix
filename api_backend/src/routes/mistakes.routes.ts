import { Router } from 'express';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  getDueMistakes,
  listMistakes,
  logMistake,
  resolveMistake,
  reviewMistake,
} from '../services/mistakeService.js';
import { REPETITION_INTERVALS_DAYS } from '../services/spacedRepetition.js';
import {
  createMistakeSchema,
  reviewMistakeSchema,
} from '../validators/schemas.js';

export const mistakesRouter = Router();

// Auth + trial at app mount

mistakesRouter.get(
  '/meta/intervals',
  asyncHandler(async (_req, res) => {
    res.json({ intervalsDays: REPETITION_INTERVALS_DAYS });
  }),
);

mistakesRouter.get(
  '/due',
  asyncHandler(async (req, res) => {
    const limit = Number(req.query.limit ?? 20);
    const grouped = req.query.grouped !== 'false';
    if (grouped) {
      const { getDueMistakesGrouped } = await import(
        '../services/mistakeService.js'
      );
      const { groups, mistakes } = await getDueMistakesGrouped(
        req.user!.id,
        limit,
      );
      res.json({
        mistakes,
        groups: groups.map((g) => ({
          subject: g.subject,
          topic: g.topic,
          count: g.count,
          maxStruggle: g.maxStruggle,
          curriculumId: g.curriculumId,
          mistakeId: g.representative.id,
        })),
        modeHint: 'spaced_repetition',
        groupedByTopic: true,
      });
      return;
    }
    const mistakes = await getDueMistakes(req.user!.id, limit);
    res.json({ mistakes, modeHint: 'spaced_repetition', groupedByTopic: false });
  }),
);

mistakesRouter.get(
  '/gaps',
  asyncHandler(async (req, res) => {
    const { listGapTopics } = await import('../services/mistakeService.js');
    const gaps = await listGapTopics(
      req.user!.id,
      Number(req.query.limit ?? 15),
    );
    res.json({ gaps });
  }),
);

mistakesRouter.get(
  '/',
  asyncHandler(async (req, res) => {
    const resolved =
      req.query.resolved === 'true'
        ? true
        : req.query.resolved === 'false'
          ? false
          : undefined;
    const mistakes = await listMistakes(req.user!.id, {
      resolved,
      limit: Number(req.query.limit ?? 50),
    });
    res.json({ mistakes });
  }),
);

mistakesRouter.post(
  '/',
  asyncHandler(async (req, res) => {
    const parsed = createMistakeSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.message, 'VALIDATION_ERROR');
    }

    const mistake = await logMistake({
      userId: req.user!.id,
      questionData: parsed.data.questionData,
      sessionId: parsed.data.sessionId,
      curriculumId: parsed.data.curriculumId,
      subject: parsed.data.subject,
      topic: parsed.data.topic,
      struggleScore: parsed.data.struggleScore,
    });

    res.status(201).json({ mistake });
  }),
);

mistakesRouter.post(
  '/:id/review',
  asyncHandler(async (req, res) => {
    const parsed = reviewMistakeSchema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.message, 'VALIDATION_ERROR');
    }

    const mistake = await reviewMistake({
      mistakeId: req.params.id,
      userId: req.user!.id,
      mastered: parsed.data.mastered,
      markResolved: parsed.data.markResolved,
    });

    res.json({ mistake });
  }),
);

mistakesRouter.post(
  '/:id/resolve',
  asyncHandler(async (req, res) => {
    const mistake = await resolveMistake(req.params.id, req.user!.id);
    res.json({ mistake });
  }),
);
