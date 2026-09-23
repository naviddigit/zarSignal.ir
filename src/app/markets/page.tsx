import type { Metadata } from 'next';
import { MarketBoard } from '@/components/market-board';
import { getPublicSnapshot } from '@/server/quotes';
import { computeLiveBubbles } from '@/server/live-bubbles';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;
export const metadata: Metadata = {
  title: 'نبض بازار · تخته قیمت‌ها',
  description: 'قیمت خرید و فروش طلا، نقره، سکه و ارز با منبع، زمان دریافت و تحلیل حباب در یک تخته خوانا.',
  alternates: { canonical: '/markets' },
};

export default async function MarketsPage() {
  const snapshot = await getPublicSnapshot();
  const bubbles = computeLiveBubbles(snapshot);
  return (
    <main id="main" className="shell markets-page">
      <header className="markets-page__intro">
        <span className="eyebrow">MARKET WATCH</span>
        <h1>نبض بازار</h1>
        <p>تخته قیمت‌ها؛ هر ردیف یک دارایی، با زمان دریافت و تحلیل شفاف.</p>
      </header>
      <MarketBoard initial={snapshot} bubbles={bubbles} />
    </main>
  );
}
