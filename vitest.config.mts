import { defineConfig } from 'vitest/config';

const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ??
  'postgres://postgres:postgres@localhost:5432/clinic_test';

export default defineConfig({
  test: {
    env: { NODE_ENV: 'test', DATABASE_URL: TEST_DATABASE_URL },
    globalSetup: ['./test/global-setup.ts'],
    setupFiles: ['./test/setup.ts'],
    // All test files share one database, so run them one at a time.
    fileParallelism: false,
  },
});
