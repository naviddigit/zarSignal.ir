import { isStale, type Quote } from './market';

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

/** Presentation freshness only: never turns a missing model into HOLD or paywall. */
export function bubbleDisplayState(card: LiveBubbleCard | undefined, inputs: Quote[], now?: number): LiveBubbleCard['status'] {
  if (!card) return 'unavailable';
  if (card.status !== 'ok') return card.status;
  if (card.percent == null || !Number.isFinite(card.percent) || inputs.length === 0) return 'unavailable';
  return inputs.some(quote => isStale(quote, now)) ? 'stale' : 'ok';
}
