import { mkdir } from 'node:fs/promises';
import { expect, test } from '@playwright/test';
import { type CustomizationVariant, provisionBoard, startHostApp } from './fixtures/host-app';

const VARIANTS: Array<{
  buttonName: string;
  density: string;
  heading: string;
  itemTitle: string;
  layout: string;
  pressedButtonName: string;
  screenshot: string;
  variant: CustomizationVariant;
}> = [
  {
    buttonName: 'Prioritize Compact SaaS request. 0 upvotes.',
    density: 'compact',
    heading: 'Roadmap queue',
    itemTitle: 'Compact SaaS request',
    layout: 'panel',
    pressedButtonName: 'Remove prioritize from Compact SaaS request. 1 upvote.',
    screenshot: 'compact-saas.png',
    variant: 'compact-saas',
  },
  {
    buttonName: 'Cheer Soft community idea. 0 upvotes.',
    density: 'comfortable',
    heading: 'Community ideas',
    itemTitle: 'Soft community idea',
    layout: 'panel',
    pressedButtonName: 'Remove cheer from Soft community idea. 1 upvote.',
    screenshot: 'soft-community.png',
    variant: 'soft-community',
  },
  {
    buttonName: 'Support High contrast request. 0 upvotes.',
    density: 'spacious',
    heading: 'Accessibility requests',
    itemTitle: 'High contrast request',
    layout: 'panel',
    pressedButtonName: 'Remove support from High contrast request. 1 upvote.',
    screenshot: 'high-contrast.png',
    variant: 'high-contrast',
  },
];

test.describe('customized embedded board variants', () => {
  for (const variant of VARIANTS) {
    test(`${variant.variant} renders from config and preserves board behavior`, async ({
      page,
    }, testInfo) => {
      const board = await provisionBoard();
      const host = await startHostApp(board.id, { variant: variant.variant });

      try {
        await page.goto(`${host.url}/viewer-a`);

        await expect(page.getByRole('heading', { name: variant.heading })).toBeVisible();
        await expect(page.getByText(/No .*yet\./)).toBeVisible();

        const rootState = await page.locator('[data-bugdrop-board-root]').evaluate(hostRoot => ({
          density: (hostRoot as HTMLElement).dataset.bugdropBoardDensity,
          layout: (hostRoot as HTMLElement).dataset.bugdropBoardLayout,
        }));
        expect(rootState).toEqual({ density: variant.density, layout: variant.layout });

        await page.getByLabel(/Request|Idea|Barrier/).fill(variant.itemTitle);
        await page
          .getByLabel(/Business context|Tell us more|Impact/)
          .fill(`Visual proof for ${variant.variant}.`);
        await page
          .getByRole('button', { name: /Add request|Share idea|Submit access request/ })
          .click();

        await expect(page.getByText(variant.itemTitle)).toBeVisible();
        await expect(page.getByRole('link', { name: /Issue #|Tracked as #/ })).toBeVisible();

        const upvote = page.getByRole('button', { name: variant.buttonName });
        await expect(upvote).toHaveAttribute('aria-pressed', 'false');
        await upvote.click();
        await expect(page.getByRole('button', { name: variant.pressedButtonName })).toHaveAttribute(
          'aria-pressed',
          'true'
        );

        const screenshotDir = testInfo.outputPath('customization-variants');
        await mkdir(screenshotDir, { recursive: true });
        await page.screenshot({
          fullPage: true,
          path: `${screenshotDir}/${variant.screenshot}`,
        });
      } finally {
        await host.close();
      }
    });
  }
});
