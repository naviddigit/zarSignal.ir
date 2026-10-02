/**
 * One-off sample runner: fixed fixture report + live snapshot report.
 * Not imported by the app; fixture numbers are not hard-coded into the live path.
 */
import { marketViewReportFromSnapshot, buildMarketViewReport } from '../src/server/market-view-report';
import type { Quote, Snapshot } from '../src/lib/market';

const F = { usd: 261698, aed: 71310, xau: 4192.37, xag: 61.48, gold18: 26039971, silver999: 516051 } as const;
const round2 = (n: number | null) => (n == null || !Number.isFinite(n) ? null : Math.round(n * 100) / 100);

function quote(symbol: Quote['symbol'], mid: number, currency: string, unit: string): Quote {
  const now = new Date().toISOString();
  return {
    symbol,
    buy: String(mid),
    sell: String(mid),
    currency,
    unit,
    source: 'fixture',
    sourceUrl: null,
    observedAt: now,
    fetchedAt: now,
  };
}

function summarize(label: string, report: Awaited<ReturnType<typeof buildMarketViewReport>>) {
  console.log(`\n=== ${label} ===`);
  console.log(JSON.stringify({
    title: report.title,
    summaryLines: report.summaryLines,
    marketSays: report.marketSays,
    reading: report.reading,
    conclusion: report.conclusion,
    decision: {
      kind: report.decision.kind,
      title: report.decision.title,
      tradeAction: report.decision.tradeAction,
      valuation: report.decision.valuation,
    },
    trend: report.trend,
    dataFreshness: report.dataFreshness,
    fingerprint: report.snapshotFingerprint,
    evidence: report.evidence.map(e => ({
      id: e.id,
      status: e.status,
      pct: round2(e.diffPercent),
      basis: e.marketBasis ?? null,
      formulaVersion: e.formulaVersion,
    })),
  }, null, 2));
}

async function main() {
  const fixedSnap: Snapshot = {
    mode: 'live',
    status: 'ok',
    quotes: [
      quote('GOLD_MELTED', F.gold18 * 4.3318, 'TMN', 'مثقال'),
      quote('GOLD_18K', F.gold18, 'TMN', 'گرم'),
      quote('XAU_USD', F.xau, 'USD', 'اونس تروا'),
      quote('XAG_USD', F.xag, 'USD', 'اونس تروا'),
      quote('USD', F.usd, 'TMN', 'دلار'),
      quote('AED', F.aed, 'TMN', 'درهم'),
      quote('SILVER_999', F.silver999, 'TMN', 'گرم'),
      quote('SEKE_CASH', 250000000, 'TMN', 'عدد'),
      quote('ROB_SEKE', 65000000, 'TMN', 'عدد'),
    ],
  };

  summarize('FIXED FIXTURE REPORT', marketViewReportFromSnapshot(fixedSnap, 'full'));
  try {
    summarize('LIVE SNAPSHOT REPORT', await buildMarketViewReport('full'));
  } catch (error) {
    console.log('\n=== LIVE SNAPSHOT REPORT ===');
    console.log('unavailable:', error instanceof Error ? error.message : error);
  }
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
