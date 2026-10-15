import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';

test('profile area and age use the shared modal/drawer and preserve explicit choices', async ({ page }, info) => {
  const bundle = await build({ stdin: { contents: `import {createRoot} from 'react-dom/client';import {ProfileDemographics} from './src/components/profile-demographics';createRoot(document.getElementById('root')).render(<form><ProfileDemographics city="تهران" areaRequired ageRequired/></form>);`, loader: 'tsx', resolveDir: process.cwd() }, bundle: true, write: false, jsx: 'automatic', define: { 'process.env': '{}', 'process.env.NODE_ENV': '"production"' } });
  const css = (await Promise.all(['globals.css', 'theme.css'].map(file => readFile(`src/app/${file}`, 'utf8')))).join('\n');
  await page.route('**/__profile-fixture', route => route.fulfill({ contentType: 'text/html', body: `<html lang="fa" dir="rtl"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><main id="root" class="auth-card" style="margin:32px auto"></main><script>${bundle.outputFiles[0].text.replaceAll('</script', '<\\/script')}</script></html>` }));
  await page.goto('/__profile-fixture');
  await expect(page.locator('input[name=city]')).toHaveValue('');
  await expect(page.locator('input[name=ageGroup]')).toHaveValue('');
  await page.getByRole('button', { name: 'محدوده فعالیت *', exact: true }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await expect(page.getByRole('option')).toHaveCount(3);
  const panel = await page.locator('.ds-overlay__panel').boundingBox();
  const viewport = page.viewportSize()!;
  if (info.project.name === 'mobile') await expect.poll(async () => {
    const box = await page.locator('.ds-overlay__panel').boundingBox();
    return Math.abs(box!.y + box!.height - viewport.height);
  }).toBeLessThan(3);
  else expect(panel!.y).toBeGreaterThan(20);
  await page.getByRole('option', { name: 'شهرستان', exact: true }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.locator('input[name=city]')).toHaveValue('شهرستان');
  await page.getByRole('button', { name: 'سن *', exact: true }).click();
  await expect(page.getByRole('option')).toHaveCount(2);
  await page.getByRole('option', { name: '۱۸ سال و بالاتر', exact: true }).click();
  await expect(page.locator('input[name=ageGroup]')).toHaveValue('۱۸ سال و بالاتر');
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
});
