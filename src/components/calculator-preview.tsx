import Link from 'next/link';
import { ArrowUpLeft, Calculator } from 'lucide-react';
export function CalculatorPreview() {
  return (
    <section id="calculator" className="panel calc-preview">
      <div>
        <span className="eyebrow"><Calculator size={19} /> ماشین‌حساب رایگان</span>
        <h2>مظنه را ÷ ۴٫۳۳۱۸ کن؛ وزن و عیار را سریع ببین.</h2>
        <p>فعال الان: طلا (وزن، مظنه، حباب) و فاصله دلار. نقره و سکه برای وزن/عیار بازند؛ حبابشان بعد از تأیید مدل.</p>
        <span className="calc-preview-categories">فعال: طلا · نقره · ارز · وزن/عیار · به‌زودی: سکه و ابزارهای بیشتر</span>
      </div>
      <Link className="button" href="/calculator">باز کردن ماشین‌حساب <ArrowUpLeft size={18} /></Link>
    </section>
  );
}
