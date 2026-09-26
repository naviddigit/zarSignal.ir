'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import type { Snapshot } from '@/lib/market';
import type { LiveBubbleCard } from '@/lib/bubbles';
import { HeroOrbit } from '@/components/hero-orbit';
import { MarketRadar } from '@/components/market-radar';

export function HomeExperience({ snapshot, bubbles }: { snapshot: Snapshot; bubbles: LiveBubbleCard[] }) {
  const [view, setView] = useState<'simple' | 'professional'>('simple');
  useEffect(() => {
    try { if (localStorage.getItem('zarsignal-home-view') === 'professional') setView('professional'); } catch { /* Optional preference only. */ }
  }, []);
  function choose(next: typeof view) {
    setView(next);
    try { localStorage.setItem('zarsignal-home-view', next); } catch { /* Selection works without storage. */ }
  }
  return <>
    <section className="home-hero" aria-labelledby="hero-title" data-analytics-event="landing_view">
      <div className="home-hero__copy">
        <span className="eyebrow">دیده‌بان طلا، سکه و ارز</span>
        <h1 id="hero-title">بازار را واضح ببین.<br /><span className="gold-text">با آگاهی تصمیم بگیر.</span></h1>
        <p>قیمت طلا و ارز را ببین، فاصله با ارزش محاسباتی را بشناس و دلیل هر عدد را بررسی کن.</p>
        <div className="home-actions"><Link className="button" href="#sample-analysis" data-analytics-event="hero_cta_click" data-analytics-target="sample">نمونه تحلیل را ببین <span aria-hidden="true">↙</span></Link><Link className="text-link" href="/markets" data-analytics-event="hero_cta_click" data-analytics-target="market">تابلوی قیمت‌ها ←</Link></div>
        <p className="home-note">قیمت با زمان دریافت · محاسبه با مبنای روشن · بدون وعده سود</p>
      </div>
      <HeroOrbit />
    </section>
    <section id="analysis" className="home-analysis" aria-labelledby="analysis-title" data-analytics-event="analysis_summary_view">
      <div className="home-analysis__head"><div><span className="eyebrow">رادار ارزش بازار</span><h2 id="analysis-title">پشت هر قیمت، چه می‌گذرد؟</h2></div>
        <div className="home-view" role="group" aria-label="عمق نمایش"><button type="button" aria-pressed={view === 'simple'} onClick={() => choose('simple')} data-analytics-event="audience_view_changed" data-analytics-view="simple">نمای ساده</button><button type="button" aria-pressed={view === 'professional'} onClick={() => choose('professional')} data-analytics-event="audience_view_changed" data-analytics-view="professional">نمای حرفه‌ای</button></div>
      </div>
      <p className="home-note">انتخاب نما فقط جزئیات را تغییر می‌دهد؛ دسترسی اشتراک ایجاد نمی‌کند.</p>
      <MarketRadar bubbles={bubbles} snapshot={snapshot} professional={view === 'professional'} />
    </section>
  </>;
}
