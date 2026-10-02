/** Market-change alerts — not trade recommendations. Pure evaluation helpers. */

export const MARKET_ALERT_CONDITION_TYPES = [
  'PRICE_CROSS',
  'GAP_PCT_CROSS',
  'GOLD_SILVER_RELATIVE',
] as const;

export type MarketAlertConditionType = (typeof MARKET_ALERT_CONDITION_TYPES)[number];

export const MARKET_ALERT_DIRECTIONS = ['above', 'below', 'either'] as const;
export type MarketAlertDirection = (typeof MARKET_ALERT_DIRECTIONS)[number];

export const MARKET_ALERT_CHANNELS = ['IN_APP', 'PUSH', 'SMS'] as const;
export type MarketAlertChannel = (typeof MARKET_ALERT_CHANNELS)[number];

/** Minimum gap between fires for the same alert (ms) — rate limit. */
export const MARKET_ALERT_MIN_FIRE_INTERVAL_MS = 30 * 60 * 1000;

export type MarketSnapshotMetrics = {
  observedAt: string;
  prices: Partial<Record<string, { value: number; unit: string; currency: string; stale: boolean }>>;
  gaps: Partial<Record<'gold' | 'usd' | 'silver', { percent: number; stale: boolean }>>;
  /** Absolute difference |goldGap% − silverGap%| when both valid and fresh enough. */
  goldSilverRelativePct: number | null;
};

export type AlertEvalInput = {
  conditionType: MarketAlertConditionType;
  symbol: string;
  unit: string | null;
  direction: MarketAlertDirection;
  threshold: number;
  armed: boolean;
  lastFiredAt: Date | null;
  now?: Date;
};

export type AlertEvalResult =
  | { fire: false; reason: 'not_met' | 'disarmed' | 'rate_limited' | 'missing_data' | 'stale_or_unit' }
  | {
      fire: true;
      metricValue: number;
      observedAt: Date;
      edgeKey: string;
      message: string;
    };

export function crossedThreshold(
  value: number,
  threshold: number,
  direction: MarketAlertDirection,
): boolean {
  if (direction === 'above') return value > threshold;
  if (direction === 'below') return value < threshold;
  return value > threshold || value < threshold;
}

export function conditionStillTrue(
  value: number,
  threshold: number,
  direction: MarketAlertDirection,
): boolean {
  return crossedThreshold(value, threshold, direction);
}

export function evaluateMarketAlert(
  alert: AlertEvalInput,
  metrics: MarketSnapshotMetrics,
): AlertEvalResult {
  const now = alert.now ?? new Date();
  if (!alert.armed) return { fire: false, reason: 'disarmed' };
  if (
    alert.lastFiredAt
    && now.getTime() - alert.lastFiredAt.getTime() < MARKET_ALERT_MIN_FIRE_INTERVAL_MS
  ) {
    return { fire: false, reason: 'rate_limited' };
  }

  let value: number | null = null;
  let stale = false;
  let label = alert.symbol;

  if (alert.conditionType === 'PRICE_CROSS') {
    const row = metrics.prices[alert.symbol];
    if (!row) return { fire: false, reason: 'missing_data' };
    if (alert.unit && row.unit !== alert.unit) return { fire: false, reason: 'stale_or_unit' };
    value = row.value;
    stale = row.stale;
    label = `${alert.symbol} (${row.unit})`;
  } else if (alert.conditionType === 'GAP_PCT_CROSS') {
    const key = alert.symbol === 'GOLD_BUBBLE' || alert.symbol === 'gold' ? 'gold'
      : alert.symbol === 'USD_BUBBLE' || alert.symbol === 'usd' ? 'usd'
      : alert.symbol === 'SILVER_BUBBLE' || alert.symbol === 'silver' ? 'silver'
      : null;
    if (!key || metrics.gaps[key] == null) return { fire: false, reason: 'missing_data' };
    value = metrics.gaps[key]!.percent;
    stale = metrics.gaps[key]!.stale;
    label = key === 'usd'
      ? 'فاصلهٔ دلار بازار با دلار ضمنی طلا'
      : key === 'gold' ? 'اختلاف طلا با مرجع' : 'اختلاف نقره با مرجع';
  } else {
    if (metrics.goldSilverRelativePct == null) return { fire: false, reason: 'missing_data' };
    value = metrics.goldSilverRelativePct;
    const g = metrics.gaps.gold;
    const s = metrics.gaps.silver;
    stale = Boolean(g?.stale || s?.stale);
    label = 'تغییر معتبر نسبت طلا/نقره';
  }

  if (value == null || !Number.isFinite(value)) return { fire: false, reason: 'missing_data' };
  if (stale) return { fire: false, reason: 'stale_or_unit' };
  if (!crossedThreshold(value, alert.threshold, alert.direction)) {
    return { fire: false, reason: 'not_met' };
  }

  const observedAt = new Date(metrics.observedAt);
  const edgeKey = [
    alert.conditionType,
    alert.symbol,
    alert.direction,
    alert.threshold,
    value.toFixed(6),
    observedAt.toISOString().slice(0, 16),
  ].join('|');

  const dirFa = alert.direction === 'above' ? 'بالاتر از' : alert.direction === 'below' ? 'پایین‌تر از' : 'عبور از';
  const message = `هشدار تغییر بازار: ${label} ${dirFa} آستانهٔ ${alert.threshold} (مقدار فعلی ${value.toFixed(2)}). این توصیهٔ خرید یا فروش نیست.`;

  return { fire: true, metricValue: value, observedAt, edgeKey, message };
}

/** After a fire, re-arm only when the condition is no longer true. */
export function shouldRearmAlert(
  alert: Pick<AlertEvalInput, 'conditionType' | 'symbol' | 'unit' | 'direction' | 'threshold'>,
  metrics: MarketSnapshotMetrics,
): boolean {
  let value: number | null = null;
  if (alert.conditionType === 'PRICE_CROSS') {
    value = metrics.prices[alert.symbol]?.value ?? null;
  } else if (alert.conditionType === 'GAP_PCT_CROSS') {
    const key = alert.symbol === 'GOLD_BUBBLE' || alert.symbol === 'gold' ? 'gold'
      : alert.symbol === 'USD_BUBBLE' || alert.symbol === 'usd' ? 'usd'
      : 'silver';
    value = metrics.gaps[key]?.percent ?? null;
  } else {
    value = metrics.goldSilverRelativePct;
  }
  if (value == null || !Number.isFinite(value)) return false;
  return !conditionStillTrue(value, alert.threshold, alert.direction);
}

export function channelDeliveryReady(channel: MarketAlertChannel): {
  ready: boolean;
  status: 'ACTIVE' | 'NEEDS_SERVICE' | 'NEEDS_CONSENT';
  note: string;
} {
  if (channel === 'IN_APP') {
    return { ready: true, status: 'ACTIVE', note: 'اعلان داخل سایت' };
  }
  if (channel === 'PUSH') {
    return {
      ready: false,
      status: 'NEEDS_CONSENT',
      note: 'Push فقط پس از اتصال واقعی سرویس و رضایت کاربر فعال می‌شود.',
    };
  }
  return {
    ready: false,
    status: 'NEEDS_SERVICE',
    note: 'SMS فقط پس از اتصال سرویس، شمارهٔ تأییدشده، رضایت و کنترل هزینه فعال می‌شود.',
  };
}
