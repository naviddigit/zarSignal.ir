import { db } from '@/lib/db';
import { goldBubble, usdGap, FORMULA_VERSION } from '@/server/bubble-formulas';
import { mazanehTo18k, MAZANEH_TO_18K_VERSION } from '@/lib/mazaneh-to-18k';

type QuoteRow = {
  symbol: string;
  buy: number;
  sell: number;
  observedAt: Date;
};

const mid = (buy: number, sell: number) => (buy + sell) / 2;

function pick(quotes: QuoteRow[], symbol: string) {
  return quotes.find(item => item.symbol === symbol);
}

/** Persist synchronized inputs + bubble metrics for chart history. Never recomputes later from live XAU/USD. */
export async function recordBubbleSnapshots(quotes: QuoteRow[], mode: 'live' | 'demo' = 'live') {
  if (mode !== 'live' || quotes.length === 0) return { saved: 0 };

  const melted = pick(quotes, 'GOLD_MELTED');
  const xau = pick(quotes, 'XAU_USD');
  const usd = pick(quotes, 'USD');
  const capturedAt = new Date();

  const goldMeltedMid = melted ? mid(melted.buy, melted.sell) : null;
  const xauUsdMid = xau ? mid(xau.buy, xau.sell) : null;
  const usdIrtMid = usd ? mid(usd.buy, usd.sell) : null;

  let market18k: number | null = null;
  let quality: 'ok' | 'partial' = 'partial';
  if (goldMeltedMid && goldMeltedMid > 0) {
    try {
      market18k = mazanehTo18k(goldMeltedMid).market18k;
    } catch { market18k = null; }
  }
  if (market18k && xauUsdMid && usdIrtMid) quality = 'ok';

  const input = await db.marketInputSnapshot.create({
    data: {
      capturedAt,
      mode,
      quality,
      goldMeltedMid,
      goldMeltedBid: melted?.buy ?? null,
      goldMeltedAsk: melted?.sell ?? null,
      goldMeltedObservedAt: melted?.observedAt ?? null,
      xauUsdMid,
      xauUsdBid: xau?.buy ?? null,
      xauUsdAsk: xau?.sell ?? null,
      xauUsdObservedAt: xau?.observedAt ?? null,
      usdIrtMid,
      usdIrtBid: usd?.buy ?? null,
      usdIrtAsk: usd?.sell ?? null,
      usdIrtObservedAt: usd?.observedAt ?? null,
      market18k,
      mazanehVersion: market18k ? MAZANEH_TO_18K_VERSION : null,
    },
  });

  const rows: {
    inputSnapshotId: string;
    instrumentKey: string;
    formulaId: string;
    formulaVersion: string;
    conversionVersion: string | null;
    provenance: string;
    marketPrice: number | null;
    marketBid: number | null;
    marketAsk: number | null;
    theoreticalPrice: number | null;
    bubbleAbsolute: number | null;
    bubblePercent: number | null;
    status: string;
    capturedAt: Date;
  }[] = [];

  if (quality === 'ok' && market18k && xauUsdMid && usdIrtMid) {
    try {
      const gold = goldBubble({ xauUsd: xauUsdMid, usdIrt: usdIrtMid, market18k });
      rows.push({
        inputSnapshotId: input.id,
        instrumentKey: 'GOLD_18K',
        formulaId: 'GOLD_BUBBLE',
        formulaVersion: FORMULA_VERSION,
        conversionVersion: MAZANEH_TO_18K_VERSION,
        provenance: 'DERIVED',
        marketPrice: market18k,
        marketBid: null,
        marketAsk: null,
        theoreticalPrice: gold.theoretical,
        bubbleAbsolute: gold.gap,
        bubblePercent: gold.percent,
        status: 'ok',
        capturedAt,
      });
      const dollar = usdGap({ xauUsd: xauUsdMid, market18k, actualUsd: usdIrtMid });
      rows.push({
        inputSnapshotId: input.id,
        instrumentKey: 'USD_IRT',
        formulaId: 'USD_GAP',
        formulaVersion: FORMULA_VERSION,
        conversionVersion: MAZANEH_TO_18K_VERSION,
        provenance: 'DERIVED',
        marketPrice: usdIrtMid,
        marketBid: usd?.buy ?? null,
        marketAsk: usd?.sell ?? null,
        theoreticalPrice: dollar.theoretical,
        bubbleAbsolute: dollar.gap,
        bubblePercent: dollar.percent,
        status: 'ok',
        capturedAt,
      });
    } catch {
      /* leave input-only audit row */
    }
  }

  if (rows.length) await db.bubbleSnapshot.createMany({ data: rows });
  return { saved: rows.length, inputId: input.id };
}

export async function getBubbleHistory(formulaId: 'GOLD_BUBBLE' | 'USD_GAP', rangeHours: number) {
  const since = new Date(Date.now() - rangeHours * 3_600_000);
  const rows = await db.bubbleSnapshot.findMany({
    where: { formulaId, capturedAt: { gte: since }, status: 'ok', bubblePercent: { not: null } },
    orderBy: { capturedAt: 'asc' },
    select: {
      capturedAt: true,
      marketPrice: true,
      theoreticalPrice: true,
      bubblePercent: true,
      status: true,
    },
  });
  return rows.map(row => ({
    t: row.capturedAt.toISOString(),
    marketPrice: row.marketPrice == null ? null : Number(row.marketPrice),
    theoreticalPrice: row.theoreticalPrice == null ? null : Number(row.theoreticalPrice),
    bubblePercent: row.bubblePercent == null ? null : Number(row.bubblePercent),
    status: row.status,
  }));
}
