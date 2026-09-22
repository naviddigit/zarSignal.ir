import { createHash, randomUUID } from 'node:crypto';
import { db } from '@/lib/db';

const statements = [
  `CREATE TABLE IF NOT EXISTS "MarketInputSnapshot" (
    "id" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mode" TEXT NOT NULL,
    "quality" TEXT NOT NULL,
    "goldMeltedMid" DECIMAL(24,6),
    "goldMeltedBid" DECIMAL(24,6),
    "goldMeltedAsk" DECIMAL(24,6),
    "goldMeltedObservedAt" TIMESTAMP(3),
    "xauUsdMid" DECIMAL(24,6),
    "xauUsdBid" DECIMAL(24,6),
    "xauUsdAsk" DECIMAL(24,6),
    "xauUsdObservedAt" TIMESTAMP(3),
    "usdIrtMid" DECIMAL(24,6),
    "usdIrtBid" DECIMAL(24,6),
    "usdIrtAsk" DECIMAL(24,6),
    "usdIrtObservedAt" TIMESTAMP(3),
    "market18k" DECIMAL(24,6),
    "mazanehVersion" TEXT,
    "silver999Mid" DECIMAL(24,6),
    "silver999ObservedAt" TIMESTAMP(3),
    CONSTRAINT "MarketInputSnapshot_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "BubbleSnapshot" (
    "id" TEXT NOT NULL,
    "inputSnapshotId" TEXT NOT NULL,
    "instrumentKey" TEXT NOT NULL,
    "formulaId" TEXT NOT NULL,
    "formulaVersion" TEXT NOT NULL,
    "conversionVersion" TEXT,
    "provenance" TEXT NOT NULL,
    "marketPrice" DECIMAL(24,6),
    "marketBid" DECIMAL(24,6),
    "marketAsk" DECIMAL(24,6),
    "theoreticalPrice" DECIMAL(24,6),
    "bubbleAbsolute" DECIMAL(24,8),
    "bubblePercent" DECIMAL(24,8),
    "status" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BubbleSnapshot_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "MarketInputSnapshot_capturedAt_idx" ON "MarketInputSnapshot"("capturedAt" DESC)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "BubbleSnapshot_inputSnapshotId_formulaId_key" ON "BubbleSnapshot"("inputSnapshotId", "formulaId")`,
  `CREATE INDEX IF NOT EXISTS "BubbleSnapshot_formulaId_capturedAt_idx" ON "BubbleSnapshot"("formulaId", "capturedAt" DESC)`,
  `CREATE INDEX IF NOT EXISTS "BubbleSnapshot_instrumentKey_capturedAt_idx" ON "BubbleSnapshot"("instrumentKey", "capturedAt" DESC)`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'BubbleSnapshot_inputSnapshotId_fkey') THEN
      ALTER TABLE "BubbleSnapshot"
        ADD CONSTRAINT "BubbleSnapshot_inputSnapshotId_fkey"
        FOREIGN KEY ("inputSnapshotId") REFERENCES "MarketInputSnapshot"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$`,
  `CREATE TABLE IF NOT EXISTS "SymbolHistoryBar" (
    "id" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "source" TEXT NOT NULL,
    "resolution" TEXT NOT NULL,
    "openTime" TIMESTAMP(3) NOT NULL,
    "open" DECIMAL(24,6) NOT NULL,
    "high" DECIMAL(24,6) NOT NULL,
    "low" DECIMAL(24,6) NOT NULL,
    "close" DECIMAL(24,6) NOT NULL,
    "volume" DECIMAL(24,6),
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "SymbolHistoryBar_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "SymbolHistoryBar_source_symbol_resolution_openTime_key"
    ON "SymbolHistoryBar"("source", "symbol", "resolution", "openTime")`,
  `CREATE INDEX IF NOT EXISTS "SymbolHistoryBar_symbol_resolution_openTime_idx"
    ON "SymbolHistoryBar"("symbol", "resolution", "openTime")`,
] as const;

const migrationMarkers = [
  '20260921170000_bubble_history_snapshots',
  '20260921190000_symbol_history_bars',
] as const;

async function markMigration(name: string) {
  const checksum = createHash('sha256').update(name).digest('hex');
  await db.$executeRawUnsafe(
    `INSERT INTO "_prisma_migrations" ("id","checksum","finished_at","migration_name","logs","rolled_back_at","started_at","applied_steps_count")
     SELECT $1, $2, NOW(), $3, NULL, NULL, NOW(), 1
     WHERE NOT EXISTS (SELECT 1 FROM "_prisma_migrations" WHERE "migration_name" = $3)`,
    randomUUID(),
    checksum,
    name,
  );
}

/** Idempotent production schema recovery when migrate-on-build is unavailable. */
export async function ensureHistorySchema() {
  for (const statement of statements) {
    await db.$executeRawUnsafe(statement);
  }
  for (const name of migrationMarkers) {
    await markMigration(name).catch(() => undefined);
  }
  return { ok: true as const, tables: ['MarketInputSnapshot', 'BubbleSnapshot', 'SymbolHistoryBar'] };
}
