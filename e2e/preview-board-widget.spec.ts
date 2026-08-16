import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { expect, test } from '@playwright/test';
import { canaryDescription, canaryTitle } from '../scripts/github-issue-canary.mjs';
import { validateBrowserCanaryConfig } from '../scripts/github-issue-canary-profiles.mjs';

const PRIVILEGED_ENVIRONMENT = [
  'BUGDROP_BOARD_PREVIEW_MONITOR_TOKEN',
  'BUGDROP_BOARD_PREVIEW_MONITOR_PRIVATE_KEY',
  'BOARD_GITHUB_APP_PRIVATE_KEY',
  'CLOUDFLARE_API_TOKEN',
  'BOARD_TOKEN_PRIVATE_JWK',
];

test('two viewers persist, poll, and create exactly one attributable Issue', async ({
  browser,
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'chromium-canary');
  assertBrowserCredentialBoundary();
  const environment = readEnvironment();
  await bypassPreviewAssetCache(page, environment);
  const config = await readVenueConfig(page, environment);
  validateBrowserCanaryConfig({
    ...environment,
    venueCommit: config.venueCommit,
    configVersion: config.configVersion,
  });

  const tokenRequests: string[] = [];
  const mutationRequests: string[] = [];
  let widgetResponse: { sha256: string; buildSha: string | null } | undefined;
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname === '/api/board-token') tokenRequests.push(request.method());
    if (
      request.method() === 'POST' &&
      url.origin === environment.workerOrigin &&
      url.pathname === `/boards/${environment.boardId}/items`
    ) {
      mutationRequests.push(request.method());
    }
  });
  page.on('response', async response => {
    if (!widgetResponse && response.url() === `${environment.workerOrigin}/board.js`) {
      widgetResponse = {
        sha256: createHash('sha256')
          .update(await response.body())
          .digest('hex'),
        buildSha: response.headers()['x-bugdrop-build-sha'] ?? null,
      };
    }
  });

  const graceContext = await browser.newContext();
  const grace = await graceContext.newPage();
  await bypassPreviewAssetCache(grace, environment);
  grace.on('request', request => {
    if (new URL(request.url()).pathname === '/api/board-token') {
      tokenRequests.push(request.method());
    }
  });
  try {
    await page.goto('/?mode=ci&viewer=ada');
    await grace.goto('/?mode=ci&viewer=grace');
    await expect(page.getByRole('heading', { name: 'Feedback' })).toBeVisible();
    await expect(grace.getByRole('heading', { name: 'Feedback' })).toBeVisible();

    const description = canaryDescription({
      marker: environment.marker,
      workerSha: environment.expectedWorkerSha,
      venueCommit: config.venueCommit,
      configVersion: config.configVersion,
    });
    const creation = page.waitForResponse(response => {
      const url = new URL(response.url());
      return (
        response.request().method() === 'POST' &&
        url.origin === environment.workerOrigin &&
        url.pathname === `/boards/${environment.boardId}/items`
      );
    });
    await page.getByLabel('Idea title').fill(canaryTitle(environment.marker));
    await page.getByLabel('Context').fill(description);
    await page.getByRole('button', { name: 'Submit' }).click();
    const creationResponse = await creation;
    expect(creationResponse.status()).toBe(201);
    const payload = (await creationResponse.json()) as { item: PreviewItem };
    expect(payload.item.title).toBe(canaryTitle(environment.marker));
    expect(payload.item.description).toBe(description);
    expect(mutationRequests).toEqual(['POST']);

    await expect(page.getByText(canaryTitle(environment.marker))).toBeVisible();
    await expect(grace.getByText(canaryTitle(environment.marker))).toBeVisible({ timeout: 15_000 });
    const vote = page.getByRole('button', {
      name: `Upvote ${canaryTitle(environment.marker)}. 0 upvotes.`,
    });
    await vote.click();
    await expect(
      grace.getByRole('button', {
        name: `Upvote ${canaryTitle(environment.marker)}. 1 upvote.`,
      })
    ).toBeVisible({ timeout: 15_000 });

    await page.reload();
    await grace.reload();
    await expect(page.getByText(canaryTitle(environment.marker))).toBeVisible();
    await expect(grace.getByText(canaryTitle(environment.marker))).toBeVisible();
    await expect(
      page.getByRole('button', {
        name: `Remove upvote from ${canaryTitle(environment.marker)}. 1 upvote.`,
      })
    ).toBeVisible();
    await expect(
      grace.getByRole('button', {
        name: `Upvote ${canaryTitle(environment.marker)}. 1 upvote.`,
      })
    ).toBeVisible();
    expect(tokenRequests.length).toBeGreaterThanOrEqual(2);
    expect(new Set(tokenRequests)).toEqual(new Set(['POST']));
    expect(widgetResponse).toEqual({
      sha256: environment.expectedWidgetSha256,
      buildSha: environment.expectedWorkerSha,
    });

    await writeRedactedResult(environment.resultFile, {
      schema: 'bugdrop-board-preview-result/v1',
      marker: environment.marker,
      itemId: payload.item.id,
      issueNumber: payload.item.githubIssueNumber,
      issueUrl: payload.item.githubIssueUrl,
      workerSha: environment.expectedWorkerSha,
      widgetSha256: environment.expectedWidgetSha256,
      venueCommit: config.venueCommit,
      configVersion: config.configVersion,
    });
  } finally {
    await graceContext.close();
  }
});

