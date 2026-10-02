-- Admin customer audit, feedback review columns, rate limits, SUSPENDED status
ALTER TABLE "AnalysisFeedback" ADD COLUMN IF NOT EXISTS "reviewedAt" TIMESTAMP(3);
ALTER TABLE "AnalysisFeedback" ADD COLUMN IF NOT EXISTS "reviewedBy" TEXT;
CREATE INDEX IF NOT EXISTS "AnalysisFeedback_reviewedAt_idx" ON "AnalysisFeedback"("reviewedAt");

DO $$ BEGIN
  ALTER TYPE "SubscriptionStatus" ADD VALUE IF NOT EXISTS 'SUSPENDED';
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE TABLE IF NOT EXISTS "AdminAccessAudit" (
    "id" TEXT NOT NULL,
    "actor" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "reason" TEXT,
    "previousValue" JSONB NOT NULL,
    "nextValue" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AdminAccessAudit_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "RateLimitBucket" (
    "id" TEXT NOT NULL,
    "nextAllowedAt" TIMESTAMP(3) NOT NULL,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "RateLimitBucket_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "AdminAccessAudit_userId_createdAt_idx" ON "AdminAccessAudit"("userId", "createdAt" DESC);
CREATE INDEX IF NOT EXISTS "AdminAccessAudit_createdAt_idx" ON "AdminAccessAudit"("createdAt" DESC);

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AdminAccessAudit_userId_fkey') THEN
    ALTER TABLE "AdminAccessAudit" ADD CONSTRAINT "AdminAccessAudit_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
