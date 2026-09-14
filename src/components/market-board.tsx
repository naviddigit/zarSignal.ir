'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpLeft, BadgeEuro, Clock3, Coins, Gem, Landmark, RefreshCw, Search, Star } from 'lucide-react';
import { formatPrice, instruments, type Snapshot, type Symbol } from '@/lib/market';

const iconBySymbol = { GOLD_MELTED: Coins, XAG_USD: Gem, USD: Landmark, EUR: BadgeEuro, AED: Landmark, XAU_USD: Coins } as const;
function AssetMark({ symbol, category }: { symbol: Symbol; category: string }) { const Icon = iconBySymbol[symbol]; return <span className={`market-asset-mark ${category}`}><Icon size={21}/></span>; }

export function MarketBoard({ initial }: { initial: Snapshot }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState<Symbol[]>([]);
  const [error, setError] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [updated, setUpdated] = useState<Symbol[]>([]);

  useEffect(() => { try { const value: unknown = JSON.parse(localStorage.getItem('zarsignal-favorites') ?? '[]'); if (Array.isArray(value)) setFavorites(value.filter((v): v is Symbol => instruments.some(asset => asset.symbol === v))); } catch {} }, []);
  useEffect(() => {
    const controller = new AbortController();
    const refresh = async () => {
      if (document.hidden) return;
      setRefreshing(true);
      try {
        const response = await fetch('/api/public/markets', { signal: controller.signal, cache: 'no-store' });
        if (!response.ok) throw new Error();
        const next: Snapshot = await response.json();
        setSnapshot(current => {
          const changed = next.quotes.filter(quote => { const previous = current.quotes.find(item => item.symbol === quote.symbol); return previous && (previous.buy !== quote.buy || previous.sell !== quote.sell); }).map(quote => quote.symbol);
          setUpdated(changed);
          if (changed.length) window.setTimeout(() => setUpdated([]), 1400);
          return next;
        });
        setError(false);
      } catch { if (!controller.signal.aborted) setError(true); }
      finally { setRefreshing(false); }
    };
    const interval = window.setInterval(refresh, Math.max(30, snapshot.pollSeconds ?? 60) * 1000);
    return () => { window.clearInterval(interval); controller.abort(); };
  }, [snapshot.pollSeconds]);

  function toggle(symbol: Symbol) { const next = favorites.includes(symbol) ? favorites.filter(item => item !== symbol) : [...favorites, symbol]; setFavorites(next); try { localStorage.setItem('zarsignal-favorites', JSON.stringify(next)); } catch {} }
  const assets = instruments.filter(asset => (category === 'all' || category === asset.category || category === 'favorites' && favorites.includes(asset.symbol)) && `${asset.name} ${asset.symbol}`.toLowerCase().includes(query.toLowerCase()));
  const live = snapshot.mode === 'live' && snapshot.quotes.length > 0;
  return <section id="markets" className="panel market-panel">
    <header className="market-heading"><div><span className="eyebrow">MARKET WATCH</span><h2>نبض بازار</h2><p>قیمت خرید و فروش، واحد، منبع و زمان دریافت در یک نمای شفاف.</p></div><div className={`feed-state ${live ? 'is-live' : 'is-offline'}`}><span/><strong>{live ? 'منبع داده متصل' : 'منبع زنده متصل نیست'}</strong><small><RefreshCw className={refreshing ? 'spin' : ''} size={12}/> بررسی دوره‌ای هر {new Intl.NumberFormat('fa-IR').format(snapshot.pollSeconds ?? 60)} ثانیه</small></div></header>
    <div className="market-toolbar"><div className="tabs">{[['all','همه'],['gold','طلا'],['silver','نقره'],['currency','ارز'],['favorites','منتخب']].map(([key,label]) => <button key={key} className={category === key ? 'selected' : ''} onClick={() => setCategory(key)} aria-pressed={category === key}>{label}</button>)}</div><label className="search"><Search size={17}/><input aria-label="جست‌وجوی بازار" placeholder="نام یا نماد دارایی" value={query} onChange={event => setQuery(event.target.value)}/></label></div>
    <div className="source-disclosure" role="status"><strong>{error ? 'به‌روزرسانی ناموفق بود' : live ? 'آخرین دادهٔ ثبت‌شده' : 'قیمت نمایشی حذف شده است'}</strong><span>{live ? 'زمان و منبع مستقل هر ردیف را بررسی کنید.' : 'تا دریافت موفق از منبع معتبر، هیچ عددی به عنوان قیمت بازار نمایش داده نمی‌شود.'}</span></div>
    <div className="table-scroll"><table className="market-table"><thead><tr><th>دارایی</th><th>فروش</th><th>خرید</th><th>منبع و زمان</th><th>تحلیل</th><th aria-label="علاقه‌مندی"/></tr></thead><tbody>{assets.map(asset => { const quote = snapshot.quotes.find(item => item.symbol === asset.symbol); return <tr className={updated.includes(asset.symbol) ? 'quote-updated' : ''} key={asset.symbol}><td><Link className="asset-name" href={`/markets/${asset.symbol.toLowerCase()}`}><AssetMark symbol={asset.symbol} category={asset.category}/><span><strong>{asset.name}</strong><small>{asset.unit}</small></span></Link></td><td className="price-cell"><strong>{quote ? formatPrice(quote.sell, quote.currency) : '—'}</strong><small>{quote ? 'قیمت فروش' : 'در انتظار منبع'}</small></td><td className="price-cell"><strong>{quote ? formatPrice(quote.buy, quote.currency) : '—'}</strong><small>{quote ? 'قیمت خرید' : 'در انتظار منبع'}</small></td><td>{quote ? <div className="quote-source"><a href={quote.sourceUrl ?? '#'} target="_blank" rel="noreferrer">{quote.source}</a><small><Clock3 size={11}/>{new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Tehran' }).format(new Date(quote.observedAt))}</small></div> : <span className="no-source">متصل نیست</span>}</td><td><span className="status-pill">در انتظار فرمول</span></td><td><button className="icon-button" onClick={() => toggle(asset.symbol)} aria-label={`نشان‌کردن ${asset.name}`} aria-pressed={favorites.includes(asset.symbol)}><Star size={18} fill={favorites.includes(asset.symbol) ? 'currentColor' : 'none'}/></button></td></tr>; })}</tbody></table>{!assets.length && <p className="empty-state">دارایی‌ای با این عبارت پیدا نشد.</p>}</div>
    <footer className="table-footer"><span>هر عدد همراه واحد، منبع و زمان</span><Link href="/methodology">روش کنترل کیفیت داده <ArrowUpLeft size={14}/></Link></footer>
  </section>;
}
