CREATE TABLE "FormulaVersion" (
  "id" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "marketSymbol" TEXT NOT NULL,
  "version" INTEGER NOT NULL,
  "title" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "expression" TEXT NOT NULL,
  "inputs" JSONB NOT NULL,
  "units" JSONB NOT NULL,
  "constants" JSONB NOT NULL,
  "rounding" TEXT NOT NULL,
  "edgeCases" JSONB NOT NULL,
  "fixtures" JSONB NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "effectiveAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "FormulaVersion_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "FormulaVersion_key_version_key" ON "FormulaVersion"("key", "version");
CREATE INDEX "FormulaVersion_key_status_effectiveAt_idx" ON "FormulaVersion"("key", "status", "effectiveAt");
