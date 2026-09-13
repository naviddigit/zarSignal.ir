import { ArrowDownLeft, ArrowUpRight, Clock3 } from 'lucide-react';
import { formatPrice, type Quote } from '@/lib/market';

const symbols = ['USD', 'XAU_USD', 'GOLD_MELTED'] as const;
export function HeroTicker({ quotes, mode }: { quotes: Quote[]; mode: 'demo' | 'live' }) {
  const displayed = symbols.flatMap(symbol => quotes.filter(quote => quote.symbol === symbol));
  return <div className="hero-ticker" aria-label="خلاصهٔ بازار">{displayed.map((quote, index) => <div className="ticker-item" key={quote.symbol} style={{ animationDelay: `${index * 130}ms` }}><span className="ticker-symbol" dir="ltr">{quote.symbol.replace('_', ' / ')}</span><strong>{formatPrice(quote.sell, quote.currency)}</strong><span className="ticker-meta">{mode === 'demo' ? 'دادهٔ نمونه' : 'آخرین داده'} {index === 1 ? <ArrowUpRight size={13}/> : <ArrowDownLeft size={13}/>}</span></div>)}<span className="ticker-clock"><Clock3 size={14}/> به‌روزرسانی آرام و پیوسته</span></div>;
}
