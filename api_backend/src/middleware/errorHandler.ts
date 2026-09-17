import type { NextFunction, Request, Response } from 'express';

export class AppError extends Error {
  constructor(
    public statusCode: number,
    message: string,
    public code?: string,
  ) {
    super(message);
    this.name = 'AppError';
  }
}

function isPostgrestError(err: unknown): err is { message: string; code?: string } {
  return Boolean(
    err &&
      typeof err === 'object' &&
      'message' in err &&
      typeof (err as { message: unknown }).message === 'string',
  );
}

export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      error: err.message,
      code: err.code ?? 'APP_ERROR',
    });
    return;
  }

  console.error('[error]', err);

  if (isPostgrestError(err)) {
    res.status(502).json({
      error: err.message,
      code: 'DATABASE_ERROR',
    });
    return;
  }

  res.status(500).json({
    error: 'Internal server error',
    code: 'INTERNAL',
  });
}
