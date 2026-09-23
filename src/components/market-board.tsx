'use client';

import { fetchJson } from '@/lib/fetch-json';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpLeft, Clock3, Coins, Gem, Landmark, RefreshCw, Search, Star } from 'lucide-react';
import { formatPrice, instruments, type Snapshot, type Symbol } from '@/lib/market';
import type { LiveBubbleCard } from '@/lib/bubbles';
import { RelativeTime } from '@/components/relative-time';

const iconBySymbol: Record<Symbol, typeof Coins> = {
  GOLD_MELTED: Coins,
  GOLD_18K: Coins,
  XAU_USD: Coins,
  XAG_USD: Gem,
  SILVER_999: Gem,
  USD: Landmark,
  AED: Landmark,
  SEKE_CASH: Coins,
  ROB_SEKE: Coins,
};

export function AssetMark({ symbol, category }: { symbol: Symbol; category: string }) {
  const Icon = iconBySymbol[symbol];
  return <span className={`market-asset-mark ${category}`} aria-hidden="true"><Icon size={20} /></span>;
}

function formatBubblePercent(value: number) {
  const sign = value > 0 ? '+' : '';
  return `${sign}${new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2, minimumFractionDigits: 2 }).format(value)}٪`;
}

function analysisFor(symbol: Symbol, bubbles: LiveBubbleCard[]) {
  const key =
    symbol === 'GOLD_MELTED' || symbol === 'GOLD_18K' ? 'GOLD_BUBBLE'
      : symbol === 'USD' ? 'USD_BUBBLE'
        : symbol === 'SILVER_999' || symbol === 'XAG_USD' ? 'SILVER_BUBBLE'
          : null;
  if (!key) return null;
  return bubbles.find(item => item.key === key) ?? null;
}

