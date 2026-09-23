import type { Metadata } from 'next';
import { ProfessionalCalculator } from '@/components/professional-calculator';
import { getPublicSnapshot } from '@/server/quotes';
import './calculator.css';
export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'ماشین‌حساب حرفه‌ای طلا، نقره، سکه و ارز', description: 'تبدیل مظنه، قیمت ۱۸ عیار و محاسبه حباب طلا با ورودی دستی یا زنده و جزئیات منبع و نسخه.', alternates: { canonical: '/calculator' } };
export default async function CalculatorPage() {
  const snapshot = await getPublicSnapshot();
  return (
    <main id="main" className="shell professional-page">
      <header>
        <span className="eyebrow">ZARSIGNAL CALCULATOR</span>
        <h1>هر محاسبه، با ورودی روشن.</h1>
        <p>محاسبه را انتخاب کنید، قیمت را وارد یا از بازار دریافت کنید و نتیجه را ببینید.</p>
      </header>
      <ProfessionalCalculator snapshot={snapshot} />
    </main>
  );
}

