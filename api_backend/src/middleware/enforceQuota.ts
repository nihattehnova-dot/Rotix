import type { NextFunction, Request, Response } from 'express';
import { AppError } from './errorHandler.js';
import {
  assertWithinQuota,
  type QuotaCheckKind,
} from '../services/quotaService.js';

/**
 * Enforce tier limits before expensive operations (AI Q&A / new session).
 * Attach after `requireUser`.
 */
export function enforceQuota(kind: QuotaCheckKind) {
  return async (req: Request, _res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
      }
      await assertWithinQuota(req.user, kind);
      next();
    } catch (err) {
      next(err);
    }
  };
}
