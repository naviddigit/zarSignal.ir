import Link from 'next/link';
import { ArrowUpLeft, Calculator } from 'lucide-react';
export function CalculatorPreview() {
  return (
    <section id="calculator" className="panel calc-preview">
      <div>
        <span className="eyebrow"><Calculator size={19} /> ماشین‌حساب رایگان</span>
        <h2>مظنه به گرم ۱۸ عیار</h2>
        <p>قیمت مظنه ÷ ۴٫۳۳۱۸؛ قیمت هر گرم طلای ۱۸ عیار را ببینید.</p>
        <span className="calc-preview-categories">طلا · نقره · ارز · سکه · معامله سریع</span>
      </div>
      <Link className="button" href="/calculator">باز کردن ماشین‌حساب <ArrowUpLeft size={18} /></Link>
    </section>
  );
}
