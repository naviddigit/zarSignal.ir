import Link from 'next/link';
import { ArrowUpLeft } from 'lucide-react';
import type { LiveBubbleCard } from '@/lib/bubbles';

const cards = [
  { key: 'GOLD_BUBBLE' as const, name: 'طلا', symbol: 'Au', type: 'gold', desc: 'فاصله قیمت ۱۸عیار مشتق‌شده از مظنه با ارزش محاسباتی اونس × دلار' },
  { key: 'SILVER_BUBBLE' as const, name: 'نقره', symbol: 'Ag', type: 'silver', desc: 'تا قیمت نقره ۹۹۹ داخلی تأیید شود قفل است' },
  { key: 'USD_BUBBLE' as const, name: 'دلار', symbol: '$', type: 'currency', desc: 'فاصله دلار بازار با دلار ضمنی از طلا — نه ارزش بنیادی دلار' },
];

function formatPercent(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value)}٪`;
}

function needle(percent: number | null) {
  if (percent == null || !Number.isFinite(percent)) return 50;
  return Math.min(92, Math.max(8, 50 + percent * 4));
}

export function BubbleBoard({ bubbles }: { bubbles: LiveBubbleCard[] }) {
  return (
    <section id="bubbles" className="bubble-section section-reveal">
      <div className="section-heading">
        <div>
          <span className="eyebrow">BUBBLE RADAR</span>
          <h2>زیر پوست قیمت‌ها</h2>
        </div>
        <Link className="text-link" href="/methodology">حباب چیست؟ <ArrowUpLeft size={15} /></Link>
      </div>
      <div className="bubble-grid">
        {cards.map((item, index) => {
          const state = bubbles.find(bubble => bubble.key === item.key)!;
          const ready = (state.status === 'ok' || state.status === 'stale') && state.percent != null;
          return (
            <article className={`panel bubble-card bubble-${item.type} is-${state.status}`} key={item.key}>
              <div className="bubble-title">
                <span className={`asset-icon ${item.type}`}>{item.symbol}</span>
                <h3>حباب {item.name}</h3>
                <span className="muted">۰{index + 1}</span>
              </div>
              <div className={`bubble-value ${ready ? (state.percent! >= 0 ? 'is-up' : 'is-down') : ''}`}>
                {ready ? formatPercent(state.percent!) : '—'}
                <span>{state.reason}</span>
              </div>
              <div className="gauge" aria-hidden="true">
                <span /><span /><span />
                <i style={{ insetInlineStart: `${needle(state.percent)}%` }} />
              </div>
              <div className="gauge-labels"><span>پایین‌تر</span><span>نزدیک تعادل</span><span>بالاتر</span></div>
              <p>{item.desc}</p>
              <Link href="/methodology">جزئیات محاسبه <ArrowUpLeft size={14} /></Link>
            </article>
          );
        })}
      </div>
      <p className="subtle-note">عدد حباب سیگنال خرید/فروش نیست. نقره و محدوده خنثی تا Spec جدا قفل‌اند.</p>
    </section>
  );
}