test('mobile venue loads the same immutable CI configuration without mutation', async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== 'mobile-readonly');
  assertBrowserCredentialBoundary();
  const environment = readEnvironment();
  await bypassPreviewAssetCache(page, environment);
  const config = await readVenueConfig(page, environment);
  validateBrowserCanaryConfig({
    ...environment,
    venueCommit: config.venueCommit,
    configVersion: config.configVersion,
  });
  let creates = 0;
  page.on('request', request => {
    if (request.method() === 'POST' && new URL(request.url()).pathname.endsWith('/items'))
      creates++;
  });
  await page.goto('/?mode=ci&viewer=grace');
  await expect(page.getByRole('heading', { name: 'Feedback' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Synthetic identity:')).toBeVisible();
  expect(creates).toBe(0);
});

interface PreviewItem {
  id: string;
  title: string;
  description: string;
  githubIssueNumber: number;
  githubIssueUrl: string;
}

interface VenueConfig {
  mode: string;
  workerUrl: string;
  boardId: string;
  venueCommit: string;
  configVersion: string;
}

async function readVenueConfig(page: import('@playwright/test').Page, environment: Environment) {
  const response = await page.request.get(`${environment.venueOrigin}/api/config?mode=ci`, {
    headers: { Accept: 'application/json' },
  });
  expect(response.status()).toBe(200);
  const config = (await response.json()) as VenueConfig;
  expect(config).toMatchObject({
    mode: 'ci',
    workerUrl: environment.workerOrigin,
    boardId: environment.boardId,
    venueCommit: environment.venueCommit,
    configVersion: environment.configVersion,
  });
  return config;
}

async function bypassPreviewAssetCache(
  page: import('@playwright/test').Page,
  environment: Environment
) {
  await page.route(`${environment.workerOrigin}/board.js`, async route => {
    await route.continue({
      headers: {
        ...route.request().headers(),
        'Cache-Control': 'no-cache',
      },
    });
  });
}

interface Environment {
  repo: string;
  repositoryId: string;
  venueOrigin: string;
  workerOrigin: string;
  boardId: string;
  marker: string;
  expectedWorkerSha: string;
  expectedWidgetSha256: string;
  venueCommit: string;
  configVersion: string;
  resultFile: string;
}

function readEnvironment(): Environment {
  return {
    repo: required('BUGDROP_BOARD_PREVIEW_REPOSITORY'),
    repositoryId: required('BUGDROP_BOARD_PREVIEW_REPOSITORY_ID'),
    venueOrigin: required('BUGDROP_BOARD_VENUE_PREVIEW_URL'),
    workerOrigin: required('BUGDROP_BOARD_PREVIEW_WORKER_URL'),
    boardId: required('BUGDROP_BOARD_PREVIEW_CI_BOARD_ID'),
    marker: required('BUGDROP_BOARD_CANARY_MARKER'),
    expectedWorkerSha: required('EXPECTED_WORKER_SHA'),
    expectedWidgetSha256: required('EXPECTED_WIDGET_SHA256'),
    venueCommit: required('BUGDROP_BOARD_VENUE_COMMIT'),
    configVersion: required('BUGDROP_BOARD_VENUE_CONFIG_VERSION'),
    resultFile: required('BUGDROP_BOARD_CANARY_RESULT_FILE'),
  };
}

function assertBrowserCredentialBoundary() {
  for (const name of PRIVILEGED_ENVIRONMENT) {
    if (process.env[name]) throw new Error(`${name} must not be available to Playwright`);
  }
}

async function writeRedactedResult(path: string, value: object) {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
}

function required(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`${name} is required`);
  return value;
}
