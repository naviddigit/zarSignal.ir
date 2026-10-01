import type { MetadataRoute } from 'next';
import { instruments } from '@/lib/market';
import { articles } from '@/lib/articles';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://zarsignal.ir';
  const staticPaths = [
    '',
    '/pricing',
    '/developers',
    '/methodology',
    '/risk-management',
    '/mobile',
    '/faq',
    '/charts',
    '/calculator',
    '/news',
    '/account',
  ];
  const marketPaths = instruments.flatMap(a => [
    `/markets/${a.symbol.toLowerCase()}`,
    `/charts/${a.symbol.toLowerCase()}`,
  ]);
  const newsPaths = articles.map(a => `/news/${a.slug}`);
  return [...staticPaths, ...marketPaths, ...newsPaths].map(path => ({
    url: `${base}${path}`,
    changeFrequency: path.startsWith('/markets') ? 'hourly' as const : path.startsWith('/news') ? 'weekly' as const : 'weekly' as const,
    priority: path === '' ? 1 : path.startsWith('/news') ? 0.8 : 0.7,
  }));
}
