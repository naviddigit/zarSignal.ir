'use client';

import Link from 'next/link';
import { Clock3, LayoutGrid, Rows3 } from 'lucide-react';
import { formatPrice, type Quote, type Symbol as MarketSymbol } from '@/lib/market';
import { RelativeTime } from '@/components/relative-time';
import { AssetMark } from '@/components/asset-mark';

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
  updated?: boolean;
  favorite?: boolean;
  onToggleFavorite?: () => void;
};

/** Attractive price box used by homepage teaser and /markets board. */
export function PriceCard({ item, href }: { item: PriceCardModel; href: string }) {
  const same = item.quote && Number(item.quote.buy) === Number(item.quote.sell);
  return (
    <article className={`price-card${item.updated ? ' quote-updated' : ''}`}>
      <Link href={href} className="price-card__main">
        <header className="price-card__head">
          <AssetMark symbol={item.symbol} category={item.category} />
          <span>
            <strong>{item.name}</strong>
            <small>{item.unit}</small>
          </span>
          {item.bubble != null ? (
            <span className={`price-card__bubble ${item.bubble >= 0 ? 'is-up' : 'is-down'}`}>{formatBubblePercent(item.bubble)}</span>
          ) : null}
        </header>
        <div className="price-card__price">
          <bdi>{item.quote ? formatPrice(item.quote.sell, item.quote.currency) : '—'}</bdi>
          <small>{item.quote ? (same ? 'قیمت دیده‌بان' : 'فروش') : 'در انتظار منبع'}</small>
        </div>
        {item.quote && !same ? <em className="price-card__buy">خرید {formatPrice(item.quote.buy, item.quote.currency)}</em> : null}
        <footer className="price-card__foot">
          {item.quote ? <small><Clock3 size={12} /><RelativeTime value={item.quote.fetchedAt} /></small> : <small>بدون قیمت</small>}
        </footer>
      </Link>
      {item.onToggleFavorite ? (
        <button type="button" className={`price-card__star${item.favorite ? ' is-on' : ''}`} aria-label={`نشان‌کردن ${item.name}`} aria-pressed={item.favorite} onClick={item.onToggleFavorite}>
          ★
        </button>
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
