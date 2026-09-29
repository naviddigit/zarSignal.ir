import Link from 'next/link';
import { ArrowUpLeft, Calculator, LineChart } from 'lucide-react';

/** Mobile-first clarity strip: one job, three clear next steps. */
export function HomeValueStrip() {
  return (
    <section className="home-value-strip" aria-label="کاربرد زرسیگنال">
      <p className="home-value-strip__promise">
        <strong>الان اختلاف طلا و دلار را ببین.</strong>
        <span> قیمت و ماشین‌حساب رایگان است؛ عدد حباب توصیه خرید/فروش نیست.</span>
      </p>
      <nav className="home-value-strip__actions" aria-label="شروع سریع">
        <Link href="/markets" className="button">قیمت‌ها <ArrowUpLeft size={15} /></Link>
        <Link href="/calculator" className="home-value-strip__ghost"><Calculator size={15} /> ماشین‌حساب</Link>
        <Link href="/analysis/gold_melted" className="home-value-strip__ghost"><LineChart size={15} /> تحلیل طلا</Link>
      </nav>
    </section>
  );
}
