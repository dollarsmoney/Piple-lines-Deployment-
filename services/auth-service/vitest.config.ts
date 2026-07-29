import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    name: 'auth-service',
    environment: 'node',
    include: ['src/**/*.test.ts'],
    env: {
      JWT_SECRET: 'test-secret',
      LOG_LEVEL: 'silent',
    },
  },
});
