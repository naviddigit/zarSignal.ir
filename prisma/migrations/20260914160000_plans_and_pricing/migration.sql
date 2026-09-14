CREATE TYPE "BillingPeriod" AS ENUM ('MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_TIME');
CREATE TABLE "Plan" ("id" TEXT NOT NULL,"title" TEXT NOT NULL,"slug" TEXT NOT NULL,"features" JSONB NOT NULL,"apiLimits" JSONB,"active" BOOLEAN NOT NULL DEFAULT false,"displayOrder" INTEGER NOT NULL DEFAULT 0,"webAvailable" BOOLEAN NOT NULL DEFAULT true,"mobileAvailable" BOOLEAN NOT NULL DEFAULT false,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "Plan_pkey" PRIMARY KEY ("id"));
CREATE TABLE "PricingVersion" ("id" TEXT NOT NULL,"planId" TEXT NOT NULL,"price" DECIMAL(18,0) NOT NULL,"currency" TEXT NOT NULL,"billingPeriod" "BillingPeriod" NOT NULL,"discount" DECIMAL(5,2),"effectiveAt" TIMESTAMP(3) NOT NULL,"active" BOOLEAN NOT NULL DEFAULT false,"createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,"updatedAt" TIMESTAMP(3) NOT NULL,CONSTRAINT "PricingVersion_pkey" PRIMARY KEY ("id"));
CREATE UNIQUE INDEX "Plan_slug_key" ON "Plan"("slug");
CREATE INDEX "Plan_active_displayOrder_idx" ON "Plan"("active","displayOrder");
CREATE INDEX "PricingVersion_planId_active_effectiveAt_idx" ON "PricingVersion"("planId","active","effectiveAt");
ALTER TABLE "PricingVersion" ADD CONSTRAINT "PricingVersion_planId_fkey" FOREIGN KEY ("planId") REFERENCES "Plan"("id") ON DELETE CASCADE ON UPDATE CASCADE;
