import { createServer } from 'node:http';
import 'dotenv/config';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { attachWebSocket } from './ws/attachWebSocket.js';
import { runDailyParentReports } from './services/parentReportService.js';

const app = createApp();
const server = createServer(app);

attachWebSocket(server);

server.listen(env.port, () => {
  console.log(`[api] listening on :${env.port} (${env.nodeEnv})`);
  console.log(
    `[api] billingGate=${env.billingGateEnabled} headerAuth=${env.allowHeaderAuth}`,
  );
  if (env.isProd && env.allowHeaderAuth) {
    console.warn(
      '[api] WARN: ALLOW_HEADER_AUTH=true in production — X-User-Id spoof risk',
    );
  }
  if (env.isProd && env.corsOrigins.length === 0) {
    console.warn(
      '[api] WARN: CORS_ORIGINS / PUBLIC_WEB_URL empty — browser clients blocked',
    );
  }

  if (env.parentReportCron) {
    console.log(
      `[cron] parent reports every ${env.parentReportIntervalMs}ms`,
    );
    setInterval(() => {
      void runDailyParentReports()
        .then((r) => console.log('[cron] parent reports', r))
        .catch((e) => console.error('[cron] parent reports failed', e));
    }, env.parentReportIntervalMs);
  }
});
