import cors from 'cors';
import express from 'express';
import helmet from 'helmet';
import { env } from './config/env.js';
import { healthRouter } from './routes/health.routes.js';
import { sessionsRouter } from './routes/sessions.routes.js';
import { mistakesRouter } from './routes/mistakes.routes.js';
import { aiRouter } from './routes/ai.routes.js';
import { quotasRouter } from './routes/quotas.routes.js';
import { learningRouter } from './routes/learning.routes.js';
import { paymentsRouter } from './routes/payments.routes.js';
import { authRouter } from './routes/auth.routes.js';
import { reportsRouter } from './routes/reports.routes.js';
import { errorHandler } from './middleware/errorHandler.js';
import { requireUser } from './middleware/requireUser.js';
import { requireActiveAccess } from './middleware/requireActiveAccess.js';

export function createApp() {
  const app = express();

  if (env.isProd) {
    app.set('trust proxy', 1);
  }

  app.use(helmet());
  app.use(
    cors({
      origin: env.isProd
        ? (env.corsOrigins.length > 0 ? env.corsOrigins : false)
        : true,
      credentials: true,
    }),
  );
  app.use(express.json({ limit: '8mb' }));
  app.use(express.urlencoded({ extended: true }));

  app.use('/health', healthRouter);
  app.use('/api/auth', authRouter);
  app.use('/api/payments', paymentsRouter);
  app.use('/api/reports', reportsRouter);

  app.use('/api/sessions', requireUser, requireActiveAccess, sessionsRouter);
  app.use('/api/mistakes', requireUser, requireActiveAccess, mistakesRouter);
  app.use('/api/ai', requireUser, requireActiveAccess, aiRouter);
  app.use('/api/quotas', quotasRouter);
  app.use('/api/learning', learningRouter);

  app.use(errorHandler);
  return app;
}
