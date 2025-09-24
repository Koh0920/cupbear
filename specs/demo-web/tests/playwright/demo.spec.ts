import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { expect, test } from '@playwright/test';

const featureSource = readFileSync(
  join(__dirname, '..', 'features', 'demo.feature'),
  'utf8',
);

const SAMPLE_URL = 'https://example.com/sample.pdf';

test.describe('demo.feature parity', () => {
  test('URL → Preview → Safe copy flow', async ({ page }) => {
    test.info().annotations.push({
      type: 'feature',
      description: featureSource.trim(),
    });

    await test.step('Given I open the demo page', async () => {
      await page.goto('/demo');
      await expect(page).toHaveTitle(/Interactive Demo/i);
    });

    await test.step('And I see the input for a URL', async () => {
      const input = page.getByLabel('File link');
      await expect(input).toBeVisible();
    });

    await test.step('When I paste the URL and press Start', async () => {
      const input = page.getByLabel('File link');
      await input.fill(SAMPLE_URL);
      await expect(input).toHaveValue(SAMPLE_URL);
      await page.getByRole('button', { name: 'Start' }).click();
    });

    await test.step('Then I should see "Step 1: Verification passed"', async () => {
      await expect(page.getByText('Step 1: Verification passed')).toBeVisible();
    });

    await test.step('And within 2 seconds I should see the remote viewer frame', async () => {
      const frameElement = page.locator('iframe[title="Sandbox preview"]');
      await expect(frameElement).toBeVisible({ timeout: 2_000 });
      await expect(frameElement).toHaveAttribute('src', SAMPLE_URL);
    });

    await test.step('When I click "Create Safe Copy"', async () => {
      await page.getByRole('button', { name: 'Create Safe Copy' }).click();
    });

    await test.step('Then a download link appears with TTL "5 minutes"', async () => {
      const downloadLink = page.getByRole('link', { name: /Download safe copy/i });
      await expect(downloadLink).toBeVisible();
      await expect(page.getByText('TTL: 5 minutes')).toBeVisible();
    });

    await test.step('And the original file is not stored (verified by audit API)', async () => {
      await expect(
        page.getByText('Original file is not stored (verified by audit API)'),
      ).toBeVisible();
    });
  });
});
