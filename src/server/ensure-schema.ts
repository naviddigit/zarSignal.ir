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
    "xagUsdMid" DECIMAL(24,6),
    "xagUsdObservedAt" TIMESTAMP(3),
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
    "usdImplied" DECIMAL(24,6),
    "usdGapPercent" DECIMAL(24,8),
    "status" TEXT NOT NULL,
    "computedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "capturedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "BubbleSnapshot_pkey" PRIMARY KEY ("id")
  )`,
  `ALTER TABLE "MarketInputSnapshot" ADD COLUMN IF NOT EXISTS "xagUsdMid" DECIMAL(24,6)`,
  `ALTER TABLE "MarketInputSnapshot" ADD COLUMN IF NOT EXISTS "xagUsdObservedAt" TIMESTAMP(3)`,
  `ALTER TABLE "BubbleSnapshot" ADD COLUMN IF NOT EXISTS "usdImplied" DECIMAL(24,6)`,
  `ALTER TABLE "BubbleSnapshot" ADD COLUMN IF NOT EXISTS "usdGapPercent" DECIMAL(24,8)`,
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
  `ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "passwordHash" TEXT`,
  `CREATE TABLE IF NOT EXISTS "AnalysisRead" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "symbol" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalysisRead_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "AnalysisFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AnalysisFeedback_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "AnalysisRead_userId_reportId_schemaVersion_key"
    ON "AnalysisRead"("userId", "reportId", "schemaVersion")`,
  `CREATE INDEX IF NOT EXISTS "AnalysisRead_userId_completedAt_idx"
    ON "AnalysisRead"("userId", "completedAt")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "AnalysisFeedback_userId_reportId_schemaVersion_key"
    ON "AnalysisFeedback"("userId", "reportId", "schemaVersion")`,
  `CREATE INDEX IF NOT EXISTS "AnalysisFeedback_userId_updatedAt_idx"
    ON "AnalysisFeedback"("userId", "updatedAt")`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AnalysisRead_userId_fkey') THEN
      ALTER TABLE "AnalysisRead"
        ADD CONSTRAINT "AnalysisRead_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AnalysisFeedback_userId_fkey') THEN
      ALTER TABLE "AnalysisFeedback"
        ADD CONSTRAINT "AnalysisFeedback_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id")
        ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$`,
  `ALTER TABLE "AnalysisFeedback" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3)`,
  `ALTER TABLE "AnalysisFeedback" ADD COLUMN IF NOT EXISTS "reviewedBy" TEXT`,
  `CREATE INDEX IF NOT EXISTS "AnalysisFeedback_reviewedAt_idx" ON "AnalysisFeedback"("reviewedAt")`,
  `CREATE TABLE IF NOT EXISTS "MarketChangeAlert" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "conditionType" TEXT NOT NULL,
    "symbol" TEXT NOT NULL,
    "unit" TEXT,
    "direction" TEXT NOT NULL,
    "threshold" DECIMAL(24,8) NOT NULL,
    "channel" TEXT NOT NULL DEFAULT 'IN_APP',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "armed" BOOLEAN NOT NULL DEFAULT true,
    "expiresAt" TIMESTAMP(3),
    "lastFiredAt" TIMESTAMP(3),
    "lastEvaluatedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MarketChangeAlert_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "MarketAlertEvent" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "edgeKey" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "metricValue" DECIMAL(24,8) NOT NULL,
    "message" TEXT NOT NULL,
    "deliveryStatus" TEXT NOT NULL DEFAULT 'RECORDED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MarketAlertEvent_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "InAppNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'MARKET_CHANGE',
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "InAppNotification_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "UserMarketVisitBaseline" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "metricsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserMarketVisitBaseline_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "AdminAccessAudit" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "previousValue" JSONB NOT NULL,
    "nextValue" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminAccessAudit_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE TABLE IF NOT EXISTS "RateLimitBucket" (
    "id" TEXT NOT NULL,
    "nextAllowedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
  )`,
  `CREATE INDEX IF NOT EXISTS "MarketChangeAlert_status_armed_expiresAt_idx" ON "MarketChangeAlert"("status", "armed", "expiresAt")`,
  `CREATE INDEX IF NOT EXISTS "MarketChangeAlert_userId_status_idx" ON "MarketChangeAlert"("userId", "status")`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "MarketAlertEvent_alertId_edgeKey_key" ON "MarketAlertEvent"("alertId", "edgeKey")`,
  `CREATE INDEX IF NOT EXISTS "InAppNotification_userId_createdAt_idx" ON "InAppNotification"("userId", "createdAt" DESC)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS "UserMarketVisitBaseline_userId_scope_key" ON "UserMarketVisitBaseline"("userId", "scope")`,
  `CREATE INDEX IF NOT EXISTS "AdminAccessAudit_userId_createdAt_idx" ON "AdminAccessAudit"("userId", "createdAt" DESC)`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MarketChangeAlert_userId_fkey') THEN
      ALTER TABLE "MarketChangeAlert" ADD CONSTRAINT "MarketChangeAlert_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'MarketAlertEvent_alertId_fkey') THEN
      ALTER TABLE "MarketAlertEvent" ADD CONSTRAINT "MarketAlertEvent_alertId_fkey"
        FOREIGN KEY ("alertId") REFERENCES "MarketChangeAlert"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'InAppNotification_userId_fkey') THEN
      ALTER TABLE "InAppNotification" ADD CONSTRAINT "InAppNotification_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'UserMarketVisitBaseline_userId_fkey') THEN
      ALTER TABLE "UserMarketVisitBaseline" ADD CONSTRAINT "UserMarketVisitBaseline_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$`,
  `DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AdminAccessAudit_userId_fkey') THEN
      ALTER TABLE "AdminAccessAudit" ADD CONSTRAINT "AdminAccessAudit_userId_fkey"
        FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
  END $$`,
  // Production recoveries previously marked the feedback migration applied without
  // running this enum alter — customer access then crashes on SUSPENDED queries.
  `DO $$ BEGIN
    ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';
  EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_object THEN NULL;
  END $$`,
] as const;

const migrationMarkers = [
  '20260921170000_bubble_history_snapshots',
  '20260921190000_symbol_history_bars',
  '20261001180000_user_password_hash',
  '20261002023000_analysis_engagement',
  '20261002140000_market_change_alerts',
  '20261002160000_admin_customer_feedback',
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
