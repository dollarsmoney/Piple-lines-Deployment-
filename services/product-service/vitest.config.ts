import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'product-service',
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      LOG_LEVEL: 'silent',
      // Keep the demo latency out of the test suite.
      ARTIFICIAL_LATENCY_MS: '0',
    },
  },
});
