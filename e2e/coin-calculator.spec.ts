import { test, expect } from '@playwright/test';

test('coin budget uses the selected product and costs on mobile', async ({ page }) => {
  await page.goto('/calculator');
  await page.getByRole('tab', { name: 'سکه', exact: true }).click();
  await page.getByRole('button', { name: 'سرمایه و حباب', exact: true }).click();
  await page.getByRole('button', { name: 'نوع سکه', exact: true }).click();
  await page.getByRole('option', { name: 'ربع‌سکه', exact: true }).click();
  for (const [name, value] of [['گرم طلای ۱۸ عیار', '15000000'], ['قیمت مرجع هر سکه', '40000000'], ['سرمایه', '100000000'], ['هزینه هر سکه', '1000000']]) {
    await page.getByRole('textbox', { name, exact: true }).fill(value);
  }
  await page.getByRole('button', { name: 'محاسبه', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: 'نتیجه محاسبه' });
  await expect(dialog).toContainText('18,000,000', { timeout: 30000 });
  await expect(dialog).toContainText('مانده سرمایه');
  await expect(dialog).toContainText('73,188,000');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
});

test('negative scenario bubble stays negative when entered', async ({ page }) => {
  await page.goto('/calculator');
  await page.getByRole('tab', { name: 'سکه', exact: true }).click();
  await page.getByRole('button', { name: 'سناریوی طلا و ارز', exact: true }).click();
  await page.getByRole('textbox', { name: 'حباب هدف', exact: true }).fill('-10');
  await expect(page.getByRole('textbox', { name: 'حباب هدف', exact: true })).toHaveValue('-10');
});
