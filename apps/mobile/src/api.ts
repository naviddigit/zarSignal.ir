export type Quote = {
  symbol: string;
  buy: string;
  sell: string;
  currency: string;
  unit: string;
  observedAt: string;
};

export type Snapshot = {
  mode: 'demo' | 'live';
  status: 'demo' | 'ok' | 'stale' | 'unavailable';
  quotes: Quote[];
};

export type LiveBubbleCard = {
  key: 'GOLD_BUBBLE' | 'SILVER_BUBBLE' | 'USD_BUBBLE';
  status: 'ok' | 'stale' | 'unavailable' | 'blocked';
  percent?: number | null;
  reason?: string;
};

const baseUrl = process.env.EXPO_PUBLIC_API_URL;

export function apiBase() {
  if (!baseUrl) throw new Error('API not configured');
  return baseUrl.replace(/\/$/, '');
}

function validateSnapshot(value: unknown): Snapshot {
  if (!value || typeof value !== 'object') throw new Error('Invalid response');
  const data = value as Snapshot;
  if (!['demo', 'live'].includes(data.mode)) throw new Error('Invalid response');
  if (!['demo', 'ok', 'stale', 'unavailable'].includes(data.status)) throw new Error('Invalid response');
  if (!Array.isArray(data.quotes)) throw new Error('Invalid response');
  return data;
}

export async function fetchMarkets(signal?: AbortSignal): Promise<Snapshot> {
  const response = await fetch(`${apiBase()}/api/public/markets`, { signal });
  if (!response.ok) throw new Error('Unavailable');
  return validateSnapshot(await response.json());
}

/** Best-effort; UI stays honest if endpoint is absent. */
export async function fetchBubbles(signal?: AbortSignal): Promise<LiveBubbleCard[]> {
  try {
    const response = await fetch(`${apiBase()}/api/public/bubbles`, { signal });
    if (!response.ok) return [];
    const data = await response.json();
    return Array.isArray(data?.bubbles) ? data.bubbles : Array.isArray(data) ? data : [];
  } catch {
    return [];
  }
}

export const symbolLabels: Record<string, string> = {
  USD: 'دلار آزاد',
  AED: 'درهم',
  GOLD_MELTED: 'مظنه آب‌شده',
  GOLD_18K: 'گرم ۱۸ عیار',
  XAG_USD: 'اونس نقره',
  XAU_USD: 'اونس طلا',
  SILVER_999: 'نقره ۹۹۹',
  SEKE_CASH: 'سکه نقدی',
  ROB_SEKE: 'ربع سکه',
};
