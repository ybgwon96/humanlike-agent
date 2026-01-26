import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.e2e.test.ts'],
    exclude: ['node_modules', 'dist'],
    testTimeout: 30000,
    pool: 'forks',
    poolOptions: {
      forks: {
        singleFork: true,
      },
    },
  },
});
