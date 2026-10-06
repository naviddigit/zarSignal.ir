import { getCalculatorNavigation } from '@/server/calculator-navigation';
import { requireAdmin } from '@/server/admin-auth';
import { CalculatorNavigationSettings } from '@/components/calculator-navigation-settings';
import '../admin-settings.css';

export const dynamic = 'force-dynamic';

export default async function CalculatorLayoutPage() {
  await requireAdmin();
  const { writable, ...navigation } = await getCalculatorNavigation();
  return <>
    <header className="admin-title"><div><span className="eyebrow">CALCULATOR</span><h1>چیدمان ماشین‌حساب</h1><p>ترتیب دسته‌ها و ابزارهای انتخابی در دسکتاپ و موبایل</p></div></header>
    <section className="admin-card"><CalculatorNavigationSettings initial={navigation} writable={writable} /></section>
  </>;
}
