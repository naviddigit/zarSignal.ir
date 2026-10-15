import { test, expect } from '@playwright/test';
import { build } from 'esbuild';
import { readFile } from 'node:fs/promises';
test.setTimeout(60000);
test('admin adds backgrounds and pins/reorders navigation persistently', async ({ page }) => {
  const bundle = await build({ stdin: { contents: `import {createRoot} from 'react-dom/client';import {AdminNav} from './src/app/admin/(protected)/admin-nav';import {StoryBackgroundEditor} from './src/app/admin/(protected)/story-backgrounds/story-background-editor';createRoot(document.getElementById('root')).render(<><aside className="admin-sidebar"><AdminNav/></aside><section className="admin-content"><StoryBackgroundEditor initial={[]}/></section></>);`, loader: 'tsx', resolveDir: process.cwd() }, bundle: true, write: false, jsx: 'automatic', define: { 'process.env': '{}', 'process.env.NODE_ENV': '"production"' }, plugins: [{ name: 'admin-fixture', setup(builder) {
    builder.onResolve({ filter: /actions$/ }, args => args.importer.includes('story-background-editor') ? { path: 'save', namespace: 'fixture' } : undefined);
    builder.onLoad({ filter: /.*/, namespace: 'fixture' }, () => ({ contents: `export async function saveStoryBackgrounds(form){window.storySaved=JSON.parse(form.get('backgrounds'));return {error:'',saved:true}}`, loader: 'js' }));
  } }] });
  const css = (await Promise.all(['src/app/globals.css', 'src/app/theme.css', 'src/app/admin/(protected)/admin-design-system.css'].map(file => readFile(file, 'utf8')))).join('\n');
  await page.route('**/__admin-story-fixture', route => route.fulfill({ contentType: 'text/html; charset=utf-8', body: `<html lang="fa" dir="rtl"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><main id="root" class="admin-shell"></main><script>${bundle.outputFiles[0].text.replaceAll('</script', '<\\/script')}</script></html>` }));
  await page.goto('/__admin-story-fixture');
  await page.getByRole('button', { name: 'افزودن پس‌زمینه' }).click();
  await page.getByRole('textbox', { name: 'نام طرح', exact: true }).fill('طرح آبی');
  await page.getByRole('button', { name: 'افزودن پس‌زمینه' }).click();
  await page.getByRole('textbox', { name: 'نام طرح', exact: true }).nth(1).fill('طرح دوم');
  await page.getByRole('button', { name: 'ذخیره تغییرات' }).click();
  await expect(page.getByRole('status')).toContainText('ذخیره شدند');
  expect(await page.evaluate(() => (window as any).storySaved.length)).toBe(2);
  const mobile = (page.viewportSize()?.width ?? 1280) <= 900;
  if (mobile) await page.getByRole('button', { name: 'منوی مدیریت', exact: true }).click();
  const nav = page.getByRole('navigation', { name: 'ناوبری مدیریت' });
  await nav.getByRole('button', { name: 'محتوا و انتشار', exact: true }).click();
  await nav.getByRole('link', { name: 'صفحه اصلی', exact: true }).hover();
  await nav.getByRole('button', { name: 'پین صفحه اصلی', exact: true }).click();
  await expect(nav.locator('a').first()).toHaveAttribute('href', '/admin/content');
  await nav.getByRole('button', { name: 'سیستم و اتصال‌ها', exact: true }).click();
  await nav.getByRole('link', { name: 'وضعیت سایت', exact: true }).hover();
  await nav.getByRole('button', { name: 'پایین بردن وضعیت سایت', exact: true }).click();
  const order = await nav.locator('a').evaluateAll(items => items.map(item => item.getAttribute('href')));
  await nav.getByRole('textbox', { name: 'جست‌وجوی منوی مدیریت' }).fill('مشتری');
  await expect(nav.getByRole('link', { name: 'مشتری‌ها', exact: true })).toBeVisible();
  await expect(nav.getByRole('link', { name: 'وضعیت سایت', exact: true })).toHaveCount(0);
  await nav.getByRole('textbox', { name: 'جست‌وجوی منوی مدیریت' }).fill('');
  await page.screenshot({ path: `artifacts/admin-navigation-${test.info().project.name}.png`, fullPage: true });
  await page.reload();
  if (mobile) await page.getByRole('button', { name: 'منوی مدیریت', exact: true }).click();
  await expect(nav.locator('a').first()).toHaveAttribute('href', '/admin/content');
  expect(await nav.locator('a').evaluateAll(items => items.map(item => item.getAttribute('href')))).toEqual(order);
  if (mobile) { await page.keyboard.press('Escape'); await expect(page.getByRole('dialog')).toHaveCount(0); }
  expect(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth)).toBe(false);
  await page.getByRole('button', { name: 'افزودن پس‌زمینه' }).click();
  const dimensions = await page.getByRole('textbox', { name: 'نام طرح', exact: true }).first().evaluate(element => ({height:element.getBoundingClientRect().height,font:getComputedStyle(element).fontSize}));
  expect(dimensions.height).toBe(40);
  expect(dimensions.font).toBe(mobile ? '16px' : '12px');
});

