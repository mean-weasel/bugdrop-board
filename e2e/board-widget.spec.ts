import { expect, test } from '@playwright/test';
import { provisionBoard, startHostApp } from './fixtures/host-app';

test('real widget bundle uses the strict token POST contract without a fallback', async ({
  page,
}) => {
  const board = await provisionBoard();
  const host = await startHostApp(board.id, { pollInterval: '60000' });
  const tokenRequests: Array<{
    accept?: string;
    contentType?: string;
    method: string;
    body: string;
  }> = [];
  page.on('request', request => {
    if (new URL(request.url()).pathname === '/token') {
      const headers = request.headers();
      tokenRequests.push({
        accept: headers.accept,
        contentType: headers['content-type'],
        method: request.method(),
        body: request.postData() ?? '',
      });
    }
  });

  try {
    await page.goto(`${host.url}/viewer-a`);
    await expect(page.getByRole('heading', { name: 'Feedback' })).toBeVisible();

    await expect.poll(() => host.tokenRequestCount()).toBe(1);
    expect(tokenRequests).toEqual([
      {
        accept: 'application/json',
        contentType: 'application/json',
        method: 'POST',
        body: '{}',
      },
    ]);

    const getResponse = await page.request.get(`${host.url}/token?viewer=a`);
    expect(getResponse.status()).toBe(405);
    expect(getResponse.headers().allow).toBe('POST');
    expect(await getResponse.json()).toEqual({ error: 'Method not allowed' });
    expect(host.tokenRequestCount()).toBe(1);
  } finally {
    await host.close();
  }
});

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
    await expect(page.getByText('Tell us what you want to see next.')).toBeVisible();

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

test('real bundle preserves an empty kanban with a collapsed composer', async ({ page }) => {
  const board = await provisionBoard();
  const host = await startHostApp(board.id, {
    presentation: {
      composer: 'collapsed',
      density: 'compact',
      emptyLaneDisplay: 'visible',
      issueLinks: 'hidden',
      layout: 'kanban',
    },
  });

  try {
    await page.goto(`${host.url}/viewer-a`);

    const root = page.locator('[data-bugdrop-board-root]');
    await expect(root).toHaveAttribute('data-bugdrop-board-layout', 'kanban');
    await expect(root).toHaveAttribute('data-bugdrop-board-composer', 'collapsed');
    await expect(root).toHaveAttribute('data-bugdrop-board-density', 'compact');
    await expect(root).toHaveAttribute('data-bugdrop-board-empty-lane-display', 'visible');
    await expect(root).toHaveAttribute('data-bugdrop-board-issue-links', 'hidden');

    for (const lane of ['Open', 'Planned', 'Building', 'Shipped']) {
      await expect(page.getByRole('region', { name: `${lane} lane, 0 items` })).toBeVisible();
    }

    const composer = page.locator('details.bugdrop-board__composer');
    await expect(composer).not.toHaveAttribute('open', '');
    await expect(page.getByLabel('Idea title')).not.toBeVisible();
    await composer.locator('summary').click();
    await expect(page.getByLabel('Idea title')).toBeVisible();

    await page.getByLabel('Idea title').fill('Keep the board visible');
    await page.getByLabel('Context').fill('Empty boards must still look like boards.');
    await page.getByRole('button', { name: 'Submit' }).click();

    const openLane = page.getByRole('region', { name: 'Open lane, 1 item' });
    await expect(openLane.getByText('Keep the board visible')).toBeVisible();
    await expect(openLane.getByRole('link', { name: /Issue #/ })).toHaveCount(0);

    await page.setViewportSize({ width: 375, height: 812 });
    await expect(openLane).toBeVisible();
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)
    ).toBe(true);
  } finally {
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
