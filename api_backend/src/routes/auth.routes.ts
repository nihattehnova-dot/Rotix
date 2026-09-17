import { Router } from 'express';
import { z } from 'zod';
import { asyncHandler } from '../middleware/asyncHandler.js';
import { requireUser } from '../middleware/requireUser.js';
import { AppError } from '../middleware/errorHandler.js';
import { bootstrapProfile, verifyAccessToken } from '../services/authService.js';

export const authRouter = Router();

/** After Supabase sign-up/sign-in on client — create public.users row */
authRouter.post(
  '/bootstrap',
  asyncHandler(async (req, res) => {
    const token = req.header('authorization')?.replace(/^Bearer\s+/i, '').trim();
    if (!token) {
      throw new AppError(401, 'Bearer token required', 'UNAUTHORIZED');
    }

    const authUser = await verifyAccessToken(token);
    const schema = z.object({
      fullName: z.string().optional(),
      phone: z.string().optional(),
      gradeLevel: z.number().int().min(1).max(12),
      role: z.enum(['student', 'parent']).optional(),
      examTrack: z
        .enum(['none', 'school', 'lgs', 'tyt', 'ayt', 'yks'])
        .optional(),
    });
    const parsed = schema.safeParse(req.body ?? {});
    if (!parsed.success) {
      throw new AppError(400, parsed.error.message, 'VALIDATION_ERROR');
    }

    const user = await bootstrapProfile({
      authId: authUser.id,
      fullName: parsed.data.fullName,
      phone: parsed.data.phone,
      gradeLevel: parsed.data.gradeLevel,
      role: parsed.data.role,
      examTrack: parsed.data.examTrack,
    });

    res.status(201).json({ user });
  }),
);

authRouter.get(
  '/me',
  requireUser,
  asyncHandler(async (req, res) => {
    res.json({ user: req.user });
  }),
);
