import { test, expect } from '@playwright/test';

test('install metadata exposes real PNG icons', async ({ request }) => {
  const response = await request.get('/manifest.webmanifest');
  const manifest = await response.json();
  expect(manifest.display).toBe('standalone');
  for (const icon of manifest.icons) {
    const response = await request.get(icon.src);
    expect(response.ok()).toBe(true);
    expect(response.headers()['content-type']).toContain('image/png');
    expect((await response.body()).subarray(1,4).toString()).toBe('PNG');
  }
});

test('iPhone shows home screen instructions and has no overflow', async ({ page }) => {
  await page.addInitScript(() => Object.defineProperty(navigator, 'userAgent', {get: () => 'iPhone Safari'}));
  await page.setViewportSize({ width: 360, height: 800 });
  await page.goto('/mobile');
  await expect(page.locator('link[rel="apple-touch-icon"]')).toHaveAttribute('href', /apple-icon/);
  await page.getByRole('button', {name:'نصب زرسیگنال',exact:true}).first().click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('dialog')).toContainText('Add to Home Screen');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.getByRole('button', {name:'بستن راهنمای نصب'}).click();
  await expect(page.getByRole('dialog')).not.toBeVisible();
});

test('native install event is used and installed state hides CTA', async ({ page }) => {
  await page.goto('/');
  const button = page.getByRole('button', {name:'نصب زرسیگنال',exact:true});
  await expect(button).toBeVisible();
  await page.evaluate(() => {
    const event = new Event('beforeinstallprompt', {cancelable:true});
    Object.assign(event, {prompt:async () => {document.body.dataset.installPrompt='shown';},userChoice:Promise.resolve({outcome:'accepted'})});
    window.dispatchEvent(event);
  });
  await button.click();
  await expect(page.locator('body')).toHaveAttribute('data-install-prompt','shown');
  await page.evaluate(() => window.dispatchEvent(new Event('appinstalled')));
  await expect(button).toHaveCount(0);
});
