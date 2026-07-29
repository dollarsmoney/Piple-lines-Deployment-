import express, { type Express, type RequestHandler } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { pinoHttp } from 'pino-http';
import { ok } from '@ecom/shared';
import type { HealthReport } from '@ecom/shared';
import { createLogger, type Logger } from './logger.js';
import { requestId } from './middleware.js';

export interface BaseAppOptions {
  service: string;
  /** Extra work the health endpoint should report on (e.g. upstream pings). */
  healthCheck?: () => Promise<Pick<HealthReport, 'status' | 'dependencies'>>;
  /** Set false for the gateway, which must proxy the raw body stream. */
  parseJson?: boolean;
  /** `true` reflects whatever Origin the request carries — dev/demo only. */
  corsOrigin?: string | string[] | true;
}

export interface BaseApp {
  app: Express;
  logger: Logger;
}

/**
 * Everything every service shares: security headers, CORS, request ids,
 * structured request logging, and a /health endpoint for Docker.
 */
export function createBaseApp({
  service,
  healthCheck,
  parseJson = true,
  corsOrigin,
}: BaseAppOptions): BaseApp {
  const logger = createLogger(service);
  const app = express();

  app.disable('x-powered-by');
  app.set('trust proxy', 1);

  app.use(helmet());
  app.use(
    cors({
      origin: corsOrigin ?? true,
      credentials: true,
      exposedHeaders: ['x-request-id'],
    })
  );
  app.use(requestId);
  app.use(
    pinoHttp({
      logger,
      // /health is polled every few seconds by Docker — logging it is pure noise.
      autoLogging: { ignore: (req) => req.url === '/health' },
      customProps: (req) => ({ requestId: (req as { requestId?: string }).requestId }),
    })
  );

  if (parseJson) {
    app.use(express.json({ limit: '100kb' }));
  }

  const startedAt = Date.now();

  app.get('/health', async (_req, res) => {
    const extra = healthCheck ? await healthCheck() : { status: 'ok' as const };

    res.status(extra.status === 'ok' ? 200 : 503).json(
      ok<HealthReport>({
        status: extra.status,
        service,
        uptime: Math.round((Date.now() - startedAt) / 1000),
        ...(extra.dependencies ? { dependencies: extra.dependencies } : {}),
      })
    );
  });

  return { app, logger };
}

/** Small helper so services can mount a router without importing express twice. */
export function router(): ReturnType<typeof express.Router> {
  return express.Router();
}

export type { Express, RequestHandler };
