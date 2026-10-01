-- Additive silver V5.4 history fields (non-destructive)
ALTER TABLE "MarketInputSnapshot" ADD COLUMN IF NOT EXISTS "xagUsdMid" DECIMAL(24,6);
ALTER TABLE "MarketInputSnapshot" ADD COLUMN IF NOT EXISTS "xagUsdObservedAt" TIMESTAMP(3);
ALTER TABLE "BubbleSnapshot" ADD COLUMN IF NOT EXISTS "usdImplied" DECIMAL(24,6);
ALTER TABLE "BubbleSnapshot" ADD COLUMN IF NOT EXISTS "usdGapPercent" DECIMAL(24,8);
