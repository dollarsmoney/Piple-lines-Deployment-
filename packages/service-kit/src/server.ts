import type { Express } from 'express';
import type { Logger } from './logger.js';

export interface StartServerOptions {
  app: Express;
  logger: Logger;
  port: number;
  service: string;
}

/**
 * Boots the HTTP server and wires graceful shutdown, so `docker compose down`
 * lets in-flight requests finish instead of severing them.
 */
export function startServer({ app, logger, port, service }: StartServerOptions) {
  const server = app.listen(port, () => {
    logger.info({ port, service }, `${service} listening on :${port}`);
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, `${service} shutting down`);

    server.close((err) => {
      if (err) {
        logger.error({ err }, 'Error during shutdown');
        process.exit(1);
      }
      process.exit(0);
    });

    // Don't hang forever on a stuck keep-alive connection.
    setTimeout(() => {
      logger.warn('Forcing shutdown after 10s grace period');
      process.exit(1);
    }, 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  return server;
}

export function readPort(envVar: string, fallback: number): number {
  const raw = process.env[envVar];
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;

  return Number.isInteger(parsed) && parsed > 0 && parsed < 65536 ? parsed : fallback;
}

export function readNumber(envVar: string, fallback: number): number {
  const raw = process.env[envVar];
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;

  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

export function delay(ms: number): Promise<void> {
  return ms > 0 ? new Promise((resolve) => setTimeout(resolve, ms)) : Promise.resolve();
}
