import Link from 'next/link';
import { ArrowUpLeft, Calculator, LineChart } from 'lucide-react';

/** Compact CTA strip — kept for /mobile or landing reuse; not on homepage (too noisy). */
export function HomeValueStrip() {
  return (
    <section className="home-value-strip" aria-label="شروع سریع">
      <nav className="home-value-strip__actions" aria-label="میانبرها">
        <Link href="/markets" className="button">قیمت‌ها <ArrowUpLeft size={15} /></Link>
        <Link href="/calculator" className="home-value-strip__ghost"><Calculator size={15} /> ماشین‌حساب</Link>
        <Link href="/analysis/gold_melted" className="home-value-strip__ghost"><LineChart size={15} /> تحلیل پیشرفته</Link>
      </nav>
    </section>
  );
}
