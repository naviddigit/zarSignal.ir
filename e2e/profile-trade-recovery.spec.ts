import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
import { calculateProfessional } from '../src/server/professional-calculator';

test('invalid phone blocks submission, save failures preserve form, and sale steps calculate without inventory', async ({ page }) => {
  const bundle = await build({ stdin: { contents: `import {createRoot} from 'react-dom/client';import {ProfileCompletionForm} from './src/components/profile-completion-form';import {PhoneInput} from './src/components/phone-input';import {TradeCalculator} from './src/components/trade-calculator';createRoot(document.getElementById('root')).render(<><ProfileCompletionForm><input name="firstName" defaultValue="" aria-label="نام"/><PhoneInput name="phone" aria-label="موبایل" required/></ProfileCompletionForm><div id="trade"><TradeCalculator operation="scaleOut" snapshot={{mode:'live',status:'unavailable',quotes:[]}}/></div></>);`, loader: 'tsx', resolveDir: process.cwd() }, bundle: true, write: false, jsx: 'automatic', define: { 'process.env': '{}', 'process.env.NODE_ENV': '"production"' }, plugins: [{ name: 'profile-action-fixture', setup(builder) {
    builder.onResolve({ filter: /app\/account\/complete\/actions$/ }, () => ({ path: 'profile-action', namespace: 'fixture' }));
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `export async function submitProfileAction(){window.profileSaves=(window.profileSaves||0)+1;return {error:'ذخیره اطلاعات ممکن نشد؛ لطفاً دوباره تلاش کنید.'}}`, loader: 'js' }));
  } }] });
  const css = (await Promise.all(['globals.css', 'theme.css', 'calculator/calculator.css'].map(file => readFile(`src/app/${file}`, 'utf8')))).join('\n');
  await page.route('**/__recovery-fixture', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: `<html lang="fa" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><main id="root" class="auth-card" style="margin:16px auto"></main><script>${bundle.outputFiles[0].text.replaceAll('</script', '<\\/script')}</script></html>` }));
  let sent: any;
  await page.route('**/api/public/calculator/professional', route => {
    sent = route.request().postDataJSON();
    try { return route.fulfill({ json: calculateProfessional(sent, { mode: 'live', status: 'unavailable', quotes: [] }) }); }
    catch (error) { return route.fulfill({ status: 400, json: { error: String(error) } }); }
  });
  await page.goto('/__recovery-fixture');
  await page.getByRole('textbox', { name: 'نام', exact: true }).fill('سارا');
  await page.getByRole('textbox', { name: 'موبایل', exact: true }).fill('1234');
  await page.getByRole('button', { name: 'ادامه', exact: true }).click();
  expect(await page.evaluate(() => (window as any).profileSaves ?? 0)).toBe(0);
  await expect(page.getByRole('textbox', { name: 'موبایل', exact: true })).toHaveAttribute('aria-invalid', 'true');
  await page.getByRole('textbox', { name: 'موبایل', exact: true }).fill('۰۹۱۲۱۲۳۴۵۶۷');
  await page.getByRole('button', { name: 'ادامه', exact: true }).click();
  await expect(page.getByText('ذخیره اطلاعات ممکن نشد؛ لطفاً دوباره تلاش کنید.', { exact: true })).toBeVisible();
  await expect(page.getByRole('textbox', { name: 'نام', exact: true })).toHaveValue('سارا');
  await expect(page.getByRole('textbox', { name: 'موبایل', exact: true })).toHaveValue('۰۹۱۲۱۲۳۴۵۶۷');
  expect(page.url()).toContain('/__recovery-fixture');
  const trade = page.locator('#trade');
  await trade.getByRole('textbox', { name: 'قیمت فعلی', exact: true }).fill('26000000');
  await trade.getByRole('group', { name: 'واحد طلای ۱۸ عیار' }).getByRole('button', { name: 'مثقال', exact: true }).click();
  for (let i = 1; i <= 4; i++) {
    if (i > 2) await trade.getByRole('button', { name: 'افزودن پله', exact: true }).click();
    await trade.getByRole('textbox', { name: `قیمت پله ${i}`, exact: true }).fill(String(115500000 - i * 500000));
    await trade.getByRole('textbox', { name: `وزن پله ${i}`, exact: true }).fill('25');
  }
  await trade.getByRole('button', { name: 'محاسبه', exact: true }).click();
  await expect(page.getByRole('dialog', { name: 'نتیجه سناریوی معامله' })).toBeVisible();
  await expect(page.getByRole('dialog').getByText('میانگین فروش', { exact: true })).toBeVisible();
  expect(sent.trade.rows.map((row: any) => row.weight)).toEqual([25, 25, 25, 25]);
  expect(sent.trade.weight).toBe(0);
});
