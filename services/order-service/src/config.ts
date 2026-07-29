import { readNumber, readPort } from '@ecom/service-kit';

export const config = {
  service: 'order-service',
  port: readPort('PORT', 4003),
  productServiceUrl: process.env.PRODUCT_SERVICE_URL ?? 'http://localhost:4002',
  /** Upstream call budget — a slow catalogue must not hang a checkout forever. */
  upstreamTimeoutMs: readNumber('UPSTREAM_TIMEOUT_MS', 5000),
};
