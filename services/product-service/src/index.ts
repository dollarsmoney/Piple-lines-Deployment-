import { startServer } from '@ecom/service-kit';
import { createApp } from './app.js';
import { config } from './config.js';
import { all } from './store/productStore.js';

const { app, logger } = createApp();

logger.info(
  { products: all().length, artificialLatencyMs: config.artificialLatencyMs },
  'Catalogue loaded'
);

startServer({ app, logger, port: config.port, service: config.service });
