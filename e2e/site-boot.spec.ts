import { test, expect } from '@playwright/test';

test('site never traps readers behind a logo when client scripts cannot run', async ({ browser }) => {
  const context = await browser.newContext({ javaScriptEnabled: false });
  try {
    const page = await context.newPage();
    await page.goto('/calculator');
    await expect(page.getByRole('banner')).toBeVisible();
    await expect(page.getByRole('main')).toBeVisible();
    await expect(page.locator('#boot-splash')).toHaveCount(0);
    await expect(page.locator('html')).not.toHaveClass(/is-booting/);
  } finally {
    await context.close();
  }
});
