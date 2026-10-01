import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpLeft, Newspaper } from 'lucide-react';
import { articles } from '@/lib/articles';
import { JsonLd } from '@/components/json-ld';

export const metadata: Metadata = {
  title: 'اخبار و مقالات بازار طلا و ارز',
  description: 'آموزش شفاف حباب طلا، مظنه، نقره و فاصله دلار — محتوای اصیل زرسیگنال برای انسان و موتور جستجو.',
  alternates: { canonical: '/news' },
  openGraph: {
    title: 'اخبار و مقالات زرسیگنال',
    description: 'محتوای آموزشی درباره قیمت، حباب و شفافیت داده در بازار طلا و ارز ایران.',
    type: 'website',
  },
};

function faDate(value: string) {
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'medium', timeZone: 'Asia/Tehran' }).format(new Date(value));
}

export default function NewsIndexPage() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://zarsignal.ir';
  return (
    <main id="main" className="shell content-page news-page">
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'CollectionPage',
        name: 'اخبار و مقالات زرسیگنال',
        url: `${siteUrl}/news`,
        inLanguage: 'fa-IR',
        about: 'بازار طلا، نقره و ارز ایران',
      }} />
      <header className="news-hero">
        <span className="eyebrow"><Newspaper size={14} /> NEWS & GUIDES</span>
        <h1>مقالات شفاف درباره قیمت و حباب</h1>
        <p className="lead">تعاریف روشن، بدون سیگنال ساختگی — برای معامله‌گر، موتور جستجو و سامانه‌های هوش مصنوعی قابل ایندکس.</p>
      </header>
      <ul className="news-list">
        {articles.map(article => (
          <li key={article.slug}>
            <Link href={`/news/${article.slug}`} className="news-card">
              <time dateTime={article.updatedAt}>{faDate(article.updatedAt)}</time>
              <strong>{article.title}</strong>
              <p>{article.description}</p>
              <span className="news-card__tags">
                {article.tags.map(tag => <em key={tag}>{tag}</em>)}
              </span>
              <span className="text-link">ادامه مطلب <ArrowUpLeft size={14} /></span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
