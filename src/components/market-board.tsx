'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpLeft, Search, Star, RefreshCw, SlidersHorizontal } from 'lucide-react';
import { formatPrice, instruments, type Snapshot, type Symbol } from '@/lib/market';
export function MarketBoard({ initial }: { initial: Snapshot }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [category, setCategory] = useState('all');
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState<Symbol[]>([]);
  const [error, setError] = useState(false);
  useEffect(() => { try { const value: unknown = JSON.parse(localStorage.getItem('zarsignal-favorites') ?? '[]'); if (Array.isArray(value)) setFavorites(value.filter((v): v is Symbol => instruments.some(a => a.symbol === v))); } catch {} }, []);
  useEffect(() => {
    const controller = new AbortController();
    const interval = setInterval(async () => {
      if (document.hidden) return;
      try { const response = await fetch('/api/public/markets', { signal: controller.signal }); if (!response.ok) throw new Error(); setSnapshot(await response.json()); setError(false); } catch { if (!controller.signal.aborted) setError(true); }
    }, 60_000);
    return () => { clearInterval(interval); controller.abort(); };
  }, []);
  function toggle(symbol: Symbol) { const next = favorites.includes(symbol) ? favorites.filter(s => s !== symbol) : [...favorites, symbol]; setFavorites(next); try { localStorage.setItem('zarsignal-favorites', JSON.stringify(next)); } catch {} }
  const assets = instruments.filter(a => (category === 'all' || category === a.category || category === 'favorites' && favorites.includes(a.symbol)) && `${a.name} ${a.symbol}`.toLowerCase().includes(query.toLowerCase()));
  return <section id="markets" className="panel market-panel">
    <div className="section-heading"><div><span className="eyebrow">MARKET WATCH</span><h2>نبض بازار</h2></div><span className="muted small"><RefreshCw size={13}/> بررسی هر ۶۰ ثانیه</span></div>
    <div className="market-toolbar"><div className="tabs">{[['all','همهٔ بازارها'],['gold','طلا'],['silver','نقره'],['currency','ارز'],['favorites','نشان‌شده‌ها']].map(([key,label]) => <button key={key} className={category === key ? 'selected' : ''} onClick={() => setCategory(key)} aria-pressed={category === key}>{label}</button>)}</div><label className="search"><Search size={16}/><input aria-label="جستجوی بازار" placeholder="جستجوی نماد..." value={query} onChange={e => setQuery(e.target.value)}/></label></div>
    <p className="data-note" role="status">{error ? 'ارتباط به‌روز نشد؛ آخرین دادهٔ دریافت‌شده نمایش داده می‌شود.' : snapshot.mode === 'demo' ? 'داده‌های این پیش‌نمایش نمونه‌اند و قیمت جاری بازار نیستند.' : snapshot.status === 'ok' ? 'قیمت‌ها از آخرین دریافت ثبت‌شده نمایش داده می‌شوند.' : 'داده‌ها ناقص، قدیمی یا در دسترس نیستند؛ زمان هر نماد را بررسی کنید.'}</p>
    <div className="table-scroll"><table><thead><tr><th>دارایی</th><th>قیمت فروش</th><th>قیمت خرید</th><th>وضعیت تحلیل</th><th>زمان مشاهده</th><th><SlidersHorizontal size={15}/><span className="sr-only">عملیات</span></th></tr></thead><tbody>{assets.map(asset => { const quote = snapshot.quotes.find(q => q.symbol === asset.symbol); return <tr key={asset.symbol}><td><Link className="asset-name" href={`/markets/${asset.symbol.toLowerCase()}`}><span className={`asset-icon ${asset.category}`}>{asset.symbol === 'USD' ? '$' : asset.symbol === 'EUR' ? '€' : asset.category === 'gold' ? 'Au' : asset.category === 'silver' ? 'Ag' : 'د'}</span><span><strong>{asset.name}</strong><small dir="ltr">{asset.symbol.replaceAll('_',' / ')}</small></span></Link></td><td className="price">{quote ? formatPrice(quote.sell, quote.currency) : 'در انتظار داده'}<small>هر {asset.unit}</small></td><td className="price muted">{quote ? formatPrice(quote.buy, quote.currency) : '—'}</td><td><span className="status-pill">در انتظار فرمول</span></td><td className="muted small">{snapshot.mode === 'demo' ? 'نمونهٔ نمایشی' : quote ? new Intl.DateTimeFormat('fa-IR', { dateStyle: 'short', timeStyle: 'short', timeZone: 'Asia/Tehran' }).format(new Date(quote.observedAt)) : '—'}</td><td><button className="icon-button" onClick={() => toggle(asset.symbol)} aria-label={`نشان‌کردن ${asset.name}`} aria-pressed={favorites.includes(asset.symbol)}><Star size={17} fill={favorites.includes(asset.symbol) ? 'currentColor' : 'none'}/></button></td></tr>; })}</tbody></table>{!assets.length && <p className="empty-state">نمادی پیدا نشد. جستجو یا فیلتر را تغییر بدهید.</p>}</div>
    <div className="table-footer"><span>قیمت‌ها با تفکیک واحد و منبع</span><Link href="/methodology">روش محاسبه و کیفیت داده <ArrowUpLeft size={14}/></Link></div>
  </section>;
}
