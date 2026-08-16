import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'preview-board-widget.spec.ts',
  timeout: 90_000,
  workers: 1,
  retries: 0,
  outputDir: process.env.RUNNER_TEMP
    ? `${process.env.RUNNER_TEMP}/bugdrop-board-preview-playwright`
    : 'test-results/preview-playwright',
  reporter: [['line']],
  use: {
    baseURL:
      process.env.BUGDROP_BOARD_VENUE_PREVIEW_URL ??
      'https://bugdrop-board-widget-test-git-preview-jermwatts-projects.vercel.app',
    screenshot: 'off',
    trace: 'off',
    video: 'off',
  },
  projects: [
    { name: 'chromium-canary', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-readonly', use: { ...devices['Pixel 7'] } },
  ],
});
