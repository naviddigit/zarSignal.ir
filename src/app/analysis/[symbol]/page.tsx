import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Calculator, Bell, ChartNoAxesCombined, BookOpen } from 'lucide-react';
import { auth } from '@/auth';
import { instruments } from '@/lib/market';
import { hasCapability } from '@/lib/capabilities';
import { getWarningPolicy, acknowledgedRequest } from '@/server/time-reliability';
import { timeReliability } from '@/lib/time-reliability';
import { AnalysisReliabilityWarning } from '@/components/analysis-reliability-warning';
import { analysisTrial } from '@/server/analysis-trial';
import { resolveAccountEntitlement } from '@/server/account-entitlement';
import { buildMarketViewReport } from '@/server/market-view-report';
import { MarketViewReportView } from '@/components/market-view-report';
import { AnalysisTrialAccess } from '@/components/analysis-trial-access';
import { AnalysisMarketSelect } from '@/components/analysis-market-select';
import { ChartWorkspace } from '@/components/chart-workspace';
import { LastVisitChanges } from '@/components/last-visit-changes';
import { getAnalysisReadingSettings } from '@/server/analysis-reading-settings';
import { resolveLastVisitChanges } from '@/server/last-visit';
import { AnalysisRegistrationGate } from '@/components/analysis-registration-gate';

export const dynamic = 'force-dynamic';

export default async function AnalysisPage({ params, searchParams }: {
  params: Promise<{ symbol: string }>;
  searchParams: Promise<{ trial?: string; request?: string; warning?: string }>;
}) {
  const { symbol } = await params;
  const asset = instruments.find(item => item.symbol.toLowerCase() === symbol);
  if (!asset) notFound();
  const session = await auth().catch(() => null);
  if (!session?.user?.id) return <AnalysisRegistrationGate returnTo={`/analysis/${symbol}`} />;
  const query = await searchParams;
  const policy = await getWarningPolicy();
  const reliability = timeReliability(policy);
  if (reliability === 'WARNING') {
    const userId = session.user.id;
    if (!await acknowledgedRequest(userId, query.request, symbol, policy.version)) {
      return <AnalysisReliabilityWarning policy={policy} symbol={symbol} loggedIn error={query.warning} />;
    }
  }
  const entitlement = session?.user?.id ? await resolveAccountEntitlement(session.user.id) : null;
  const fullAccess = entitlement ? hasCapability(entitlement.level, 'ANALYSIS_BASIC') : false;
  const [report, trial, readingSettings] = await Promise.all([
    buildMarketViewReport(fullAccess ? 'full' : 'preview', asset.symbol),
    analysisTrial(),
    getAnalysisReadingSettings(),
  ]);
  const lastVisit = await resolveLastVisitChanges(session?.user?.id, report);
  const path = `/analysis/${symbol}`;

  return (
    <main id="main" className="shell content-page analysis-page market-view-page is-tidy">
      <nav className="chart-breadcrumb" aria-label="مسیر">
        <Link href="/">خانه</Link>
        <span>/</span>
        <Link href="/analysis">دید بازار</Link>
        <span>/ {asset.name}</span>
      </nav>
      <AnalysisMarketSelect current={asset.symbol} />
      <p className="market-view__meta analysis-page__status" role="status">
        {reliability === 'WARNING' ? 'خارج از بازه استاندارد' : 'بازه استاندارد'} · تهران
      </p>


      <MarketViewReportView
        initial={report}
        canRefresh
        signedIn
        planLevel={entitlement?.level ?? null}
        planLabel={entitlement?.planLabel ?? null}
        planStatus={entitlement?.statusLabel ?? null}
        readingSettings={readingSettings}
        trialCta={null}
        pageExtras={(
          (!fullAccess || entitlement?.statusLabel === 'آزمایشی') ? (
            <AnalysisTrialAccess trial={trial} symbol={symbol} error={query.trial} compact />
          ) : null
        )}
        afterReport={[
          { id: 'price-chart', node: <details className="market-view__details"><summary>نمودار قیمت <span className="market-view__details-action">مشاهده جزئیات</span></summary>
      <section className="analysis-page__chart" aria-label="نمودار قیمت" data-follow-keep>
        <ChartWorkspace symbol={asset.symbol} compact hideMarketLink />
      </section>
      </details> },
        ]}
        actions={<>
          <LastVisitChanges changes={lastVisit.changes} baselineAt={lastVisit.baselineAt} />
          <Link className="analysis-icon-action" href="/calculator" title="محاسبه" aria-label="محاسبه"><Calculator size={18} aria-hidden /></Link>
          <Link className="analysis-icon-action" href="/alerts" title="هشدار" aria-label="هشدار"><Bell size={18} aria-hidden /></Link>
          <Link className="analysis-icon-action" href={`/markets/${symbol}`} title="قیمت" aria-label="قیمت"><ChartNoAxesCombined size={18} aria-hidden /></Link>
          <Link className="analysis-icon-action" href="/methodology" title="روش محاسبه" aria-label="روش محاسبه"><BookOpen size={18} aria-hidden /></Link>
        </>}
      />
    </main>
  );
}
