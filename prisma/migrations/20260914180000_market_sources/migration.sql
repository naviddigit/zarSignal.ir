CREATE TABLE "MarketSource" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT false,
    "pollSeconds" INTEGER NOT NULL DEFAULT 300,
    "config" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "MarketSource_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX "MarketSource_key_key" ON "MarketSource"("key");
CREATE INDEX "MarketSource_enabled_idx" ON "MarketSource"("enabled");
