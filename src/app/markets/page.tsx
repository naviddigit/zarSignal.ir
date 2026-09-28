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
      <MarketBoard initial={snapshot} bubbles={bubbles} />
    </main>
  );
}
