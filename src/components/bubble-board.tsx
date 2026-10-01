import Link from 'next/link';
import { ArrowUpLeft } from 'lucide-react';
import type { LiveBubbleCard } from '@/lib/bubbles';

const cards = [
  { key: 'GOLD_BUBBLE' as const, name: 'طلا', symbol: 'Au', type: 'gold', title: 'حباب طلا', desc: 'اختلاف ۱۸ عیار بازار با ارزش محاسباتی' },
  { key: 'SILVER_BUBBLE' as const, name: 'نقره', symbol: 'Ag', type: 'silver', title: 'حباب نقره', desc: 'اختلاف ۹۹۹ بازار با ارزش محاسباتی' },
  { key: 'USD_BUBBLE' as const, name: 'دلار', symbol: '$', type: 'currency', title: 'فاصله دلار', desc: 'دلار بازار نسبت به دلار ضمنی طلا' },
];

function formatPercent(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value)}٪`;
}

export function BubbleBoard({ bubbles }: { bubbles: LiveBubbleCard[] }) {
  return (
    <section id="bubbles" className="bubble-section section-reveal">
      <div className="section-heading">
        <div>
          <span className="eyebrow">BUBBLE RADAR</span>
          <h2>اختلاف قیمت را شفاف ببین</h2>
        </div>
        <Link className="text-link" href="/methodology">حباب چیست؟ <ArrowUpLeft size={15} /></Link>
      </div>
      <div className="bubble-grid">
        {cards.map((item, index) => {
          const state = bubbles.find(bubble => bubble.key === item.key)!;
          const ready = (state.status === 'ok' || state.status === 'stale') && state.percent != null;
          const blocked = state.status === 'blocked';
          return (
            <article className={`panel bubble-card bubble-${item.type} is-${state.status}`} key={item.key}>
              <div className="bubble-title">
                <span className={`asset-icon ${item.type}`}>{item.symbol}</span>
                <h3>{item.title}</h3>
                <span className="muted">{String(index + 1).padStart(2, '0')}</span>
              </div>
              <div className={`bubble-value ${ready ? (state.percent! >= 0 ? 'is-up' : 'is-down') : ''}`}>
                <bdi dir="ltr">{ready ? formatPercent(state.percent!) : '—'}</bdi>
                <span>{state.reason}</span>
              </div>
              <p>{item.desc}</p>
              <Link href={item.key === 'SILVER_BUBBLE' ? '/analysis/silver_999' : blocked ? '/methodology' : item.key === 'GOLD_BUBBLE' ? '/analysis/gold_melted' : '/analysis/usd'}>
                تحلیل <ArrowUpLeft size={14} />
              </Link>
            </article>
          );
        })}
      </div>
      <p className="subtle-note">عدد اختلاف قیمت توصیه خرید/فروش نیست. محدوده خنثی هنوز فعال نیست.</p>
    </section>
  );
}
