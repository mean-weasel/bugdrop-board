import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'staging-board-widget.spec.ts',
  timeout: 60_000,
  workers: 1,
  retries: 0,
  use: {
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
});
