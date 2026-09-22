import type { Metadata } from 'next';
import Link from 'next/link';
import { instruments } from '@/lib/market';
export const metadata: Metadata = { title: 'نمودارهای قیمت و حباب', alternates: { canonical: '/charts' } };
export default function Charts() {
  return <main id="main" className="shell content-page"><span className="eyebrow">MARKET CHARTS</span><h1>نمودارهای زرسیگنال</h1><p className="lead">یک بازار را انتخاب کنید؛ بازه کوتاه رایگان، تاریخچه روزانه عمیق با اشتراک.</p><div className="chart-hub">{instruments.map(asset => <Link className="panel" key={asset.symbol} href={`/charts/${asset.symbol.toLowerCase()}`}><h2>{asset.name}</h2><p>{asset.unit} · {asset.currency === 'USD' ? 'دلار' : 'تومان'}</p><span>مشاهده چارت کامل ←</span></Link>)}</div></main>;
}
