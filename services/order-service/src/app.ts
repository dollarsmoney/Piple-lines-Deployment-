import { createBaseApp, errorHandler, notFoundHandler } from '@ecom/service-kit';
import { config } from './config.js';
import { cartRoutes } from './routes/cartRoutes.js';
import { orderRoutes } from './routes/orderRoutes.js';

export function createApp() {
  const { app, logger } = createBaseApp({ service: config.service });

  app.use('/cart', cartRoutes);
  app.use('/orders', orderRoutes);

  app.use(notFoundHandler());
  app.use(errorHandler(logger));

  return { app, logger };
}
