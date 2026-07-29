import { createBaseApp, errorHandler, notFoundHandler } from '@ecom/service-kit';
import { config } from './config.js';
import { productRoutes } from './routes/productRoutes.js';

export function createApp() {
  const { app, logger } = createBaseApp({ service: config.service });

  app.use('/', productRoutes);

  app.use(notFoundHandler());
  app.use(errorHandler(logger));

  return { app, logger };
}
