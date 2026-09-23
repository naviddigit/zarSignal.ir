'use client';

import Link from 'next/link';
import { Clock3, LayoutGrid, Rows3 } from 'lucide-react';
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

/** Rich price box — landing chart-teaser spirit with more market fields. */
export function PriceCard({ item, href, dense = false }: { item: PriceCardModel; href: string; dense?: boolean }) {
  const same = item.quote && Number(item.quote.buy) === Number(item.quote.sell);
  const hasSpark = Boolean(item.spark?.price?.length);
  return (
    <article className={`price-card${item.updated ? ' quote-updated' : ''}${dense ? ' is-dense' : ''}${hasSpark ? ' has-spark' : ''}`}>
      <Link href={href} className="price-card__main">
        <header className="price-card__head">
          <AssetMark symbol={item.symbol} category={item.category} />
          <span className="price-card__title">
            <strong>{item.name}</strong>
            <small>{item.unit}{item.quote ? ` · ${item.quote.currency === 'USD' ? 'دلار' : 'تومان'}` : ''}</small>
          </span>
          {item.bubble != null ? (
            <span className={`price-card__bubble ${item.bubble >= 0 ? 'is-up' : 'is-down'}`}>{formatBubblePercent(item.bubble)}</span>
          ) : item.analysisLabel ? (
            <span className="price-card__bubble is-muted">{item.analysisLabel}</span>
          ) : null}
        </header>

        <div className="price-card__body">
          <div className="price-card__price">
            <bdi>{item.quote ? formatPrice(item.quote.sell, item.quote.currency) : '—'}</bdi>
            <small>{item.quote ? (same ? 'قیمت دیده‌بان · بدون اسپرد' : 'فروش') : 'در انتظار منبع'}</small>
            {item.quote && !same ? <em>خرید {formatPrice(item.quote.buy, item.quote.currency)}</em> : null}
          </div>
          <div className="price-card__sparks" aria-hidden={!hasSpark}>
            <Sparkline values={item.spark?.price ?? []} label="قیمت" tone="price" />
            {item.spark?.bubble?.length ? <Sparkline values={item.spark.bubble} label="حباب ٪" tone="bubble" /> : null}
          </div>
        </div>

        <footer className="price-card__foot">
          <span>
            <strong>زرسیگنال</strong>
            {item.quote ? <small><Clock3 size={12} /><RelativeTime value={item.quote.fetchedAt} /></small> : <small>بدون قیمت</small>}
          </span>
          <span className="price-card__cta">جزئیات</span>
        </footer>
      </Link>
      {item.onToggleFavorite ? (
        <button type="button" className={`price-card__star${item.favorite ? ' is-on' : ''}`} aria-label={`نشان‌کردن ${item.name}`} aria-pressed={Boolean(item.favorite)} onClick={item.onToggleFavorite}>
          ★
        </button>
      ) : null}
    </article>
  );
}

/** Wide list row with spark — replaces the old bare list. */
export function PriceListRow({ item, href }: { item: PriceCardModel; href: string }) {
  const same = item.quote && Number(item.quote.buy) === Number(item.quote.sell);
  return (
    <article className={`price-list-row${item.updated ? ' quote-updated' : ''}`}>
      <Link href={href} className="price-list-row__main">
        <span className="price-list-row__asset">
          <AssetMark symbol={item.symbol} category={item.category} />
          <span>
            <strong>{item.name}</strong>
            <small>{item.unit}</small>
          </span>
        </span>
        <span className="price-list-row__spark">
          <Sparkline values={item.spark?.price ?? []} label="روند" tone="price" />
        </span>
        <span className="price-list-row__price">
          <bdi>{item.quote ? formatPrice(item.quote.sell, item.quote.currency) : '—'}</bdi>
          <small>{item.quote ? (same ? 'دیده‌بان' : 'فروش') : '—'}</small>
          {item.quote && !same ? <em>خرید {formatPrice(item.quote.buy, item.quote.currency)}</em> : null}
        </span>
        <span className="price-list-row__meta">
          {item.bubble != null
            ? <span className={`price-card__bubble ${item.bubble >= 0 ? 'is-up' : 'is-down'}`}>{formatBubblePercent(item.bubble)}</span>
            : <span className="price-card__bubble is-muted">{item.analysisLabel ?? '—'}</span>}
          {item.quote ? <small><Clock3 size={11} /><RelativeTime value={item.quote.fetchedAt} /></small> : <small>بدون قیمت</small>}
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
