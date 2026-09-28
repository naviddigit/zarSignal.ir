export type LiveBubbleCard = {
  key: 'GOLD_BUBBLE' | 'SILVER_BUBBLE' | 'USD_BUBBLE';
  status: 'ok' | 'stale' | 'unavailable' | 'blocked';
  percent: number | null;
  theoretical: number | null;
  reason: string;
  provenance?: 'DERIVED' | 'LIVE';
  formulaVersion?: string;
  conversionVersion?: string;
};
