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
    await expect(
      page.getByText('No feedback yet. Share the first idea to help prioritize what comes next.')
    ).toBeVisible();

    await page.getByLabel('Idea title').fill('Add dark mode');
    await page.getByLabel('Context').fill('The app should be easier to use at night.');
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.getByText('Add dark mode')).toBeVisible();
    await expect(page.getByText('Issue #1001')).toBeVisible();
    await expect(secondPage.getByText('Add dark mode')).toBeVisible({ timeout: 10_000 });

    const viewerAUpvote = page.getByRole('button', {
      name: 'Upvote Add dark mode. 0 upvotes.',
    });
    await expect(viewerAUpvote).toHaveAttribute('aria-pressed', 'false');
    await viewerAUpvote.click();

    await expect(
      page.getByRole('button', { name: 'Remove upvote from Add dark mode. 1 upvote.' })
    ).toHaveAttribute('aria-pressed', 'true');
    await expect(page.getByText('Upvoted 1')).toBeVisible();
    await expect(
      secondPage.getByRole('button', { name: 'Upvote Add dark mode. 1 upvote.' })
    ).toHaveAttribute('aria-pressed', 'false', { timeout: 10_000 });
    await expect(secondPage.getByText('Upvote 1')).toBeVisible();
  } finally {
    await secondContext.close();
    await host.close();
  }
});

test('embedded board can mount inside a host-provided inline container', async ({ page }) => {
  const board = await provisionBoard();
  const host = await startHostApp(board.id, { inlineMount: true });

  try {
    await page.goto(`${host.url}/viewer-a`);

    const inlineSlot = page.getByTestId('inline-feedback-slot');
    await expect(inlineSlot.locator('[data-bugdrop-board-root]')).toHaveCount(1);
    await expect(page.getByRole('heading', { name: 'Feedback' })).toBeVisible();

    await page.getByLabel('Idea title').fill('Inline board placement');
    await page.getByLabel('Context').fill('Installers can place the board inside page content.');
    await page.getByRole('button', { name: 'Submit' }).click();

    await expect(page.getByText('Inline board placement')).toBeVisible();
    await expect(page.getByRole('link', { name: /Issue #\d+/ })).toBeVisible();
  } finally {
    await host.close();
  }
});
