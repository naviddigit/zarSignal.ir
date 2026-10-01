-- CreateTable
CREATE TABLE IF NOT EXISTS "AnalysisRead" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "symbol" TEXT,
    "completedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "AnalysisRead_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "AnalysisFeedback" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "reportId" TEXT NOT NULL,
    "schemaVersion" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" VARCHAR(500),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "AnalysisFeedback_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "AnalysisRead_userId_reportId_schemaVersion_key"
  ON "AnalysisRead"("userId", "reportId", "schemaVersion");

CREATE INDEX IF NOT EXISTS "AnalysisRead_userId_completedAt_idx"
  ON "AnalysisRead"("userId", "completedAt");

CREATE UNIQUE INDEX IF NOT EXISTS "AnalysisFeedback_userId_reportId_schemaVersion_key"
  ON "AnalysisFeedback"("userId", "reportId", "schemaVersion");

CREATE INDEX IF NOT EXISTS "AnalysisFeedback_userId_updatedAt_idx"
  ON "AnalysisFeedback"("userId", "updatedAt");

-- AddForeignKey
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AnalysisRead_userId_fkey') THEN
    ALTER TABLE "AnalysisRead"
      ADD CONSTRAINT "AnalysisRead_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'AnalysisFeedback_userId_fkey') THEN
    ALTER TABLE "AnalysisFeedback"
      ADD CONSTRAINT "AnalysisFeedback_userId_fkey"
      FOREIGN KEY ("userId") REFERENCES "User"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
