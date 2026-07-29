import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'order-service',
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      LOG_LEVEL: 'silent',
      PRODUCT_SERVICE_URL: 'http://product-service.test',
    },
  },
});
