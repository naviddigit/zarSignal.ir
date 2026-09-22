import type { MetadataRoute } from 'next';
export default function robots(): MetadataRoute.Robots { return { rules: { userAgent: '*', ...(process.env.MARKET_MODE === 'live' ? { allow: '/', disallow: ['/api/','/admin/','/charts/preview'] } : { disallow: '/' }) }, sitemap: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://zarsignal.ir'}/sitemap.xml` }; }
