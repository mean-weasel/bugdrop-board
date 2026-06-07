import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';
import { expect, test } from '@playwright/test';
import { CUSTOMIZATION_VARIANTS } from './fixtures/customization-variants';
import { provisionBoard, startHostApp } from './fixtures/host-app';

const VARIANTS = Object.keys(CUSTOMIZATION_VARIANTS).map(variant => ({
  config: CUSTOMIZATION_VARIANTS[variant as keyof typeof CUSTOMIZATION_VARIANTS],
  variant: variant as keyof typeof CUSTOMIZATION_VARIANTS,
}));

const SCREENSHOT_DIR =
  process.env.BUGDROP_BOARD_MARKETING_SCREENSHOT_DIR &&
  resolve(process.env.BUGDROP_BOARD_MARKETING_SCREENSHOT_DIR);

const ISSUE_LINK_PATTERN = /Issue #|Tracked as #|Spec #|Experiment #/;
const TITLE_LABEL_PATTERN = /Request|Idea|Barrier|Endpoint|Bet/;
const DESCRIPTION_LABEL_PATTERN = /Business context|Tell us more|Impact|Use case|Signal/;
const SUBMIT_BUTTON_PATTERN = /Add request|Share idea|Submit access request|Send feedback|Add bet/;

test.describe('customized embedded board variants', () => {
  for (const variant of VARIANTS) {
    test(`${variant.variant} renders from config and preserves board behavior`, async ({
      page,
    }, testInfo) => {
      const board = await provisionBoard();
      const host = await startHostApp(board.id, { variant: variant.variant });

      try {
        await page.goto(`${host.url}/viewer-a`);

        await expect(
          page.getByRole('heading', { name: variant.config.config.copy.heading })
        ).toBeVisible();
        await expect(page.getByText(/No .*yet\./)).toBeVisible();

        const rootState = await page.locator('[data-bugdrop-board-root]').evaluate(hostRoot => ({
          density: (hostRoot as HTMLElement).dataset.bugdropBoardDensity,
          layout: (hostRoot as HTMLElement).dataset.bugdropBoardLayout,
        }));
        expect(rootState).toEqual({
          density: variant.config.config.density,
          layout: variant.config.config.layout,
        });

        await page.getByLabel(TITLE_LABEL_PATTERN).fill(variant.config.itemTitle);
        await page
          .getByLabel(DESCRIPTION_LABEL_PATTERN)
          .fill(`Visual proof for ${variant.variant}.`);
        await page.getByRole('button', { name: SUBMIT_BUTTON_PATTERN }).click();

        await expect(page.getByText(variant.config.itemTitle)).toBeVisible();
        await expect(page.getByRole('link', { name: ISSUE_LINK_PATTERN })).toBeVisible();

        const upvote = page.getByRole('button', { name: variant.config.upvoteButtonName });
        await expect(upvote).toHaveAttribute('aria-pressed', 'false');
        await upvote.click();
        await expect(
          page.getByRole('button', { name: variant.config.upvotedButtonName })
        ).toHaveAttribute('aria-pressed', 'true');

        const screenshotDir = SCREENSHOT_DIR ?? testInfo.outputPath('customization-variants');
        await mkdir(screenshotDir, { recursive: true });
        await page.screenshot({
          fullPage: true,
          path: `${screenshotDir}/${variant.config.screenshot}`,
        });
      } finally {
        await host.close();
      }
    });
  }
});
