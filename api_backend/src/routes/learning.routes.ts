import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireUser } from '../middleware/requireUser.js';
import { requireActiveAccess } from '../middleware/requireActiveAccess.js';
import { enforceQuota } from '../middleware/enforceQuota.js';
import { AppError } from '../middleware/errorHandler.js';
import {
  generateDailyPlan,
  getCurriculumCached,
  getMicroQuiz,
  getParentDashboard,
  getTodayPlan,
  listWeakTopics,
  recordCheckin,
  submitMicroQuiz,
  upsertMastery,
} from '../services/learningService.js';
import { processPhotoQuestion } from '../services/photoQuestionService.js';
import { hasProductAccess } from '../services/trialService.js';
import { getSupabaseAdmin } from '../services/supabase.js';

export const learningRouter = Router();
learningRouter.use(requireUser);

learningRouter.get(
  '/access',
  asyncHandler(async (req, res) => {
    const u = req.user!;
    res.json({
      access: {
        allowed: hasProductAccess(u),
        status: u.subscription_status ?? 'trialing',
        trialEndsAt: u.trial_ends_at ?? null,
        tier: u.tier,
        examTrack: u.exam_track ?? 'school',
        targetExamDate: u.target_exam_date ?? null,
      },
    });
  }),
);

learningRouter.get(
  '/plan/today',
  requireActiveAccess,
  asyncHandler(async (req, res) => {
    const plan = await getTodayPlan(req.user!.id);
    res.json({ plan });
  }),
);

learningRouter.post(
  '/plan/generate',
  requireActiveAccess,
  asyncHandler(async (req, res) => {
    const plan = await generateDailyPlan(req.user!.id);
    res.json({ plan });
  }),
);

learningRouter.get(
  '/mastery/weak',
  requireActiveAccess,
  asyncHandler(async (req, res) => {
    const topics = await listWeakTopics(req.user!.id);
    res.json({ topics });
  }),
);

learningRouter.post(
  '/mastery/event',
  requireActiveAccess,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      subject: z.string().min(1),
      topic: z.string().min(1),
      correct: z.boolean(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.message, 'VALIDATION_ERROR');
    }
    await upsertMastery({ userId: req.user!.id, ...parsed.data });
    res.json({ ok: true });
  }),
);

learningRouter.post(
  '/checkin',
  requireActiveAccess,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      hadNewSchoolTopic: z.boolean().nullable().optional(),
      mood: z.number().int().min(1).max(5).optional(),
      energy: z.number().int().min(1).max(5).optional(),
      note: z.string().max(500).optional(),
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new AppError(400, parsed.error.message, 'VALIDATION_ERROR');
    }
    const checkin = await recordCheckin({
      userId: req.user!.id,
      ...parsed.data,
    });
    res.status(201).json({ checkin });
  }),
);

learningRouter.get(
  '/curriculum',
  requireActiveAccess,
  asyncHandler(async (req, res) => {
    const examRaw = (req.query.exam as string | undefined)?.trim();
    const gradeRaw = req.query.grade ?? req.user!.grade_level;
    const exam = examRaw?.toUpperCase();
    const gradeNum = Number(gradeRaw);

    if (!exam && (!gradeNum || Number.isNaN(gradeNum))) {
      throw new AppError(
        400,
        'grade or exam required (e.g. grade=7 or exam=TYT)',
        'GRADE_REQUIRED',
      );
    }

    const items = await getCurriculumCached({
      grade: exam ? undefined : gradeNum,
      exam,
      subject: req.query.subject as string | undefined,
      topic: req.query.topic as string | undefined,
      id: req.query.id as string | undefined,
    });
    res.json({
      items,
      costPath: 'json_catalog',
      meta: {
        grade: exam ?? gradeNum,
        count: items.length,
      },
    });
  }),
);

learningRouter.get(
  '/curriculum/subjects',
  requireActiveAccess,
  asyncHandler(async (req, res) => {
    const exam = (req.query.exam as string | undefined)?.trim()?.toUpperCase();
    const gradeNum = Number(req.query.grade ?? req.user!.grade_level ?? 0);
    if (!exam && !gradeNum) {
      throw new AppError(400, 'grade or exam required', 'GRADE_REQUIRED');
    }
    const { listCurriculumSubjects } = await import(
      '../services/curriculumCatalog.js'
    );
    const subjects = listCurriculumSubjects(exam ?? gradeNum);
    res.json({ subjects });
  }),
);

learningRouter.get(
  '/micro-quiz/:curriculumId',
  requireActiveAccess,
  asyncHandler(async (req, res) => {
    const quiz = await getMicroQuiz(req.params.curriculumId);
    res.json({ quiz });
  }),
);

learningRouter.post(
  '/micro-quiz/:quizId/submit',
  requireActiveAccess,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      answers: z.array(z.number().int()),
      subject: z.string().min(1),
      topic: z.string().min(1),
      sessionId: z.string().uuid().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.message, 'VALIDATION_ERROR');
    }
    const result = await submitMicroQuiz({
      userId: req.user!.id,
      quizId: req.params.quizId,
      ...parsed.data,
    });
    res.json(result);
  }),
);

learningRouter.post(
  '/photo-question',
  requireActiveAccess,
  enforceQuota('question'),
  asyncHandler(async (req, res) => {
    const schema = z.object({
      imageBase64: z.string().min(20),
      mimeType: z.string().optional(),
      subject: z.string().optional(),
      sessionId: z.string().uuid().optional(),
      selectedQuestionIndex: z.number().int().min(0).max(49).optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.message, 'VALIDATION_ERROR');
    }
    if (!req.user!.grade_level) {
      throw new AppError(400, 'grade_level required', 'GRADE_REQUIRED');
    }
    const result = await processPhotoQuestion({
      userId: req.user!.id,
      gradeLevel: req.user!.grade_level,
      ...parsed.data,
    });
    res.status(result.needsClarification ? 200 : 201).json(result);
  }),
);

learningRouter.get(
  '/parent/dashboard',
  asyncHandler(async (req, res) => {
    if (req.user!.role !== 'parent') {
      throw new AppError(403, 'Parent role required', 'PARENT_ONLY');
    }
    const dashboard = await getParentDashboard(req.user!.id);
    res.json(dashboard);
  }),
);

learningRouter.post(
  '/goals',
  requireActiveAccess,
  asyncHandler(async (req, res) => {
    const schema = z.object({
      title: z.string().min(1),
      examTrack: z
        .enum(['none', 'school', 'lgs', 'tyt', 'ayt', 'yks'])
        .optional(),
      targetScore: z.number().optional(),
      targetDate: z.string().optional(),
      notes: z.string().optional(),
    });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      throw new AppError(400, parsed.error.message, 'VALIDATION_ERROR');
    }
    const { data, error } = await getSupabaseAdmin()
      .from('learning_goals')
      .insert({
        user_id: req.user!.id,
        title: parsed.data.title,
        exam_track: parsed.data.examTrack ?? 'school',
        target_score: parsed.data.targetScore ?? null,
        target_date: parsed.data.targetDate ?? null,
        notes: parsed.data.notes ?? null,
      })
      .select('*')
      .single();
    if (error) throw error;
    res.status(201).json({ goal: data });
  }),
);
