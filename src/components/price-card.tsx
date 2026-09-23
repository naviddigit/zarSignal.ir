'use client';

import Link from 'next/link';
import { LayoutGrid, Rows3 } from 'lucide-react';
import { formatPrice, type Quote, type Symbol as MarketSymbol } from '@/lib/market';
import { RelativeTime } from '@/components/relative-time';
import { AssetMark } from '@/components/asset-mark';
import { Sparkline } from '@/components/sparkline';
import type { SparkSeries } from '@/components/use-market-sparks';

export function formatBubblePercent(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value)}٪`;
}

export type PriceCardModel = {
  symbol: MarketSymbol;
  name: string;
  unit: string;
  category: string;
  quote?: Quote;
  bubble: number | null;
  analysisLabel?: string | null;
  updated?: boolean;
  favorite?: boolean;
  onToggleFavorite?: () => void;
  spark?: SparkSeries;
};

/** Minimal price box — name, price, one spark, optional bubble. */
export function PriceCard({ item, href }: { item: PriceCardModel; href: string }) {
  const spark = item.spark?.price?.length ? item.spark.price : item.spark?.bubble;
  const sparkTone = item.spark?.price?.length ? 'price' : 'bubble';
  return (
    <article className={`price-card${item.updated ? ' quote-updated' : ''}`}>
      <Link href={href} className="price-card__main">
        <header className="price-card__head">
          <AssetMark symbol={item.symbol} category={item.category} />
          <span className="price-card__title">
            <strong>{item.name}</strong>
            <small>{item.unit}</small>
          </span>
          {item.bubble != null ? (
            <span className={`price-card__bubble ${item.bubble >= 0 ? 'is-up' : 'is-down'}`}>{formatBubblePercent(item.bubble)}</span>
          ) : null}
        </header>
        <div className="price-card__price">
          <bdi>{item.quote ? formatPrice(item.quote.sell, item.quote.currency) : '—'}</bdi>
        </div>
        {spark?.length ? <Sparkline values={spark} label="" tone={sparkTone} className="price-card__spark" /> : null}
        {item.quote ? (
          <footer className="price-card__foot">
            <RelativeTime value={item.quote.fetchedAt} />
          </footer>
        ) : null}
      </Link>
      {item.onToggleFavorite ? (
        <button type="button" className={`price-card__star${item.favorite ? ' is-on' : ''}`} aria-label={`نشان‌کردن ${item.name}`} aria-pressed={Boolean(item.favorite)} onClick={item.onToggleFavorite}>★</button>
      ) : null}
    </article>
  );
}

/** Minimal wide row for list mode. */
export function PriceListRow({ item, href }: { item: PriceCardModel; href: string }) {
  const spark = item.spark?.price?.length && item.spark.price.length >= 2 ? item.spark.price : undefined;
  return (
    <article className={`price-list-row${item.updated ? ' quote-updated' : ''}${spark ? ' has-spark' : ''}`}>
      <Link href={href} className="price-list-row__main">
        <span className="price-list-row__asset">
          <AssetMark symbol={item.symbol} category={item.category} />
          <span>
            <strong>{item.name}</strong>
            <small>{item.unit}</small>
          </span>
        </span>
        {spark ? (
          <span className="price-list-row__spark">
            <Sparkline values={spark} label="" tone="price" />
          </span>
        ) : null}
        <span className="price-list-row__price">
          <bdi>{item.quote ? formatPrice(item.quote.sell, item.quote.currency) : '—'}</bdi>
        </span>
        <span className="price-list-row__meta">
          {item.bubble != null
            ? <span className={`price-card__bubble ${item.bubble >= 0 ? 'is-up' : 'is-down'}`}>{formatBubblePercent(item.bubble)}</span>
            : null}
          {item.quote ? <small><RelativeTime value={item.quote.fetchedAt} /></small> : null}
        </span>
      </Link>
      {item.onToggleFavorite ? (
        <button type="button" className={`price-card__star${item.favorite ? ' is-on' : ''}`} aria-label={`نشان‌کردن ${item.name}`} aria-pressed={Boolean(item.favorite)} onClick={item.onToggleFavorite}>★</button>
      ) : null}
    </article>
  );
}

export function LayoutToggle({ value, onChange }: { value: 'cards' | 'list'; onChange: (next: 'cards' | 'list') => void }) {
  return (
    <div className="layout-toggle" role="group" aria-label="چیدمان نمایش">
      <button type="button" aria-pressed={value === 'cards'} className={value === 'cards' ? 'is-on' : ''} onClick={() => onChange('cards')}>
        <LayoutGrid size={16} /> باکس
      </button>
      <button type="button" aria-pressed={value === 'list'} className={value === 'list' ? 'is-on' : ''} onClick={() => onChange('list')}>
        <Rows3 size={16} /> لیست
      </button>
    </div>
  );
}
