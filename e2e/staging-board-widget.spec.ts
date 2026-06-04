import { expect, test } from '@playwright/test';
import { startHostApp } from './fixtures/host-app';

const BOARD_ID = 'board_mean_weasel_bugdrop_board_dogfood';
const WORKER_ORIGIN = 'https://bugdrop-board-staging.neonwatty.workers.dev';

test('staging board creates a GitHub-backed item, upvotes, and syncs through polling', async ({
  browser,
  page,
}) => {
  const host = await startHostApp(BOARD_ID);
  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();
  const title = `Staging dogfood item ${Date.now()}`;

  try {
    await page.goto(`${host.url}/viewer-a`);
    await secondPage.goto(`${host.url}/viewer-b`);

    await expect(page.getByRole('heading', { name: 'Dummy App' })).toBeVisible();
    await expect(secondPage.getByRole('heading', { name: 'Dummy App' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Feedback' })).toBeVisible();

    await page.getByLabel('Idea title').fill(title);
    await page.getByLabel('Context').fill('Staging dogfood proof from the signed-token host app.');
    await page.getByRole('button', { name: 'Submit' }).click();

    const item = page.locator('article').filter({
      has: page.getByRole('heading', { name: title }),
    });
    const syncedItem = secondPage.locator('article').filter({
      has: secondPage.getByRole('heading', { name: title }),
    });

    await expect(item).toBeVisible();
    await expect(item.getByRole('link', { name: /Issue #\d+/ })).toBeVisible();
    await expect(syncedItem).toBeVisible({ timeout: 15_000 });

    await item.getByRole('button', { name: 'Upvote 0' }).click();

    await expect(item.getByRole('button', { name: 'Upvoted 1' })).toBeVisible();
    await expect(syncedItem.getByRole('button', { name: 'Upvote 1' })).toBeVisible({
      timeout: 15_000,
    });
  } finally {
    await secondContext.close();
    await host.close();
  }
});

test.beforeEach(() => {
  expect(process.env.BUGDROP_BOARD_WORKER_ORIGIN).toBe(WORKER_ORIGIN);
  expect(process.env.BUGDROP_BOARD_SCRIPT_SRC).toBe(`${WORKER_ORIGIN}/board.js`);
  expect(process.env.BUGDROP_BOARD_TOKEN_ISSUER).toBe('bugdrop-board-dogfood-host');
  expect(process.env.BUGDROP_BOARD_TOKEN_AUDIENCE).toBe('bugdrop-board');
  expect(process.env.BUGDROP_BOARD_TOKEN_SECRET).toBeTruthy();
});
