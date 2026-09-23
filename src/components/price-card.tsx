'use client';

import Link from 'next/link';
import { LayoutGrid, Rows3, Star } from 'lucide-react';
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

function resolveSpark(item: PriceCardModel) {
  if (item.spark?.price && item.spark.price.length >= 2) return { values: item.spark.price, tone: 'price' as const };
  if (item.spark?.bubble && item.spark.bubble.length >= 2) return { values: item.spark.bubble, tone: 'bubble' as const };
  return null;
}

function FavoriteStar({ name, on, onToggle }: { name: string; on?: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className={`price-fav${on ? ' is-on' : ''}`}
      aria-label={`نشان‌کردن ${name}`}
      aria-pressed={Boolean(on)}
      onClick={event => {
        event.preventDefault();
        event.stopPropagation();
        onToggle();
      }}
    >
      <Star size={16} fill={on ? 'currentColor' : 'none'} strokeWidth={2} />
    </button>
  );
}

/** Box: content + compact spark in last (left) column. */
export function PriceCard({ item, href }: { item: PriceCardModel; href: string }) {
  const spark = resolveSpark(item);
  const hasFav = Boolean(item.onToggleFavorite);
  return (
    <article className={`price-card${item.updated ? ' quote-updated' : ''}${hasFav ? ' has-fav' : ''}`}>
      <Link href={href} className="price-card__main">
        <div className="price-card__body">
          <header className="price-card__head">
            <AssetMark symbol={item.symbol} category={item.category} />
            <span className="price-card__title">
              <strong>{item.name}</strong>
              <small>{item.unit}</small>
            </span>
          </header>
          <div className="price-card__price">
            <bdi>{item.quote ? formatPrice(item.quote.sell, item.quote.currency) : '—'}</bdi>
          </div>
          <footer className="price-card__foot">
            <span className="price-card__bubble-slot">
              {item.bubble != null ? (
                <span className={`price-card__bubble ${item.bubble >= 0 ? 'is-up' : 'is-down'}`}>{formatBubblePercent(item.bubble)}</span>
              ) : null}
            </span>
            {item.quote ? <RelativeTime value={item.quote.fetchedAt} /> : <span className="price-card__time-slot" aria-hidden="true" />}
          </footer>
        </div>
        <aside className="price-card__side">
          {hasFav && item.onToggleFavorite ? (
            <FavoriteStar name={item.name} on={item.favorite} onToggle={item.onToggleFavorite} />
          ) : null}
          <span className="price-card__spark" aria-hidden={!spark}>
            {spark ? <Sparkline values={spark.values} label="" tone={spark.tone} compact /> : null}
          </span>
        </aside>
      </Link>
    </article>
  );
}

/** Columns: asset | price | change+time | spark | star — all in-flow. */
export function PriceListRow({ item, href }: { item: PriceCardModel; href: string }) {
  const spark = resolveSpark(item);
  const hasFav = Boolean(item.onToggleFavorite);
  return (
    <article className={`price-list-row${item.updated ? ' quote-updated' : ''}${hasFav ? ' has-fav' : ''}`}>
      <Link href={href} className="price-list-row__main">
        <span className="price-list-row__asset">
          <AssetMark symbol={item.symbol} category={item.category} />
          <span>
            <strong>{item.name}</strong>
            <small>{item.unit}</small>
          </span>
        </span>

        <span className="price-list-row__price">
          <bdi>{item.quote ? formatPrice(item.quote.sell, item.quote.currency) : '—'}</bdi>
        </span>

        <span className="price-list-row__meta">
          <span className="price-card__bubble-slot">
            {item.bubble != null ? (
              <span className={`price-card__bubble ${item.bubble >= 0 ? 'is-up' : 'is-down'}`}>{formatBubblePercent(item.bubble)}</span>
            ) : null}
          </span>
          {item.quote ? <small><RelativeTime value={item.quote.fetchedAt} /></small> : <small className="is-empty" aria-hidden="true" />}
        </span>

        <span className="price-list-row__spark" aria-hidden={!spark}>
          {spark ? <Sparkline values={spark.values} label="" tone={spark.tone} compact /> : null}
        </span>
      </Link>
      {hasFav && item.onToggleFavorite ? (
        <div className="price-list-row__fav">
          <FavoriteStar name={item.name} on={item.favorite} onToggle={item.onToggleFavorite} />
        </div>
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
