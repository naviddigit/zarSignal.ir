import Link from 'next/link';
import { ArrowUpLeft } from 'lucide-react';
import { faqItems } from '@/lib/faq';
import { FaqAccordion } from '@/components/faq-accordion';
export function FaqPreview() { return <section className="faq-preview section-reveal" aria-labelledby="faq-preview-title"><div className="section-heading"><div><span className="eyebrow">FAQ</span><h2 id="faq-preview-title">پرسش‌های مهم، پاسخ‌های روشن</h2></div><Link className="text-link" href="/faq">همه پرسش‌ها <ArrowUpLeft size={15}/></Link></div><FaqAccordion items={faqItems.slice(0,4)}/></section>; }
