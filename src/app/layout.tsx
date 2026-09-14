import type { Metadata, Viewport } from 'next';
import Link from 'next/link';
import { Header } from '@/components/header';
import { JsonLd } from '@/components/json-ld';
import './globals.css';
import './theme.css';
export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'https://zarsignal.ir'),
  title: { default: 'زرسیگنال | دیده‌بان طلا، نقره و ارز', template: '%s | زرسیگنال' },
  description: 'دیده‌بان فارسی بازار طلا، نقره و ارز؛ بررسی حباب، مشاهده قیمت خرید و فروش و زمان به‌روزرسانی داده‌ها.',
  openGraph: { locale: 'fa_IR', type: 'website', siteName: 'زرسیگنال', images: [{ url: '/og-card.svg', width: 1200, height: 630, alt: 'زرسیگنال؛ دیده‌بان طلا، نقره و ارز' }] },
  twitter: { card: 'summary_large_image', images: ['/og-card.svg'] },
  robots: process.env.MARKET_MODE === 'live' ? { index: true, follow: true } : { index: false, follow: false },
};
export const viewport: Viewport = { themeColor: '#080c13', width: 'device-width', initialScale: 1 };
export default function Layout({ children }: Readonly<{ children: React.ReactNode }>) { const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://zarsignal.ir'; return <html lang="fa" dir="rtl" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{__html:`try{const t=localStorage.getItem('zarsignal-theme');const v=t==='light'||t==='dark'?t:(matchMedia('(prefers-color-scheme:light)').matches?'light':'dark');document.documentElement.dataset.theme=v;document.documentElement.style.colorScheme=v}catch{document.documentElement.dataset.theme='dark'}`}}/></head><body><JsonLd data={{ '@context':'https://schema.org', '@type':'WebSite', name:'زرسیگنال', url:siteUrl, inLanguage:'fa-IR', description:'دیده‌بان فارسی بازار طلا، نقره و ارز با زمان و منبع مشخص داده.' }}/><a href="#main" className="skip-link">رفتن به محتوای اصلی</a><Header/>{children}<footer className="shell footer"><Link href="/" className="footer-brand">زرسیگنال <span>دید روشن‌تر به بازار.</span></Link><div><Link href="/methodology">شفافیت داده</Link><Link href="/developers">مستندات API</Link><Link href="/mobile">اپلیکیشن</Link></div><small>نسخهٔ اولیه · تحلیل، تضمین نتیجهٔ معامله نیست.</small></footer></body></html>; }
