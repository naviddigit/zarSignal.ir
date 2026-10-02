import { db } from '@/lib/db';
import { withDeadline } from '@/lib/with-deadline';
import type { MarketViewEvidenceRow, MarketViewReport } from '@/lib/market-view-report';
import { formatFaPercent } from '@/lib/market-view-report';

export type VisitMetric = {
  id: string;
  label: string;
  /** Gap percent or null when only price stored. */
  gapPercent: number | null;
  priceLabel: string | null;
};

export type VisitBaselinePayload = {
  observedAt: string;
  metrics: VisitMetric[];
};

export type LastVisitChange = {
  id: string;
  label: string;
  /** Human one-liner: what changed, by how much, vs when. */
  summary: string;
  deltaPercent: number | null;
};

function evidenceToMetrics(evidence: MarketViewEvidenceRow[]): VisitMetric[] {
  return evidence
    .filter(row => row.id !== 'coin')
    .map(row => ({
      id: row.id,
      label: row.id === 'usd'
        ? 'فاصلهٔ دلار بازار با دلار ضمنی طلا'
        : row.id === 'gold' ? 'طلا' : row.id === 'silver' ? 'نقره ۹۹۹' : row.marketLabel,
      gapPercent: row.diffPercent,
      priceLabel: row.marketPriceLabel,
    }));
}

export function buildVisitBaseline(report: MarketViewReport): VisitBaselinePayload | null {
  if (!report.dataObservedAtIso) return null;
  const metrics = evidenceToMetrics(report.evidence).filter(
    m => m.gapPercent != null || m.priceLabel,
  );
  if (!metrics.length) return null;
  return { observedAt: report.dataObservedAtIso, metrics };
}

/** Compare current report to a stored baseline — never invent deltas. */
export function diffVisitBaseline(
  current: VisitBaselinePayload,
  previous: VisitBaselinePayload,
  max = 3,
): LastVisitChange[] {
  const prevMap = new Map(previous.metrics.map(m => [m.id, m]));
  const changes: LastVisitChange[] = [];
  const when = new Intl.DateTimeFormat('fa-IR', {
    timeZone: 'Asia/Tehran',
    dateStyle: 'short',
    timeStyle: 'short',
  }).format(new Date(previous.observedAt));

  for (const row of current.metrics) {
    const prev = prevMap.get(row.id);
    if (!prev) continue;
    if (row.gapPercent != null && prev.gapPercent != null) {
      const delta = row.gapPercent - prev.gapPercent;
      if (Math.abs(delta) < 0.05) continue;
      const dir = delta > 0 ? 'بیشتر' : 'کمتر';
      changes.push({
        id: row.id,
        label: row.label,
        deltaPercent: delta,
        summary: `${row.label}: اختلاف با مرجع ${formatFaPercent(Math.abs(delta))}٪ ${dir} شد نسبت به ${when}`,
      });
      continue;
    }
    if (row.priceLabel && prev.priceLabel && row.priceLabel !== prev.priceLabel) {
      changes.push({
        id: row.id,
        label: row.label,
        deltaPercent: null,
        summary: `${row.label}: قیمت از ${prev.priceLabel} به ${row.priceLabel} تغییر کرد (از ${when})`,
      });
    }
  }

  changes.sort((a, b) => Math.abs(b.deltaPercent ?? 0) - Math.abs(a.deltaPercent ?? 0));
  return changes.slice(0, max);
}

export async function loadVisitBaseline(userId: string, scope: string) {
  try {
    const row = await withDeadline(
      db.userMarketVisitBaseline.findUnique({ where: { userId_scope: { userId, scope } } }),
      2000,
    );
    if (!row) return null;
    const payload = row.metricsJson as VisitBaselinePayload;
    if (!payload?.observedAt || !Array.isArray(payload.metrics)) return null;
    return { ...payload, observedAt: row.observedAt.toISOString() };
  } catch {
    return null;
  }
}

export async function saveVisitBaseline(userId: string, scope: string, payload: VisitBaselinePayload) {
  const observedAt = new Date(payload.observedAt);
  if (!Number.isFinite(observedAt.getTime())) return;
  await db.userMarketVisitBaseline.upsert({
    where: { userId_scope: { userId, scope } },
    create: {
      userId,
      scope,
      observedAt,
      metricsJson: payload,
    },
    update: {
      observedAt,
      metricsJson: payload,
    },
  });
}

export async function resolveLastVisitChanges(
  userId: string | null | undefined,
  report: MarketViewReport,
): Promise<{ changes: LastVisitChange[]; baselineAt: string | null }> {
  const current = buildVisitBaseline(report);
  if (!userId || !current) return { changes: [], baselineAt: null };
  const scope = report.symbol ?? 'overall';
  const previous = await loadVisitBaseline(userId, scope);
  const changes = previous ? diffVisitBaseline(current, previous) : [];
  // Refresh baseline after computing diff so next visit compares to this one.
  await saveVisitBaseline(userId, scope, current).catch(() => null);
  return { changes, baselineAt: previous?.observedAt ?? null };
}
