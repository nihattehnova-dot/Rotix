import type { NextFunction, Request, Response } from 'express';
import { env } from '../config/env.js';
import { assertProductAccess } from '../services/trialService.js';
import { AppError } from './errorHandler.js';

/** After requireUser — blocks expired trials when billing gate is on. */
export function requireActiveAccess(
  req: Request,
  _res: Response,
  next: NextFunction,
) {
  try {
    if (!req.user) {
      throw new AppError(401, 'Unauthorized', 'UNAUTHORIZED');
    }
    if (!env.billingGateEnabled) {
      next();
      return;
    }
    assertProductAccess(req.user);
    next();
  } catch (err) {
    next(err);
  }
}
