import { expect, test } from '@playwright/test';
import { provisionBoard, startHostApp } from './fixtures/host-app';

test('embedded board creates, upvotes, and syncs through polling', async ({ browser, page }) => {
  const board = await provisionBoard();
  const host = await startHostApp(board.id);
  const secondContext = await browser.newContext();
  const secondPage = await secondContext.newPage();

  try {
    await page.goto(`${host.url}/viewer-a`);
    await secondPage.goto(`${host.url}/viewer-b`);

    await expect(page.getByRole('heading', { name: 'Dummy App' })).toBeVisible();
    await expect(secondPage.getByRole('heading', { name: 'Dummy App' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Feedback' })).toBeVisible();

    await page.getByLabel('Idea title').fill('Add dark mode');
    await page.getByLabel('Context').fill('The app should be easier to use at night.');
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.getByText('Add dark mode')).toBeVisible();
    await expect(page.getByText('Issue #1001')).toBeVisible();
    await expect(secondPage.getByText('Add dark mode')).toBeVisible({ timeout: 10_000 });

    await page.getByRole('button', { name: 'Upvote 0' }).click();

    await expect(page.getByRole('button', { name: 'Upvoted 1' })).toBeVisible();
    await expect(secondPage.getByRole('button', { name: 'Upvote 1' })).toBeVisible({
      timeout: 10_000,
    });
  } finally {
    await secondContext.close();
    await host.close();
  }
});
