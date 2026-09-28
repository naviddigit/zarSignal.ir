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

export type CalculatorOperation = 'mazanehTo18k' | 'market18kToMazaneh' | 'goldBubble' | 'usdGap';

export type CalculatorResult = {
  formulaId: string;
  version: string;
  calculatedAt: string;
  outputs: { label: string; value: number; unit: string }[];
  inputs: {
    key: string;
    label: string;
    value: number;
    unit: string;
    provenance: 'LIVE' | 'MANUAL' | 'CONSTANT';
    observedAt: string | null;
    source: string;
  }[];
  constants: { label: string; provenance: 'CONSTANT'; version: string }[];
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

export async function postSimpleCalculator(
  operation: 'mazanehTo18k' | 'market18kToMazaneh',
  value: number,
): Promise<{ value: number; version?: string }> {
  const response = await fetch(`${apiBase()}/api/public/calculator`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operation, value }),
  });
  if (!response.ok) throw new Error('calc_failed');
  return response.json();
}

export async function postProfessionalCalculator(
  operation: CalculatorOperation,
  inputs: Record<string, { provenance: 'LIVE' | 'MANUAL'; value?: number }>,
): Promise<CalculatorResult> {
  const response = await fetch(`${apiBase()}/api/public/calculator/professional`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ operation, inputs }),
  });
  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(typeof data?.error === 'string' ? data.error : 'calc_failed');
  }
  return response.json();
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
