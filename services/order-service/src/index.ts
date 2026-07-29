import { startServer } from '@ecom/service-kit';
import { createApp } from './app.js';
import { config } from './config.js';

const { app, logger } = createApp();

logger.info({ productServiceUrl: config.productServiceUrl }, 'Upstream catalogue configured');

startServer({ app, logger, port: config.port, service: config.service });
