import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { AppError } from './errorHandler.js';
import { getUserByAuthId } from '../services/authService.js';
import { getUserById } from '../services/userService.js';
import { verifyAccessToken } from '../services/authService.js';

/**
 * Auth: Supabase JWT (Bearer) preferred; X-User-Id fallback for local dev.
 */
export async function requireUser(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    const authHeader = req.header('authorization');
    const bearer = authHeader?.startsWith('Bearer ')
      ? authHeader.slice(7).trim()
      : null;

    if (bearer) {
      const authUser = await verifyAccessToken(bearer);
      const profile = await getUserByAuthId(authUser.id);
      if (!profile) {
        throw new AppError(
          404,
          'Profile not found — call POST /api/auth/bootstrap',
          'PROFILE_NOT_FOUND',
        );
      }
      req.user = profile;
      next();
      return;
    }

    if (env.allowHeaderAuth) {
      const userId = req.header('x-user-id')?.trim();
      if (userId) {
        const user = await getUserById(userId);
        if (!user) {
          throw new AppError(404, 'User not found', 'USER_NOT_FOUND');
        }
        req.user = user;
        next();
        return;
      }
    }

    throw new AppError(401, 'Missing Authorization Bearer token', 'UNAUTHORIZED');
  } catch (err) {
    next(err);
  }
}
