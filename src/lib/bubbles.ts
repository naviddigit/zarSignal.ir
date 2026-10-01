export type LiveBubbleCard = {
  key: 'GOLD_BUBBLE' | 'SILVER_BUBBLE' | 'USD_BUBBLE';
  /** Aligns with existing architecture: ok≈live, stale, unavailable, blocked. DELAYED awaits official threshold Spec. */
  status: 'ok' | 'stale' | 'unavailable' | 'blocked';
  percent: number | null;
  theoretical: number | null;
  reason: string;
  provenance?: 'DERIVED' | 'LIVE';
  formulaVersion?: string;
  conversionVersion?: string;
  gap?: number | null;
  marketPrice?: number | null;
  usdImplied?: number | null;
  silverUsdGapPct?: number | null;
  /** Earliest/latest input observation for UI freshness. */
  observedAt?: string | null;
};

export function freshnessLabel(status: LiveBubbleCard['status']): string {
  if (status === 'ok') return 'تازه';
  if (status === 'stale') return 'قدیمی';
  if (status === 'blocked') return 'مسدود';
  return 'ناموجود';
}
