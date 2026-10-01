import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUpLeft } from 'lucide-react';
import { articles, getArticle } from '@/lib/articles';
import { JsonLd } from '@/components/json-ld';

export const dynamicParams = false;

export function generateStaticParams() {
  return articles.map(article => ({ slug: article.slug }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) return { title: 'مقاله یافت نشد' };
  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: `/news/${article.slug}` },
    openGraph: {
      type: 'article',
      title: article.title,
      description: article.description,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
      tags: article.tags,
      locale: 'fa_IR',
    },
  };
}

function faDate(value: string) {
  return new Intl.DateTimeFormat('fa-IR', { dateStyle: 'long', timeZone: 'Asia/Tehran' }).format(new Date(value));
}

export default async function NewsArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const article = getArticle(slug);
  if (!article) notFound();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://zarsignal.ir';
  const url = `${siteUrl}/news/${article.slug}`;

  return (
    <main id="main" className="shell content-page news-article">
      <JsonLd data={{
        '@context': 'https://schema.org',
        '@type': 'Article',
        headline: article.title,
        description: article.description,
        datePublished: article.publishedAt,
        dateModified: article.updatedAt,
        inLanguage: 'fa-IR',
        author: { '@type': 'Organization', name: 'زرسیگنال', url: siteUrl },
        publisher: { '@type': 'Organization', name: 'زرسیگنال', url: siteUrl },
        mainEntityOfPage: url,
        keywords: article.tags.join(', '),
      }} />
      <nav className="news-crumb" aria-label="مسیر">
        <Link href="/news">اخبار و مقالات</Link>
        <span aria-hidden="true">/</span>
        <span>{article.title}</span>
      </nav>
      <article>
        <header className="news-article__head">
          <span className="eyebrow">راهنمای بازار</span>
          <h1>{article.title}</h1>
          <p className="lead">{article.description}</p>
          <p className="news-article__meta">
            به‌روزرسانی <time dateTime={article.updatedAt}>{faDate(article.updatedAt)}</time>
            {' · '}
            انتشار <time dateTime={article.publishedAt}>{faDate(article.publishedAt)}</time>
          </p>
          <div className="news-card__tags">
            {article.tags.map(tag => <em key={tag}>{tag}</em>)}
          </div>
        </header>
        <div className="news-article__body">
          {article.body.map(paragraph => <p key={paragraph.slice(0, 24)}>{paragraph}</p>)}
        </div>
        <footer className="news-article__foot">
          <p>این مطلب توصیه سرمایه‌گذاری نیست. اعداد بازار را همیشه با زمان دریافت در زرسیگنال بخوانید.</p>
          <div className="news-article__actions">
            <Link className="button" href="/calculator">ماشین‌حساب <ArrowUpLeft size={15} /></Link>
            <Link className="text-link" href="/markets">تابلوی قیمت ←</Link>
            <Link className="text-link" href="/news">همه مقالات ←</Link>
          </div>
        </footer>
      </article>
    </main>
  );
}
