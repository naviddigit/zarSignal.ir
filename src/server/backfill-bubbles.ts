import { Prisma } from '@prisma/client';
import { db } from '@/lib/db';
import { DAILY_PROVENANCE, synchronizedDailyBubbles } from '@/lib/daily-bubbles';
import { MAZANEH_TO_18K_VERSION } from '@/lib/mazaneh-to-18k';
import { ensureHistorySchema } from '@/server/ensure-schema';
import { FARAZ_KEY } from '@/server/ingestion/faraz';

export async function backfillBubbleHistory({ days = 90 } = {}) {
  if (!Number.isInteger(days) || days < 1 || days > 90) throw new Error('invalid_days');
  await ensureHistorySchema();
  const bars = await db.symbolHistoryBar.findMany({ where: {
    source: FARAZ_KEY, resolution: '1D', symbol: { in: ['GOLD_MELTED', 'XAU_USD', 'USD'] },
    openTime: { gte: new Date(Date.now() - days * 86_400_000) },
  }, select: { symbol: true, openTime: true, close: true } });
  const rows = synchronizedDailyBubbles(bars.map(bar => ({ ...bar, close: Number(bar.close) })));
  if (!rows.length) return { days: 0, snapshots: 0, reason: 'no_synchronized_daily_inputs' };
  // Two bulk statements, one atomic transaction. Stable IDs make retries/concurrent runs idempotent.
  const [, createdSnapshots] = await db.$transaction([
    db.$executeRaw(Prisma.sql`INSERT INTO "MarketInputSnapshot"
      ("id","capturedAt","mode","quality","goldMeltedMid","goldMeltedObservedAt","xauUsdMid","xauUsdObservedAt","usdIrtMid","usdIrtObservedAt","market18k","mazanehVersion")
      VALUES ${Prisma.join(rows.map(r => Prisma.sql`(${r.id},${r.capturedAt},'historical_daily','daily_aligned',${r.melted.close},${r.melted.openTime},${r.xau.close},${r.xau.openTime},${r.usd.close},${r.usd.openTime},${r.market18k},${MAZANEH_TO_18K_VERSION})`))}
      ON CONFLICT ("id") DO NOTHING`),
    db.$executeRaw(Prisma.sql`INSERT INTO "BubbleSnapshot"
      ("id","inputSnapshotId","instrumentKey","formulaId","formulaVersion","conversionVersion","provenance","marketPrice","theoreticalPrice","bubbleAbsolute","bubblePercent","status","capturedAt")
      VALUES ${Prisma.join(rows.flatMap(r => [r.gold, r.dollar].map(result => Prisma.sql`(
        ${`${r.id}:${result.formulaId}`},${r.id},${result.formulaId === 'GOLD_BUBBLE' ? 'GOLD_18K' : 'USD_IRT'},${result.formulaId},${result.formulaVersion},${MAZANEH_TO_18K_VERSION},${DAILY_PROVENANCE},${result.formulaId === 'GOLD_BUBBLE' ? r.market18k : r.usd.close},${result.theoretical},${result.gap},${result.percent},'ok',${r.capturedAt})`)))}
      ON CONFLICT ("inputSnapshotId","formulaId") DO NOTHING`),
  ]);
  return { days: rows.length, snapshots: rows.length * 2, createdSnapshots, firstDay: rows[0].day, lastDay: rows.at(-1)!.day };
}
