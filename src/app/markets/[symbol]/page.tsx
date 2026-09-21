import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowUpLeft, Calculator, Clock3, Database, Info, Scale, ShieldCheck } from 'lucide-react';
import { AssetMark } from '@/components/market-board';
import { RelativeTime } from '@/components/relative-time';
import { FaqAccordion } from '@/components/faq-accordion';
import { JsonLd } from '@/components/json-ld';
import { SymbolHistoryChart } from '@/components/symbol-history-chart';
import { formatPrice, instruments } from '@/lib/market';
import { getPublicSnapshot } from '@/server/quotes';

type Props = { params: Promise<{ symbol: string }> };

export function generateStaticParams() { return instruments.map(asset => ({ symbol: asset.symbol.toLowerCase() })); }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { symbol } = await params;
  const asset = instruments.find(item => item.symbol.toLowerCase() === symbol);
  if (!asset) return {};
  return {
    title: `قیمت لحظه‌ای ${asset.name} | خرید و فروش`,
    description: `${asset.description} مشاهده قیمت خرید، قیمت فروش، واحد، منبع و زمان آخرین دریافت در زر‌سیگنال.`,
    keywords: [`قیمت ${asset.name}`, `قیمت لحظه‌ای ${asset.name}`, `خرید ${asset.name}`, `فروش ${asset.name}`, asset.symbol, 'زرسیگنال'],
    alternates: { canonical: `/markets/${symbol}` },
    openGraph: { title: `قیمت ${asset.name}`, description: asset.description, url: `/markets/${symbol}`, type: 'website' },
  };
}

