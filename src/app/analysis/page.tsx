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
import { AnalysisMarketSelect } from '@/components/analysis-market-select';
import { LastVisitChanges } from '@/components/last-visit-changes';
import { getWarningPolicy } from '@/server/time-reliability';
import { timeReliability } from '@/lib/time-reliability';
import { getAnalysisReadingSettings } from '@/server/analysis-reading-settings';
import { resolveLastVisitChanges } from '@/server/last-visit';

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
  const [timePolicy, readingSettings, lastVisit] = await Promise.all([
    getWarningPolicy(),
    getAnalysisReadingSettings(),
    resolveLastVisitChanges(userId, report),
  ]);

  return (
    <main id="main" className="shell content-page analysis-page market-view-page">
      <nav className="chart-breadcrumb" aria-label="مسیر">
        <Link href="/">خانه</Link>
        <span>/</span>
        <Link href="/markets">بازارها</Link>
        <span>/</span>
        <span>دید بازار</span>
      </nav>
      {timeReliability(timePolicy) === 'WARNING' && (
        <p className="analysis-warning" role="status">
          خارج از بازهٔ استاندارد تحلیل ({timePolicy.warningEnd} تا {timePolicy.warningStart} به وقت تهران)؛ اعتبار نرخ‌ها را پیش از استفاده بررسی کنید.
        </p>
      )}

      <AnalysisMarketSelect />
      <LastVisitChanges changes={lastVisit.changes} baselineAt={lastVisit.baselineAt} />
      <MarketViewReportView
        initial={report}
        canRefresh
        signedIn={Boolean(userId)}
        planLevel={entitlement?.level ?? null}
        planLabel={entitlement?.planLabel ?? null}
        planStatus={entitlement?.statusLabel ?? null}
        readingSettings={readingSettings}
        trialCta={!fullAccess ? (
          <Link className="button" href={`/login?next=${encodeURIComponent('/analysis')}`}>
            ورود / شروع آزمایش <ArrowUpLeft size={15} />
          </Link>
        ) : null}
        pageExtras={(
          <>
            {(!fullAccess || entitlement?.statusLabel === 'آزمایشی') && (
              <AnalysisTrialAccess trial={trial} error={query.trial} compact />
            )}
            <div className="home-quick-tools">
              <Link href="/markets">نرخ‌های تابلو</Link>
              <Link href="/calculator">ماشین‌حساب</Link>
              <Link href="/alerts">هشدار تغییر بازار</Link>
              <Link href="/analysis/gold_melted">تحلیل تک‌بازار · طلا</Link>
              {!fullAccess ? <Link href="/pricing">دسترسی تحلیل کامل <ArrowUpLeft size={14} /></Link> : null}
            </div>
          </>
        )}
      />
    </main>
  );
}
