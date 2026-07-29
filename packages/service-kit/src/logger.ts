import { pino } from 'pino';

export function createLogger(service: string) {
  return pino({
    name: service,
    level: process.env.LOG_LEVEL ?? 'info',
    // Never let a password or bearer token reach the log stream.
    redact: {
      paths: [
        'req.headers.authorization',
        'req.headers.cookie',
        'req.body.password',
        'res.headers["set-cookie"]',
      ],
      remove: true,
    },
  });
}

export type Logger = ReturnType<typeof createLogger>;
