import { describe, expect, it } from 'vitest';
// @ts-expect-error Vite provides raw text imports to the bundled Worker test runtime.
import ciWorkflow from '../.github/workflows/ci.yml?raw';
// @ts-expect-error Vite provides raw text imports to the bundled Worker test runtime.
import playwrightConfig from '../playwright.config.ts?raw';

describe('credential-free CI browser contract', () => {
  it('runs the real embedded widget suite for pull requests and merge groups', () => {
    expect(ciWorkflow).toContain('pull_request:');
    expect(ciWorkflow).toContain('merge_group:');
    expect(ciWorkflow).toContain('name: Embedded Widget Browser Tests');
    expect(ciWorkflow).toContain('run: npx playwright install --with-deps chromium');
    expect(ciWorkflow).toContain('run: npm run test:e2e');
    expect(playwrightConfig).toContain("command: 'npm run e2e:worker'");
    expect(playwrightConfig).toContain("testIgnore: 'staging-board-widget.spec.ts'");
  });

  it('does not expose repository or deployment secrets to the local browser job', () => {
    const browserJob = ciWorkflow.slice(ciWorkflow.indexOf('\n  browser:'));

    expect(browserJob).not.toContain('secrets.');
    expect(browserJob).not.toContain('CLOUDFLARE_API_TOKEN');
    expect(browserJob).not.toContain('GITHUB_PRIVATE_KEY');
    expect(browserJob).not.toContain('BOARD_TOKEN_PRIVATE_JWK');
  });
});
