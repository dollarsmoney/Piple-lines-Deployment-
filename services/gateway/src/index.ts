import { startServer } from '@ecom/service-kit';
import { createApp } from './app.js';
import { config } from './config.js';

const { app, logger } = createApp();

logger.info(
  { upstreams: config.upstreams, corsOrigin: config.corsOrigin },
  'Gateway routing table'
);

startServer({ app, logger, port: config.port, service: config.service });
