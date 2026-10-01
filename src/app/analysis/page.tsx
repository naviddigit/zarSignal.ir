import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpLeft } from 'lucide-react';
import { auth } from '@/auth';
import { hasCapability } from '@/lib/capabilities';
import { resolveAccountEntitlement } from '@/server/account-entitlement';
import { buildMarketViewReport } from '@/server/market-view-report';
import { MarketViewReportView } from '@/components/market-view-report';
import { analysisTrial } from '@/server/analysis-trial';
import { AnalysisTrialAccess } from '@/components/analysis-trial-access';
import { instruments } from '@/lib/market';
import { getWarningPolicy } from '@/server/time-reliability';
import { timeReliability } from '@/lib/time-reliability';

export const metadata: Metadata = {
  title: 'دید زرسیگنال به بازار',
  description: 'گزارش فارسی اختلاف قیمت طلا، دلار و نقره با مرجع محاسباتی تأییدشده — بدون سیگنال خرید و فروش.',
  alternates: { canonical: '/analysis' },
};
export const dynamic = 'force-dynamic';

export default async function MarketAnalysisPage({ searchParams }: { searchParams: Promise<{ trial?: string }> }) {
  const query = await searchParams;
  const session = await auth().catch(() => null);
  const userId = session?.user?.id;
  const entitlement = userId
    ? await resolveAccountEntitlement(userId)
    : null;
  const fullAccess = entitlement ? hasCapability(entitlement.level, 'ANALYSIS_BASIC') : false;
  const report = await buildMarketViewReport(fullAccess ? 'full' : 'preview');
  const trial = await analysisTrial();
  const timePolicy = await getWarningPolicy();

  return (
    <main id="main" className="shell content-page analysis-page market-view-page">
      <nav className="chart-breadcrumb" aria-label="مسیر">
        <Link href="/">خانه</Link>
        <span>/</span>
        <Link href="/markets">بازارها</Link>
        <span>/</span>
        <span>دید بازار</span>
      </nav>
      {timeReliability(timePolicy) === 'WARNING' && <p className="analysis-warning" role="status">خارج از بازهٔ استاندارد تحلیل ({timePolicy.warningEnd} تا {timePolicy.warningStart} به وقت تهران)؛ اعتبار نرخ‌ها را پیش از استفاده بررسی کنید.</p>}

      <nav className="home-quick-tools" aria-label="انتخاب تحلیل">
        <Link href="/analysis" aria-current="page">کل بازار</Link>
        {instruments.map(asset => <Link key={asset.symbol} href={`/analysis/${asset.symbol.toLowerCase()}`}>{asset.short}</Link>)}
      </nav>
      <MarketViewReportView initial={report} canRefresh />
      {(!fullAccess || entitlement?.statusLabel === 'آزمایشی') && <AnalysisTrialAccess trial={trial} error={query.trial} />}

      <div className="home-quick-tools">
        <Link href="/markets">نرخ‌های تابلو</Link>
        <Link href="/calculator">ماشین‌حساب</Link>
        <Link href="/analysis/gold_melted">تحلیل تک‌بازار · طلا</Link>
        {!fullAccess ? <Link href="/pricing">دسترسی تحلیل کامل <ArrowUpLeft size={14} /></Link> : null}
      </div>
    </main>
  );
}