/** Window-style price board — one readable column of rows, not a dense data grid. */
export function MarketBoard({ initial, bubbles = [] }: { initial: Snapshot; bubbles?: LiveBubbleCard[] }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState<Symbol[]>([]);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [updated, setUpdated] = useState<Symbol[]>([]);
  useEffect(() => { setSnapshot(initial); }, [initial]);

  useEffect(() => {
    try {
      const value: unknown = JSON.parse(localStorage.getItem('zarsignal-favorites') ?? '[]');
      if (Array.isArray(value)) setFavorites(value.filter((item): item is Symbol => instruments.some(asset => asset.symbol === item)));
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    const refresh = async () => {
      if (document.hidden) return;
      setRefreshing(true);
      try {
        const next = await fetchJson<Snapshot>('/api/public/markets', controller.signal, 10_000);
        setSnapshot(current => {
          const changed = next.quotes.filter(quote => {
            const previous = current.quotes.find(item => item.symbol === quote.symbol);
            return previous && (previous.buy !== quote.buy || previous.sell !== quote.sell);
          }).map(quote => quote.symbol);
          setUpdated(changed);
          if (changed.length) window.setTimeout(() => setUpdated([]), 1400);
          return next;
        });
        setError(false);
      } catch { if (!controller.signal.aborted) setError(true); }
      finally { setRefreshing(false); }
    };
    void refresh();
    const interval = window.setInterval(refresh, Math.max(30, snapshot.pollSeconds ?? 60) * 1000);
    return () => { window.clearInterval(interval); controller.abort(); };
  }, [snapshot.pollSeconds]);

  function toggle(symbol: Symbol) {
    const next = favorites.includes(symbol) ? favorites.filter(item => item !== symbol) : [...favorites, symbol];
    setFavorites(next);
    try { localStorage.setItem('zarsignal-favorites', JSON.stringify(next)); } catch { /* ignore */ }
  }

  const assets = instruments.filter(asset =>
    (category === 'all' || category === asset.category || (category === 'favorites' && favorites.includes(asset.symbol))) &&
    `${asset.name} ${asset.symbol}`.toLowerCase().includes(query.toLowerCase()),
  );
  const hasQuotes = snapshot.mode === 'live' && snapshot.quotes.length > 0;
  const fresh = hasQuotes && snapshot.status === 'ok';
  const stale = hasQuotes && snapshot.status === 'stale';
  const latestFetch = snapshot.quotes.reduce<string | null>((latest, quote) => !latest || quote.fetchedAt > latest ? quote.fetchedAt : latest, null);

  return (
    <section id="markets" className="panel market-panel market-board-window">
      <header className="market-heading">
        <div>
          <span className="eyebrow">WATCH BOARD</span>
          <h2>تخته نمایش قیمت‌ها</h2>
          <p>هر ردیف یک دارایی — قیمت بزرگ، زمان دریافت و تحلیل در یک نگاه.</p>
        </div>
        <div className={`feed-state ${fresh ? 'is-live' : stale ? 'is-stale' : 'is-offline'}`}>
          <span />
          <strong>{fresh ? 'منبع داده متصل' : stale ? 'داده قدیمی — نیاز به دریافت تازه' : 'منبع زنده متصل نیست'}</strong>
          <small>
            <RefreshCw className={refreshing ? 'spin' : ''} size={12} />
            {latestFetch ? <RelativeTime value={latestFetch} prefix="آخرین دریافت: " /> : `بررسی هر ${new Intl.NumberFormat('fa-IR').format(snapshot.pollSeconds ?? 60)} ثانیه`}
          </small>
        </div>
      </header>

      <div className="market-toolbar">
        <div className="tabs" role="tablist" aria-label="دسته‌بندی بازار">
          {([['all', 'همه'], ['gold', 'طلا'], ['silver', 'نقره'], ['currency', 'ارز'], ['favorites', 'منتخب']] as const).map(([key, label]) => (
            <button key={key} type="button" className={category === key ? 'selected' : ''} onClick={() => setCategory(key)} aria-pressed={category === key}>{label}</button>
          ))}
        </div>
        <label className="search">
          <Search size={17} />
          <input aria-label="جست‌وجوی بازار" placeholder="نام یا نماد دارایی" value={query} onChange={event => setQuery(event.target.value)} />
        </label>
      </div>

      <div className={`source-disclosure ${fresh ? 'is-live' : stale ? 'is-stale' : ''}`} role="status">
        <strong>{error ? 'به‌روزرسانی ناموفق بود' : fresh ? 'داده زنده ثبت شده' : stale ? 'قیمت‌ها قدیمی‌اند' : 'قیمت نمایشی حذف شده است'}</strong>
        <span>{fresh ? 'زمان دریافت هر ردیف مشخص است.' : stale ? 'آخرین قیمت ثبت‌شده نمایش داده می‌شود؛ تا دریافت تازه، این اعداد قیمت لحظه‌ای نیستند.' : 'تا دریافت موفق از منبع معتبر، هیچ عددی به عنوان قیمت بازار نمایش داده نمی‌شود.'}</span>
      </div>

      <div className="market-board-list" role="list">
        <div className="market-board-list__head" aria-hidden="true">
          <span>دارایی</span>
          <span>قیمت دیده‌بان</span>
          <span>تحلیل</span>
          <span>زمان</span>
        </div>
        {assets.map(asset => {
          const quote = snapshot.quotes.find(item => item.symbol === asset.symbol);
          const analysis = analysisFor(asset.symbol, bubbles);
          const ready = analysis && (analysis.status === 'ok' || analysis.status === 'stale') && analysis.percent != null;
          const same = quote && Number(quote.buy) === Number(quote.sell);
          return (
            <article
              role="listitem"
              key={asset.symbol}
              className={`market-board-row${updated.includes(asset.symbol) ? ' quote-updated' : ''}`}
            >
              <Link className="market-board-row__asset" href={`/markets/${asset.symbol.toLowerCase()}`}>
                <AssetMark symbol={asset.symbol} category={asset.category} />
                <span>
                  <strong>{asset.name}</strong>
                  <small>{asset.unit}</small>
                </span>
              </Link>
              <div className="market-board-row__price">
                <bdi>{quote ? formatPrice(quote.sell, quote.currency) : '—'}</bdi>
                <small>{quote ? (same ? 'قیمت دیده‌بان · بدون اسپرد' : 'فروش') : 'در انتظار منبع'}</small>
                {quote && !same ? <em>خرید {formatPrice(quote.buy, quote.currency)}</em> : null}
              </div>
              <div className="market-board-row__analysis">
                {!analysis ? <span className="status-pill">—</span>
                  : analysis.status === 'blocked' ? <span className="status-pill is-blocked">قفل Spec</span>
                    : ready ? <span className={`status-pill is-bubble ${analysis.percent! >= 0 ? 'is-up' : 'is-down'}`}>{formatBubblePercent(analysis.percent!)}</span>
                      : <span className="status-pill">در انتظار داده</span>}
              </div>
              <div className="market-board-row__meta">
                {quote ? (
                  <>
                    <strong>زرسیگنال</strong>
                    <small><Clock3 size={12} /><RelativeTime value={quote.fetchedAt} /></small>
                  </>
                ) : <span className="no-source">متصل نیست</span>}
                <button type="button" className="icon-button" onClick={() => toggle(asset.symbol)} aria-label={`نشان‌کردن ${asset.name}`} aria-pressed={favorites.includes(asset.symbol)}>
                  <Star size={18} fill={favorites.includes(asset.symbol) ? 'currentColor' : 'none'} />
                </button>
              </div>
            </article>
          );
        })}
        {!assets.length && <p className="empty-state">دارایی‌ای با این عبارت پیدا نشد.</p>}
      </div>

      <footer className="table-footer">
        <span>هر عدد همراه واحد، منبع و زمان</span>
        <Link href="/methodology">روش کنترل کیفیت داده <ArrowUpLeft size={14} /></Link>
      </footer>
    </section>
  );
}
