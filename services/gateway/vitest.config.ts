import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'gateway',
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      JWT_SECRET: 'test-secret',
      LOG_LEVEL: 'silent',
      // Effectively disable the limiter except in the test that targets it.
      RATE_LIMIT_MAX: '10000',
      AUTH_RATE_LIMIT_MAX: '10000',
    },
  },
});
