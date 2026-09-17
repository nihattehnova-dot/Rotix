import type { DbUser } from '../types/domain.js';

declare global {
  namespace Express {
    interface Request {
      user?: DbUser;
      requestId?: string;
    }
  }
}

export {};
