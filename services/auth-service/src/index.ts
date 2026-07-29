import { startServer } from '@ecom/service-kit';
import { createApp } from './app.js';
import { config } from './config.js';
import { seedDemoUsers } from './store/userStore.js';

async function main() {
  const { app, logger } = createApp();

  await seedDemoUsers();
  logger.info('Seeded demo accounts (demo@shop.dev / admin@shop.dev)');

  startServer({ app, logger, port: config.port, service: config.service });
}

main().catch((err) => {
  console.error('auth-service failed to start', err);
  process.exit(1);
});
