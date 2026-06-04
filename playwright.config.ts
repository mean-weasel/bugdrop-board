import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testIgnore: 'staging-board-widget.spec.ts',
  timeout: 60_000,
  workers: 1,
  retries: process.env.CI ? 2 : 0,
  use: {
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run e2e:worker',
    url: 'http://127.0.0.1:8788/health',
    timeout: 120_000,
    reuseExistingServer: !process.env.CI,
  },
});
