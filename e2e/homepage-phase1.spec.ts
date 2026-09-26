import { test, expect } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const output = 'artifacts/homepage-phase1';
const viewports = [[360, 800], [390, 844], [430, 932], [768, 1024], [1440, 1000]];

test('Phase 1 real viewport, theme, navigation and disclosure acceptance', async ({ page }) => {
  test.setTimeout(180_000);
  mkdirSync(output, { recursive: true });
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  const measurements = [];
  for (const theme of ['light', 'dark']) {
    await page.addInitScript(value => localStorage.setItem('zarsignal-theme', value), theme);
    for (const [width, height] of viewports) {
      await page.setViewportSize({ width, height });
      await page.goto('/', { waitUntil: 'domcontentloaded' });
      await expect(page.locator('#hero-title')).toBeVisible();
      await page.evaluate(() => document.fonts.ready);
      await expect(page.locator('html')).toHaveAttribute('data-theme', theme);
      const cta = page.locator('.home-actions .button');
      await expect(cta).toBeInViewport();
      const box = await cta.boundingBox();
      expect(box!.height).toBeGreaterThanOrEqual(44);
      expect(box!.y + box!.height).toBeLessThan(height - (width <= 760 ? 90 : 0));
      expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
      measurements.push({ theme, width, height, ctaBottom: box!.y + box!.height, horizontalOverflow: false });
      await page.screenshot({ path: `${output}/after-${width}-${theme}.png`, fullPage: true });
      if (width === 390 || width === 360) await page.screenshot({ path: `${output}/first-screen-${width}-${theme}.png` });
    }
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'نمای حرفه‌ای', exact: true }).click();
  await page.locator('.home-professional summary').click();
  await expect(page.locator('.home-professional')).toContainText('هزینه واقعی وارد محاسبه نشده');
  await page.reload();
  await expect(page.getByRole('button', { name: 'نمای حرفه‌ای', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.getByRole('button', { name: 'نقره', exact: true }).click();
  await expect(page.locator('.home-radar__body')).toHaveAttribute('data-state', 'blocked');
  await expect(page.locator('.home-radar__body')).toContainText('این محدودیت با خرید اشتراک رفع نمی‌شود');
  await page.waitForTimeout(3600);
  await expect(page.getByRole('button', { name: 'نقره', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await page.screenshot({ path: `${output}/silver-blocked-professional.png`, fullPage: true });
  await page.locator('.mobile-tab-bar').getByRole('link', { name: 'هشدارهای من' }).click();
  await expect(page.getByRole('heading', { name: 'هشدار شخصی هنوز فعال نیست' })).toBeVisible();
  await page.screenshot({ path: `${output}/alerts-mobile.png`, fullPage: true });
  await page.goto('/login');
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `${output}/login-mobile.png`, fullPage: true });
  await page.goto('/');
  await page.locator('.header-more summary').click();
  await expect(page.locator('.header-more').getByRole('link', { name: 'ماشین‌حساب' })).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.locator('.header-more')).not.toHaveAttribute('open');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.evaluate(() => { document.documentElement.style.fontSize = '200%'; document.body.style.fontSize = '200%'; });
  // Text-only enlargement also covers the explicit px typography used by the existing site.
  await page.addStyleTag({ content: '.homepage p,.homepage a,.homepage button,.homepage summary,.homepage .home-label{font-size:24px!important}.homepage h1{font-size:48px!important}' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(page.locator('#hero-title')).toBeVisible();
  await page.screenshot({ path: `${output}/text-enlargement-reduced-motion.png`, fullPage: true });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.locator('.skip-link')).toBeFocused();
  await page.keyboard.press('Enter');
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).scrollBehavior)).toBe('auto');
  expect(errors).toEqual([]);
  writeFileSync(`${output}/measurements.json`, JSON.stringify({ measurements, browserErrors: errors }, null, 2));
});
