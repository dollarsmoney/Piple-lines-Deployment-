import { createBaseApp, errorHandler, notFoundHandler } from '@ecom/service-kit';
import { config } from './config.js';
import { checkUpstreams } from './health.js';
import { authenticate, stripIdentityHeaders } from './middleware/identity.js';
import { authLimiter, globalLimiter } from './middleware/rateLimit.js';
import { proxyRoute } from './proxy.js';

export function createApp() {
  const { app, logger } = createBaseApp({
    service: config.service,
    healthCheck: checkUpstreams,
    // The proxy forwards the raw body stream, so nothing may consume it first.
    parseJson: false,
    corsOrigin: config.corsOrigin.includes('*') ? true : config.corsOrigin,
  });

  // Must run before anything else — see the comment in identity.ts.
  app.use(stripIdentityHeaders);
  app.use(globalLimiter);

  // Auth gates, applied per public prefix before the corresponding proxy.
  // Browsing the catalogue needs no account; cart and orders do.
  app.use('/api/auth', authLimiter, authenticate(false));
  app.use('/api/cart', authenticate(true));
  app.use('/api/orders', authenticate(true));

  const routes = [
    { prefix: '/api/products', upstreamPrefix: '/products', target: config.upstreams.product },
    { prefix: '/api/categories', upstreamPrefix: '/categories', target: config.upstreams.product },
    // /auth/verify exists on the service but is deliberately not reachable here.
    { prefix: '/api/auth', upstreamPrefix: '/auth', target: config.upstreams.auth },
    { prefix: '/api/cart', upstreamPrefix: '/cart', target: config.upstreams.order },
    { prefix: '/api/orders', upstreamPrefix: '/orders', target: config.upstreams.order },
  ];

  for (const route of routes) {
    app.use(proxyRoute({ ...route, logger }));
  }

  app.use(notFoundHandler());
  app.use(errorHandler(logger));

  return { app, logger };
}
