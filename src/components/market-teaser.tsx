import Link from 'next/link';
import { ArrowUpLeft, Clock3 } from 'lucide-react';
import { formatPrice, instruments, type Snapshot } from '@/lib/market';
import type { LiveBubbleCard } from '@/lib/bubbles';
import { RelativeTime } from '@/components/relative-time';
import { AssetMark } from '@/components/market-board';

const spotlight = ['GOLD_MELTED', 'GOLD_18K', 'USD', 'SEKE_CASH', 'SILVER_999'] as const;

function bubbleFor(symbol: string, bubbles: LiveBubbleCard[]) {
  const key =
    symbol === 'GOLD_MELTED' || symbol === 'GOLD_18K' ? 'GOLD_BUBBLE'
      : symbol === 'USD' ? 'USD_BUBBLE'
        : symbol === 'SILVER_999' || symbol === 'XAG_USD' ? 'SILVER_BUBBLE'
          : null;
  if (!key) return null;
  const card = bubbles.find(item => item.key === key);
  if (!card || card.percent == null || (card.status !== 'ok' && card.status !== 'stale')) return null;
  return card.percent;
}

/** Compact homepage strip — full board lives on /markets. */
export function MarketTeaser({ snapshot, bubbles }: { snapshot: Snapshot; bubbles: LiveBubbleCard[] }) {
  const rows = spotlight
    .map(symbol => {
      const asset = instruments.find(item => item.symbol === symbol);
      const quote = snapshot.quotes.find(item => item.symbol === symbol);
      if (!asset) return null;
      return { asset, quote, bubble: bubbleFor(symbol, bubbles) };
    })
    .filter(Boolean) as { asset: (typeof instruments)[number]; quote: Snapshot['quotes'][number] | undefined; bubble: number | null }[];

  return (
    <section className="panel market-teaser" aria-label="خلاصه نبض بازار">
      <header className="market-teaser__head">
        <div>
          <span className="eyebrow">LIVE BOARD</span>
          <h2>نگاهی سریع به قیمت‌ها</h2>
          <p>برای تخته کامل و فیلتر بازارها، صفحهٔ نبض بازار را باز کنید.</p>
        </div>
        <Link className="button" href="/markets">تخته کامل قیمت‌ها <ArrowUpLeft size={16} /></Link>
      </header>
      <ol className="market-teaser__list">
        {rows.map(({ asset, quote, bubble }) => (
          <li key={asset.symbol}>
            <Link href={`/markets/${asset.symbol.toLowerCase()}`} className="market-teaser__row">
              <span className="market-teaser__asset">
                <AssetMark symbol={asset.symbol} category={asset.category} />
                <span>
                  <strong>{asset.name}</strong>
                  <small>{asset.unit}</small>
                </span>
              </span>
              <span className="market-teaser__price">
                <bdi>{quote ? formatPrice(quote.sell, quote.currency) : '—'}</bdi>
                {quote ? <small><Clock3 size={11} /><RelativeTime value={quote.fetchedAt} /></small> : <small>بدون قیمت</small>}
              </span>
              {bubble != null ? (
                <span className={`market-teaser__bubble ${bubble >= 0 ? 'is-up' : 'is-down'}`}>
                  {`${bubble > 0 ? '+' : ''}${new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 }).format(bubble)}٪`}
                </span>
              ) : <span className="market-teaser__bubble is-empty">—</span>}
            </Link>
          </li>
        ))}
      </ol>
    </section>
  );
}