test('admin shared form density stays consistent in light and dark themes', async ({ page }) => {
  const bundle = await build({ stdin: { contents: `import {createRoot} from 'react-dom/client';import {AdminNav} from './src/app/admin/(protected)/admin-nav';import {IntegrationCardForm} from './src/components/integration-card-form';import {AnalysisReadingSettingsForm} from './src/components/analysis-reading-settings';createRoot(document.getElementById('root')).render(<><aside className="admin-sidebar"><a className="brand" href="/admin">زرسیگنال<small>MANAGEMENT</small></a><AdminNav/></aside><section className="admin-content"><header className="admin-title"><div><span className="eyebrow">SYSTEM SETTINGS</span><h1>تنظیمات مدیریت</h1><p>فرم‌های یکپارچه، اتصال سرویس‌ها و تنظیمات تحلیل</p></div></header><div className="integration-grid"><IntegrationCardForm itemKey="google_oauth" label="ورود با Google" description="کلیدها و وضعیت اتصال ورود را مدیریت کنید." placeholder="Client ID" google publicValue="example.apps.googleusercontent.com" enabled hasSecret/><IntegrationCardForm itemKey="resend_email" label="تأیید ایمیل" description="ارسال کد تأیید برای کاربران سایت" placeholder="verify@example.com" google={false} publicValue="verify@example.com" enabled={false} hasSecret={false}/></div><section className="admin-card"><h2>سرعت خواندن گزارش</h2><AnalysisReadingSettingsForm settings={{baseCps:40,maxCps:160,sectionAppearMs:200,fallback:false}}/></section></section></>);`, loader:'tsx',resolveDir:process.cwd() },bundle:true,write:false,jsx:'automatic',define:{'process.env':'{}','process.env.NODE_ENV':'"production"'},plugins:[{name:'admin-form-fixture',setup(builder){
    builder.onResolve({filter:/integrations\/actions$/},()=>({path:'save',namespace:'form-fixture'}));
    builder.onResolve({filter:/^next\/navigation$/},()=>({path:'navigation',namespace:'form-fixture'}));
    builder.onLoad({filter:/.*/,namespace:'form-fixture'},args=>({contents:args.path==='navigation'?`export const usePathname=()=>'/admin/integrations';export const useRouter=()=>({refresh(){}});`:`export async function saveIntegrationAction(prev,form){return {ok:true,key:form.get('key'),message:'ذخیره شد'}}`,loader:'js'}));
  }}] });
  const css = (await Promise.all(['src/app/globals.css','src/app/theme.css','src/app/admin/(protected)/admin-design-system.css'].map(file=>readFile(file,'utf8')))).join('\n');
  await page.route('**/__admin-forms',route=>route.fulfill({contentType:'text/html; charset=utf-8',body:`<html lang="fa" dir="rtl" data-theme="light"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>${css}</style><main id="root" class="admin-shell"></main><script>${bundle.outputFiles[0].text.replaceAll('</script','<\\/script')}</script></html>`}));
  await page.goto('/__admin-forms');
  await expect(page.getByRole('heading',{name:'تنظیمات مدیریت'})).toBeVisible();
  for(const theme of ['light','dark']){
    await page.evaluate(theme=>document.documentElement.dataset.theme=theme,theme);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth)).toBe(false);
    const inputs=await page.locator('.admin-content input:not([type=hidden]):not([type=checkbox]):not([type=radio])').evaluateAll(items=>items.map(item=>({height:item.getBoundingClientRect().height,font:getComputedStyle(item).fontSize})));
    expect(inputs).toEqual(inputs.map(()=>({height:40,font:(page.viewportSize()?.width ?? 1280)<=900?'16px':'12px'})));
    const buttons=await page.locator('.admin-content .button').evaluateAll(items=>items.map(item=>item.getBoundingClientRect().height));
    expect(buttons.every(height=>height===40)).toBe(true);
    await page.screenshot({path:`artifacts/admin-forms-${theme}-${test.info().project.name}.png`,fullPage:true});
  }
  await page.getByRole('textbox',{name:'Google Client ID',exact:true}).fill('updated.apps.googleusercontent.com');
  await page.getByRole('button',{name:'ذخیره امن',exact:true}).first().click();
  await expect(page.getByRole('status').first()).toContainText('ذخیره شد');
});
