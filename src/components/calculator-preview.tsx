import Link from 'next/link';
import { ArrowUpLeft, Calculator } from 'lucide-react';
export function CalculatorPreview() {
  return <section id="calculator" className="panel calc-preview"><div><span className="eyebrow"><Calculator size={19}/> محاسبه با ورودی روشن</span><h2>از مظنه تا قیمت هر گرم.</h2><p>تبدیل طلای آب‌شده، حباب طلا و دلار ضمنی؛ با انتخاب قیمت بازار یا ورود دستی.</p><span className="calc-preview-categories">طلا · نقره · سکه · ارز</span></div><Link className="button" href="/calculator">ماشین‌حساب حرفه‌ای <ArrowUpLeft size={18}/></Link></section>;
}