export default async function AssetPage({ params }: Props) {
  const { symbol } = await params;
  const asset = instruments.find(item => item.symbol.toLowerCase() === symbol);
  if (!asset) notFound();
  const snapshot = await getPublicSnapshot();
  const quote = snapshot.quotes.find(item => item.symbol === asset.symbol);
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://zarsignal.ir';
  const url = `${siteUrl}/markets/${symbol}`;
  const related = instruments.filter(item => item.symbol !== asset.symbol && item.category === asset.category).slice(0, 3);
  const faq = [
    { question: `قیمت ${asset.name} از کجا می‌آید؟`, answer: quote ? 'قیمت از لایه دادهٔ زر‌سیگنال می‌آید و زمان دریافت کنار آن نمایش داده می‌شود.' : 'تا اتصال موفق منبع، زر‌سیگنال عددی را به‌عنوان قیمت جاری نمایش نمی‌دهد.' },
    { question: `واحد قیمت ${asset.name} چیست؟`, answer: `هر عدد این صفحه برای یک ${asset.unit} و با ارز ${asset.currency === 'TMN' ? 'تومان' : 'دلار آمریکا'} نمایش داده می‌شود.` },
    { question: 'آیا این صفحه پیشنهاد خرید یا فروش می‌دهد؟', answer: 'خیر. این صفحه داده مشاهده‌شده را نشان می‌دهد. تحلیل حباب فقط با فرمول تأییدشده فعال می‌شود.' },
  ];

  return <main id="main" className="shell asset-page">
    <JsonLd data={{ '@context': 'https://schema.org', '@type': 'Dataset', name: `قیمت ${asset.name}`, description: asset.description, url, inLanguage: 'fa-IR', temporalCoverage: quote?.observedAt, variableMeasured: ['قیمت خرید', 'قیمت فروش', 'زمان دریافت'], creator: { '@type': 'Organization', name: 'زرسیگنال', url: siteUrl } }}/>
    <JsonLd data={{ '@context': 'https://schema.org', '@type': 'BreadcrumbList', itemListElement: [{ '@type': 'ListItem', position: 1, name: 'زرسیگنال', item: siteUrl }, { '@type': 'ListItem', position: 2, name: 'بازارها', item: `${siteUrl}/#markets` }, { '@type': 'ListItem', position: 3, name: asset.name, item: url }] }}/>
    <nav className="asset-breadcrumb" aria-label="مسیر صفحه"><Link href="/">زرسیگنال</Link><span>/</span><Link href="/#markets">بازارها</Link><span>/</span><strong>{asset.name}</strong></nav>

    <header className="asset-hero">
      <div className="asset-identity"><AssetMark symbol={asset.symbol} category={asset.category}/><div><span className="eyebrow" dir="ltr">{asset.symbol.replaceAll('_', ' / ')}</span><h1>قیمت {asset.name}</h1><p>{asset.description}</p></div></div>
      <div className={`asset-live-state ${quote ? 'is-live' : ''}`}><span/><strong>{quote ? 'داده متصل' : 'در انتظار منبع'}</strong>{quote && <RelativeTime value={quote.fetchedAt} prefix="آخرین دریافت: "/>}</div>
    </header>

    <section className="asset-price-panel panel" aria-label={`قیمت ${asset.name}`}>
      <div className="asset-price-main"><span>قیمت فروش</span><strong>{quote ? formatPrice(quote.sell, quote.currency) : '—'}</strong><small>هر {asset.unit}</small></div>
      <div className="asset-price-main secondary"><span>قیمت خرید</span><strong>{quote ? formatPrice(quote.buy, quote.currency) : '—'}</strong><small>هر {asset.unit}</small></div>
      <dl className="asset-facts"><div><dt><Database size={15}/> منبع</dt><dd>{quote?.sourceUrl ? <a href={quote.sourceUrl} target="_blank" rel="noreferrer">{quote.source}</a> : quote?.source ?? 'در دسترس نیست'}</dd></div><div><dt><Clock3 size={15}/> زمان مشاهده</dt><dd>{quote ? <RelativeTime value={quote.observedAt}/> : '—'}</dd></div><div><dt><Scale size={15}/> واحد و ارز</dt><dd>{asset.unit} · {asset.currency === 'TMN' ? 'تومان' : 'دلار'}</dd></div></dl>
    </section>

    <SymbolHistoryChart symbol={asset.symbol} name={asset.name} />

    <section className="asset-content-grid">
      <article className="panel asset-explainer"><Info size={22}/><span className="eyebrow">HOW TO READ</span><h2>این قیمت را چطور بخوانیم؟</h2><p>قیمت خرید و فروش دو سمت بازار هستند. برای مقایسه با منبع دیگر، واحد، ارز و زمان مشاهده باید یکسان باشد. نگه‌داشتن نشانگر روی زمان، تاریخ دقیق تهران را نمایش می‌دهد.</p><Link href="/methodology">روش دریافت و کنترل کیفیت <ArrowUpLeft size={15}/></Link></article>
      <article className="panel asset-explainer"><ShieldCheck size={22}/><span className="eyebrow">EXPLAINABLE ANALYSIS</span><h2>تحلیل بدون عدد ساختگی</h2><p>فرمول حباب، ارزش نظری و آستانه معاملاتی هنوز تأیید نشده‌اند؛ بنابراین این صفحه فقط واقعیت مشاهده‌شده را نمایش می‌دهد و نتیجه تحلیلی حدس نمی‌زند.</p><span className="pending-analysis">در انتظار specification فرمول</span></article>
    </section>

    <section className="asset-actions panel"><div><Calculator size={22}/><div><h2>محاسبه با ورودی خودتان</h2><p>برای برآورد ساده وزن × قیمت، ماشین‌حساب در صفحه اصلی آماده است.</p></div></div><Link className="button" href="/#calculator">بازکردن ماشین‌حساب <ArrowUpLeft size={16}/></Link><Link className="text-link" href="/risk-management">ابزارهای مدیریت ریسک</Link></section>

    <section className="asset-faq"><div className="section-heading"><div><span className="eyebrow">COMMON QUESTIONS</span><h2>درباره {asset.name}</h2></div></div><FaqAccordion items={faq}/></section>
    {related.length > 0 && <section className="related-markets"><div className="section-heading"><div><span className="eyebrow">RELATED MARKETS</span><h2>بازارهای مرتبط</h2></div><Link href="/#markets">همه بازارها <ArrowUpLeft size={15}/></Link></div><div>{related.map(item => <Link className="panel" href={`/markets/${item.symbol.toLowerCase()}`} key={item.symbol}><AssetMark symbol={item.symbol} category={item.category}/><span><strong>{item.name}</strong><small>{item.unit}</small></span><ArrowUpLeft size={17}/></Link>)}</div></section>}
  </main>;
}
