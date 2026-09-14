import type { Metadata } from 'next';
import { JsonLd } from '@/components/json-ld';
import { faqItems } from '@/lib/faq';
import { FaqAccordion } from '@/components/faq-accordion';
export const metadata: Metadata = { title: 'پرسش‌های متداول قیمت طلا، ارز و زر‌سیگنال', description: 'پاسخ شفاف درباره منبع قیمت طلا و ارز، زمان بروزرسانی، طلای دبی، ماشین حساب آبشده، حباب بازار و API زر‌سیگنال.', alternates: { canonical: '/faq' } };
export default function FaqPage() { const siteUrl=process.env.NEXT_PUBLIC_SITE_URL??'https://zarsignal.ir'; return <main id="main" className="shell content-page faq-page"><JsonLd data={{'@context':'https://schema.org','@type':'FAQPage',mainEntity:faqItems.map(item=>({'@type':'Question',name:item.question,acceptedAnswer:{'@type':'Answer',text:item.answer}})),url:`${siteUrl}/faq`,inLanguage:'fa-IR'}}/><span className="eyebrow">HELP CENTER</span><h1>پرسش‌های متداول زر‌سیگنال</h1><p className="lead">دربارهٔ منبع داده، نحوهٔ بروزرسانی، ابزارها و محدودیت تحلیل شفاف پاسخ می‌دهیم.</p><section className="faq-page-list"><FaqAccordion items={faqItems}/></section></main>; }
