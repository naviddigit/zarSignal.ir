import type { MetadataRoute } from 'next';
import { instruments } from '@/lib/market';
export default function sitemap(): MetadataRoute.Sitemap { const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://zarsignal.ir'; return ['', '/pricing', '/developers', '/methodology', '/mobile', ...instruments.map(a => `/markets/${a.symbol.toLowerCase()}`)].map(path => ({ url: `${base}${path}`, changeFrequency: path.startsWith('/markets') ? 'hourly' : 'weekly', priority: path === '' ? 1 : .7 })); }
