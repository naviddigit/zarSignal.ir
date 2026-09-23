'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpLeft, RefreshCw, Search } from 'lucide-react';
import { fetchJson } from '@/lib/fetch-json';
import { instruments, type Snapshot, type Symbol } from '@/lib/market';
import type { LiveBubbleCard } from '@/lib/bubbles';
import { RelativeTime } from '@/components/relative-time';
import { LayoutToggle, PriceCard, PriceListRow } from '@/components/price-card';
import { useMarketSparks } from '@/components/use-market-sparks';

export { AssetMark } from '@/components/asset-mark';

function analysisFor(symbol: Symbol, bubbles: LiveBubbleCard[]) {
  const key =
    symbol === 'GOLD_MELTED' || symbol === 'GOLD_18K' ? 'GOLD_BUBBLE'
      : symbol === 'USD' ? 'USD_BUBBLE'
        : symbol === 'SILVER_999' || symbol === 'XAG_USD' ? 'SILVER_BUBBLE'
          : null;
  if (!key) return null;
  return bubbles.find(item => item.key === key) ?? null;
}

function bubbleValue(symbol: Symbol, bubbles: LiveBubbleCard[]) {
  const analysis = analysisFor(symbol, bubbles);
  if (!analysis || analysis.percent == null || (analysis.status !== 'ok' && analysis.status !== 'stale')) return null;
  return analysis.percent;
}

function analysisLabel(symbol: Symbol, bubbles: LiveBubbleCard[]) {
  const analysis = analysisFor(symbol, bubbles);
  if (!analysis) return null;
  if (analysis.status === 'blocked') return 'قفل Spec';
  if (analysis.percent == null) return 'در انتظار داده';
  return null;
}

/** Price board — default attractive cards, optional list layout. */
export function MarketBoard({ initial, bubbles = [] }: { initial: Snapshot; bubbles?: LiveBubbleCard[] }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [layout, setLayout] = useState<'cards' | 'list'>('cards');
  const [favorites, setFavorites] = useState<Symbol[]>([]);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [updated, setUpdated] = useState<Symbol[]>([]);
  useEffect(() => { setSnapshot(initial); }, [initial]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('zarsignal-market-layout');
      if (saved === 'cards' || saved === 'list') setLayout(saved);
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

  function changeLayout(next: 'cards' | 'list') {
    setLayout(next);
    try { localStorage.setItem('zarsignal-market-layout', next); } catch { /* ignore */ }
  }

  const assets = instruments.filter(asset =>
    (category === 'all' || category === asset.category || (category === 'favorites' && favorites.includes(asset.symbol))) &&
    `${asset.name} ${asset.symbol}`.toLowerCase().includes(query.toLowerCase()),
  );
  const sparks = useMarketSparks(assets.map(asset => asset.symbol));
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
          <p>باکس‌های خوانا به‌صورت پیش‌فرض؛ در صورت نیاز به نمای لیست بروید.</p>
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
        <div className="market-toolbar__end">
          <LayoutToggle value={layout} onChange={changeLayout} />
          <label className="search">
            <Search size={17} />
            <input aria-label="جست‌وجوی بازار" placeholder="نام یا نماد دارایی" value={query} onChange={event => setQuery(event.target.value)} />
          </label>
        </div>
      </div>

      <div className={`source-disclosure ${fresh ? 'is-live' : stale ? 'is-stale' : ''}`} role="status">
        <strong>{error ? 'به‌روزرسانی ناموفق بود' : fresh ? 'داده زنده ثبت شده' : stale ? 'قیمت‌ها قدیمی‌اند' : 'قیمت نمایشی حذف شده است'}</strong>
        <span>{fresh ? 'زمان دریافت هر ردیف مشخص است.' : stale ? 'آخرین قیمت ثبت‌شده نمایش داده می‌شود؛ تا دریافت تازه، این اعداد قیمت لحظه‌ای نیستند.' : 'تا دریافت موفق از منبع معتبر، هیچ عددی به عنوان قیمت بازار نمایش داده نمی‌شود.'}</span>
      </div>

      {layout === 'cards' ? (
        <div className="price-card-grid">
          {assets.map(asset => {
            const quote = snapshot.quotes.find(item => item.symbol === asset.symbol);
            return (
              <PriceCard
                key={asset.symbol}
                href={`/markets/${asset.symbol.toLowerCase()}`}
                item={{
                  symbol: asset.symbol,
                  name: asset.name,
                  unit: asset.unit,
                  category: asset.category,
                  quote,
                  bubble: bubbleValue(asset.symbol, bubbles),
                  analysisLabel: analysisLabel(asset.symbol, bubbles),
                  spark: sparks[asset.symbol],
                  updated: updated.includes(asset.symbol),
                  favorite: favorites.includes(asset.symbol),
                  onToggleFavorite: () => toggle(asset.symbol),
                }}
              />
            );
          })}
          {!assets.length && <p className="empty-state">دارایی‌ای با این عبارت پیدا نشد.</p>}
        </div>
      ) : (
        <div className="price-list-board">
          {assets.map(asset => {
            const quote = snapshot.quotes.find(item => item.symbol === asset.symbol);
            return (
              <PriceListRow
                key={asset.symbol}
                href={`/markets/${asset.symbol.toLowerCase()}`}
                item={{
                  symbol: asset.symbol,
                  name: asset.name,
                  unit: asset.unit,
                  category: asset.category,
                  quote,
                  bubble: bubbleValue(asset.symbol, bubbles),
                  analysisLabel: analysisLabel(asset.symbol, bubbles),
                  spark: sparks[asset.symbol],
                  updated: updated.includes(asset.symbol),
                  favorite: favorites.includes(asset.symbol),
                  onToggleFavorite: () => toggle(asset.symbol),
                }}
              />
            );
          })}
          {!assets.length && <p className="empty-state">دارایی‌ای با این عبارت پیدا نشد.</p>}
        </div>
      )}

      <footer className="table-footer">
        <span>هر عدد همراه واحد، منبع و زمان</span>
        <Link href="/methodology">روش کنترل کیفیت داده <ArrowUpLeft size={14} /></Link>
      </footer>
    </section>
  );
}
