import { createBaseApp, errorHandler, notFoundHandler } from '@ecom/service-kit';
import { config } from './config.js';
import { authRoutes } from './routes/authRoutes.js';

export function createApp() {
  const { app, logger } = createBaseApp({ service: config.service });

  app.use('/auth', authRoutes);

  app.use(notFoundHandler());
  app.use(errorHandler(logger));

  return { app, logger };
}
