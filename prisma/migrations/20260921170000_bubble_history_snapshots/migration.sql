-- Historical calculation snapshots (Price + Bubble at time T)
CREATE TABLE IF NOT EXISTS "MarketInputSnapshot" (
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
);

CREATE TABLE IF NOT EXISTS "BubbleSnapshot" (
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
);

CREATE INDEX IF NOT EXISTS "MarketInputSnapshot_capturedAt_idx" ON "MarketInputSnapshot"("capturedAt" DESC);
CREATE UNIQUE INDEX IF NOT EXISTS "BubbleSnapshot_inputSnapshotId_formulaId_key" ON "BubbleSnapshot"("inputSnapshotId", "formulaId");
CREATE INDEX IF NOT EXISTS "BubbleSnapshot_formulaId_capturedAt_idx" ON "BubbleSnapshot"("formulaId", "capturedAt" DESC);
CREATE INDEX IF NOT EXISTS "BubbleSnapshot_instrumentKey_capturedAt_idx" ON "BubbleSnapshot"("instrumentKey", "capturedAt" DESC);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'BubbleSnapshot_inputSnapshotId_fkey'
  ) THEN
    ALTER TABLE "BubbleSnapshot"
      ADD CONSTRAINT "BubbleSnapshot_inputSnapshotId_fkey"
      FOREIGN KEY ("inputSnapshotId") REFERENCES "MarketInputSnapshot"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
