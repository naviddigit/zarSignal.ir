import { db } from '@/lib/db';
import { withDeadline } from '@/lib/with-deadline';
import { isStale, type Snapshot } from '@/lib/market';
import { computeLiveBubbles } from '@/server/live-bubbles';
import { getPublicSnapshot } from '@/server/quotes';
import {
  channelDeliveryReady,
  evaluateMarketAlert,
  shouldRearmAlert,
  type MarketAlertChannel,
  type MarketAlertConditionType,
  type MarketAlertDirection,
  type MarketSnapshotMetrics,
} from '@/lib/market-change-alerts';

function mid(buy: number, sell: number) {
  return (buy + sell) / 2;
}

export function metricsFromSnapshot(snapshot: Snapshot): MarketSnapshotMetrics | null {
  if (snapshot.mode !== 'live' || snapshot.status === 'unavailable' || snapshot.status === 'demo') {
    return null;
  }
  const prices: MarketSnapshotMetrics['prices'] = {};
  const times: number[] = [];
  for (const q of snapshot.quotes) {
    const buy = Number(q.buy);
    const sell = Number(q.sell);
    if (!Number.isFinite(buy) || !Number.isFinite(sell) || sell <= 0) continue;
    prices[q.symbol] = {
      value: mid(buy, sell),
      unit: q.unit,
      currency: q.currency,
      stale: isStale(q),
    };
    const t = Date.parse(q.observedAt);
    if (Number.isFinite(t)) times.push(t);
  }
  if (!times.length) return null;

  const bubbles = computeLiveBubbles(snapshot);
  const gaps: MarketSnapshotMetrics['gaps'] = {};
  for (const card of bubbles) {
    if (card.percent == null || !Number.isFinite(card.percent)) continue;
    if (card.status !== 'ok' && card.status !== 'stale') continue;
    const key = card.key === 'GOLD_BUBBLE' ? 'gold' : card.key === 'USD_BUBBLE' ? 'usd' : card.key === 'SILVER_BUBBLE' ? 'silver' : null;
    if (!key) continue;
    gaps[key] = { percent: card.percent, stale: card.status === 'stale' };
  }

  const gold = gaps.gold;
  const silver = gaps.silver;
  const goldSilverRelativePct =
    gold && silver && !gold.stale && !silver.stale
      ? Math.abs(gold.percent - silver.percent)
      : null;

  return {
    observedAt: new Date(Math.min(...times)).toISOString(),
    prices,
    gaps,
    goldSilverRelativePct,
  };
}

/** Evaluate active alerts after valid new market data. Safe to call from worker/cron. */
export async function evaluateMarketChangeAlerts(snapshot?: Snapshot) {
  const snap = snapshot ?? await getPublicSnapshot();
  const metrics = metricsFromSnapshot(snap);
  if (!metrics) return { evaluated: 0, fired: 0, rearmed: 0, skipped: 'no_valid_metrics' as const };

  const now = new Date();
  const alerts = await withDeadline(
    db.marketChangeAlert.findMany({
      where: {
        status: 'ACTIVE',
        OR: [{ expiresAt: null }, { expiresAt: { gt: now } }],
      },
      take: 500,
      orderBy: { updatedAt: 'asc' },
    }),
    4000,
  ).catch(() => []);

  let fired = 0;
  let rearmed = 0;

  for (const row of alerts) {
    if (row.expiresAt && row.expiresAt <= now) {
      await db.marketChangeAlert.update({
        where: { id: row.id },
        data: { status: 'EXPIRED', lastEvaluatedAt: now },
      }).catch(() => null);
      continue;
    }

    const input = {
      conditionType: row.conditionType as MarketAlertConditionType,
      symbol: row.symbol,
      unit: row.unit,
      direction: row.direction as MarketAlertDirection,
      threshold: Number(row.threshold),
      armed: row.armed,
      lastFiredAt: row.lastFiredAt,
      now,
    };

    if (!row.armed) {
      if (shouldRearmAlert(input, metrics)) {
        await db.marketChangeAlert.update({
          where: { id: row.id },
          data: { armed: true, lastEvaluatedAt: now },
        }).catch(() => null);
        rearmed += 1;
      } else {
        await db.marketChangeAlert.update({
          where: { id: row.id },
          data: { lastEvaluatedAt: now },
        }).catch(() => null);
      }
      continue;
    }

    const result = evaluateMarketAlert(input, metrics);
    await db.marketChangeAlert.update({
      where: { id: row.id },
      data: { lastEvaluatedAt: now },
    }).catch(() => null);

    if (!result.fire) continue;

    const channel = row.channel as MarketAlertChannel;
    const delivery = channelDeliveryReady(channel);
    // Never send real SMS/Push in this phase — only IN_APP delivery.
    const deliveryStatus = channel === 'IN_APP' && delivery.ready
      ? 'DELIVERED_IN_APP'
      : channel === 'PUSH' || channel === 'SMS'
        ? 'SKIPPED_NEEDS_SERVICE'
        : 'RECORDED';

    try {
      await db.$transaction(async tx => {
        await tx.marketAlertEvent.create({
          data: {
            alertId: row.id,
            edgeKey: result.edgeKey,
            observedAt: result.observedAt,
            metricValue: result.metricValue,
            message: result.message,
            deliveryStatus,
          },
        });
        await tx.marketChangeAlert.update({
          where: { id: row.id },
          data: { armed: false, lastFiredAt: now },
        });
        if (deliveryStatus === 'DELIVERED_IN_APP') {
          await tx.inAppNotification.create({
            data: {
              userId: row.userId,
              title: 'هشدار تغییر بازار',
              body: result.message,
              href: '/alerts',
              kind: 'MARKET_CHANGE',
            },
          });
        }
      });
      fired += 1;
    } catch {
      // Unique edgeKey conflict = already recorded; ignore.
    }
  }

  return { evaluated: alerts.length, fired, rearmed, skipped: null };
}
