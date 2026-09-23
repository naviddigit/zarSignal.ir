'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpLeft } from 'lucide-react';
import { instruments, formatPrice, type Snapshot } from '@/lib/market';
import type { LiveBubbleCard } from '@/lib/bubbles';
import { LayoutToggle, PriceCard } from '@/components/price-card';

const spotlight = ['GOLD_MELTED', 'GOLD_18K', 'USD', 'SEKE_CASH', 'SILVER_999', 'XAU_USD'] as const;

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

/** Homepage price preview — cards by default, optional compact list. */
export function MarketTeaser({ snapshot, bubbles }: { snapshot: Snapshot; bubbles: LiveBubbleCard[] }) {
  const [layout, setLayout] = useState<'cards' | 'list'>('cards');
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
          <p>باکس‌های زنده؛ برای فیلتر کامل به نبض بازار بروید.</p>
        </div>
        <div className="market-teaser__actions">
          <LayoutToggle value={layout} onChange={setLayout} />
          <Link className="button" href="/markets">تخته کامل <ArrowUpLeft size={16} /></Link>
        </div>
      </header>

      {layout === 'cards' ? (
        <div className="price-card-grid price-card-grid--teaser">
          {rows.map(({ asset, quote, bubble }) => (
            <PriceCard
              key={asset.symbol}
              href={`/markets/${asset.symbol.toLowerCase()}`}
              item={{
                symbol: asset.symbol,
                name: asset.name,
                unit: asset.unit,
                category: asset.category,
                quote,
                bubble,
              }}
            />
          ))}
        </div>
      ) : (
        <ol className="market-teaser__list">
          {rows.map(({ asset, quote, bubble }) => (
            <li key={asset.symbol}>
              <Link href={`/markets/${asset.symbol.toLowerCase()}`} className="market-teaser__row">
                <span className="market-teaser__asset">
                  <strong>{asset.name}</strong>
                  <small>{asset.unit}</small>
                </span>
                <span className="market-teaser__price">
                  <bdi>{quote ? formatPrice(quote.sell, quote.currency) : '—'}</bdi>
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
      )}
    </section>
  );
}
