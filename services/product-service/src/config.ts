import { readNumber, readPort } from '@ecom/service-kit';

export const config = {
  service: 'product-service',
  port: readPort('PORT', 4002),
  /**
   * A deliberate stall on catalogue reads so the storefront's skeleton loaders
   * are visible in the demo. Set ARTIFICIAL_LATENCY_MS=0 to turn it off.
   */
  artificialLatencyMs: readNumber('ARTIFICIAL_LATENCY_MS', 0),
};
