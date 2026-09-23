'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpLeft } from 'lucide-react';
import { instruments, type Snapshot, type Symbol } from '@/lib/market';
import type { LiveBubbleCard } from '@/lib/bubbles';
import { LayoutToggle, PriceCard, PriceListRow } from '@/components/price-card';
import { useMarketSparks, type SparkSeries } from '@/components/use-market-sparks';

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

function analysisLabel(symbol: string, bubbles: LiveBubbleCard[]) {
  const key =
    symbol === 'GOLD_MELTED' || symbol === 'GOLD_18K' ? 'GOLD_BUBBLE'
      : symbol === 'USD' ? 'USD_BUBBLE'
        : symbol === 'SILVER_999' || symbol === 'XAG_USD' ? 'SILVER_BUBBLE'
          : null;
  if (!key) return null;
  const card = bubbles.find(item => item.key === key);
  if (!card) return null;
  if (card.status === 'blocked') return 'قفل Spec';
  if (card.percent == null) return 'در انتظار داده';
  return null;
}

/** Homepage price preview — card-first with landing-style sparklines. */
export function MarketTeaser({ snapshot, bubbles }: { snapshot: Snapshot; bubbles: LiveBubbleCard[] }) {
  const [layout, setLayout] = useState<'cards' | 'list'>('cards');
  const symbols = spotlight as unknown as Symbol[];
  const sparks = useMarketSparks(symbols);
  const rows = spotlight
    .map(symbol => {
      const asset = instruments.find(item => item.symbol === symbol);
      const quote = snapshot.quotes.find(item => item.symbol === symbol);
      if (!asset) return null;
      return {
        asset,
        quote,
        bubble: bubbleFor(symbol, bubbles),
        analysisLabel: analysisLabel(symbol, bubbles),
        spark: sparks[symbol],
      };
    })
    .filter(Boolean) as {
      asset: (typeof instruments)[number];
      quote: Snapshot['quotes'][number] | undefined;
      bubble: number | null;
      analysisLabel: string | null;
      spark: SparkSeries | undefined;
    }[];

  return (
    <section className="panel market-teaser" aria-label="خلاصه نبض بازار">
      <header className="market-teaser__head">
        <div>
          <span className="eyebrow">LIVE BOARD</span>
          <h2>نگاهی سریع به قیمت‌ها</h2>
          <p>قیمت زنده در باکس‌های ساده؛ تخته کامل فیلتر و جزئیات دارد.</p>
        </div>
        <div className="market-teaser__actions">
          <LayoutToggle value={layout} onChange={setLayout} />
          <Link className="button" href="/markets">تخته کامل <ArrowUpLeft size={16} /></Link>
        </div>
      </header>

      {layout === 'cards' ? (
        <div className="price-card-grid price-card-grid--teaser">
          {rows.map(({ asset, quote, bubble, analysisLabel: label, spark }) => (
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
                analysisLabel: label,
                spark,
              }}
            />
          ))}
        </div>
      ) : (
        <div className="price-list-board">
          {rows.map(({ asset, quote, bubble, analysisLabel: label, spark }) => (
            <PriceListRow
              key={asset.symbol}
              href={`/markets/${asset.symbol.toLowerCase()}`}
              item={{
                symbol: asset.symbol,
                name: asset.name,
                unit: asset.unit,
                category: asset.category,
                quote,
                bubble,
                analysisLabel: label,
                spark,
              }}
            />
          ))}
        </div>
      )}
    </section>
  );
}
