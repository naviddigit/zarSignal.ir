import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { instruments } from '@/lib/market';
import { ChartWorkspace } from '@/components/chart-workspace';

type Props = { params: Promise<{ symbol: string }> };
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { symbol } = await params;
  const asset = instruments.find(a => a.symbol.toLowerCase() === symbol);
  return { title: asset ? `نمودار قیمت و تاریخچه ${asset.name}` : 'نمودار بازار', description: 'نمودار قیمت با محور تاریخ و قیمت، محاسبات تاریخی روزانه و روش شفاف. بازه کوتاه رایگان و تاریخچه عمیق با اشتراک.', alternates: { canonical: `/charts/${symbol}` } };
}
export default async function ChartPage({ params }: Props) {
  const { symbol } = await params;
  const asset = instruments.find(a => a.symbol.toLowerCase() === symbol);
  if (!asset) notFound();
  return <main id="main" className="shell content-page"><nav className="chart-breadcrumb"><Link href="/">زرسیگنال</Link><span>/</span><Link href="/charts">نمودارها</Link><span>/ {asset.name}</span></nav><h1>نمودار {asset.name}</h1><p className="lead">قیمت و فاصله از ارزش محاسباتی را روی یک محور زمان بررسی کنید.</p><nav className="chart-symbols" aria-label="انتخاب نماد">{instruments.map(a => <Link key={a.symbol} href={`/charts/${a.symbol.toLowerCase()}`} aria-current={a.symbol === asset.symbol ? 'page' : undefined}>{a.name}</Link>)}</nav><ChartWorkspace symbol={asset.symbol}/><p><Link href={`/markets/${symbol}`}>قیمت و مشخصات این بازار ←</Link></p></main>;
}
