import { test, expect } from '@playwright/test';

test('verification screen is compact and cannot appear without a challenge', async ({ page, context }) => {
  await page.goto('/login/verify');
  await expect(page).toHaveURL(/\/login$/);
  await context.addCookies([{ name: 'zs_email_challenge', value: 'a'.repeat(64), url: 'http://127.0.0.1:3000', httpOnly: true, sameSite: 'Lax' }]);
  for (const width of [320, 390, 1440]) {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/login/verify?error=code');
    await expect(page.getByRole('heading', { name: 'تأیید ایمیل' })).toBeVisible();
    await expect(page.getByRole('textbox', { name: 'کد تأیید' })).toHaveAttribute('inputmode', 'numeric');
    await expect(page.getByRole('textbox', { name: 'کد تأیید' })).toHaveAttribute('maxlength', '6');
    await expect(page.locator('.calc-error[role="alert"]')).toContainText('۵ تلاش');
    expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  }
});
