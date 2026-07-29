import { readNumber, readPort } from '@ecom/service-kit';

export const config = {
  service: 'api-gateway',
  port: readPort('PORT', 8080),
  jwtSecret: process.env.JWT_SECRET ?? 'dev-only-secret-change-me',

  upstreams: {
    auth: process.env.AUTH_SERVICE_URL ?? 'http://localhost:4001',
    product: process.env.PRODUCT_SERVICE_URL ?? 'http://localhost:4002',
    order: process.env.ORDER_SERVICE_URL ?? 'http://localhost:4003',
  },

  /** Comma-separated allowlist; `*` disables the check entirely. */
  corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean),

  rateLimit: {
    windowMs: readNumber('RATE_LIMIT_WINDOW_MS', 60_000),
    max: readNumber('RATE_LIMIT_MAX', 300),
    /** Login/register are brute-forceable, so they get a tighter budget. */
    authMax: readNumber('AUTH_RATE_LIMIT_MAX', 20),
  },

  healthTimeoutMs: readNumber('HEALTH_TIMEOUT_MS', 2000),
};
