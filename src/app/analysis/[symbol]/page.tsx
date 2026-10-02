import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowUpLeft } from 'lucide-react';
import { auth } from '@/auth';
import { instruments } from '@/lib/market';
import { hasCapability } from '@/lib/capabilities';
import { getWarningPolicy, analysisUserId, acknowledgedRequest } from '@/server/time-reliability';
import { timeReliability } from '@/lib/time-reliability';
import { AnalysisReliabilityWarning } from '@/components/analysis-reliability-warning';
import { analysisTrial } from '@/server/analysis-trial';
import { resolveAccountEntitlement } from '@/server/account-entitlement';
import { buildMarketViewReport } from '@/server/market-view-report';
import { MarketViewReportView } from '@/components/market-view-report';
import { AnalysisTrialAccess } from '@/components/analysis-trial-access';
import { AnalysisMarketSelect } from '@/components/analysis-market-select';
import { ChartWorkspace } from '@/components/chart-workspace';

export const dynamic = 'force-dynamic';

export default async function AnalysisPage({ params, searchParams }: {
  params: Promise<{ symbol: string }>;
  searchParams: Promise<{ trial?: string; request?: string; warning?: string }>;
}) {
  const { symbol } = await params;
  const asset = instruments.find(item => item.symbol.toLowerCase() === symbol);
  if (!asset) notFound();
  const query = await searchParams;
  const policy = await getWarningPolicy();
  const reliability = timeReliability(policy);
  if (reliability === 'WARNING') {
    const userId = await analysisUserId();
    if (!await acknowledgedRequest(userId, query.request, symbol, policy.version)) {
      return <AnalysisReliabilityWarning policy={policy} symbol={symbol} loggedIn={Boolean(userId)} error={query.warning} />;
    }
  }
  const session = await auth().catch(() => null);
  const entitlement = session?.user?.id ? await resolveAccountEntitlement(session.user.id) : null;
  const fullAccess = entitlement ? hasCapability(entitlement.level, 'ANALYSIS_BASIC') : false;
  const [report, trial] = await Promise.all([
    buildMarketViewReport(fullAccess ? 'full' : 'preview', asset.symbol),
    analysisTrial(),
  ]);
  const path = `/analysis/${symbol}`;

  return (
    <main id="main" className="shell content-page analysis-page market-view-page">
      <nav className="chart-breadcrumb" aria-label="مسیر">
        <Link href="/">خانه</Link>
        <span>/</span>
        <Link href="/analysis">دید بازار</Link>
        <span>/ {asset.name}</span>
      </nav>
      <AnalysisMarketSelect current={asset.symbol} />
      <p className="market-view__meta" role="status">
        {reliability === 'WARNING' ? 'تحلیل خارج از بازه استاندارد' : 'در بازه استاندارد تحلیل'} · زمان تهران
      </p>
      <MarketViewReportView
        initial={report}
        canRefresh
        signedIn={Boolean(session?.user?.id)}
        trialCta={!fullAccess ? (
          <Link className="button" href={`/login?next=${encodeURIComponent(path)}`}>
            ورود / شروع آزمایش <ArrowUpLeft size={15} />
          </Link>
        ) : null}
        pageExtras={(
          <>
            {(!fullAccess || entitlement?.statusLabel === 'آزمایشی') && (
              <AnalysisTrialAccess trial={trial} symbol={symbol} error={query.trial} compact />
            )}
            <details className="market-view__details is-compact">
              <summary>بررسی نمودار و تاریخچهٔ {asset.short}</summary>
              <ChartWorkspace symbol={asset.symbol} />
            </details>
            <div className="home-quick-tools">
              <Link href="/calculator">محاسبهٔ معامله</Link>
              <Link href={`/markets/${symbol}`}>قیمت و مشخصات {asset.short}</Link>
              <Link href="/methodology">روش محاسبه</Link>
            </div>
          </>
        )}
      />
    </main>
  );
}
