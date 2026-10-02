-- Market-change alerts, in-app notifications, last-visit baselines
CREATE TABLE "MarketChangeAlert" (
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
);

CREATE TABLE "MarketAlertEvent" (
    "id" TEXT NOT NULL,
    "alertId" TEXT NOT NULL,
    "edgeKey" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "metricValue" DECIMAL(24,8) NOT NULL,
    "message" TEXT NOT NULL,
    "deliveryStatus" TEXT NOT NULL DEFAULT 'RECORDED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MarketAlertEvent_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "InAppNotification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "href" TEXT,
    "kind" TEXT NOT NULL DEFAULT 'MARKET_CHANGE',
    "readAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "InAppNotification_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserMarketVisitBaseline" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "scope" TEXT NOT NULL,
    "observedAt" TIMESTAMP(3) NOT NULL,
    "metricsJson" JSONB NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "UserMarketVisitBaseline_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "MarketChangeAlert_status_armed_expiresAt_idx" ON "MarketChangeAlert"("status", "armed", "expiresAt");
CREATE INDEX "MarketChangeAlert_userId_status_idx" ON "MarketChangeAlert"("userId", "status");
CREATE INDEX "MarketChangeAlert_conditionType_symbol_idx" ON "MarketChangeAlert"("conditionType", "symbol");
CREATE UNIQUE INDEX "MarketAlertEvent_alertId_edgeKey_key" ON "MarketAlertEvent"("alertId", "edgeKey");
CREATE INDEX "MarketAlertEvent_createdAt_idx" ON "MarketAlertEvent"("createdAt");
CREATE INDEX "InAppNotification_userId_createdAt_idx" ON "InAppNotification"("userId", "createdAt" DESC);
CREATE INDEX "InAppNotification_userId_readAt_idx" ON "InAppNotification"("userId", "readAt");
CREATE UNIQUE INDEX "UserMarketVisitBaseline_userId_scope_key" ON "UserMarketVisitBaseline"("userId", "scope");
CREATE INDEX "UserMarketVisitBaseline_userId_updatedAt_idx" ON "UserMarketVisitBaseline"("userId", "updatedAt");

ALTER TABLE "MarketChangeAlert" ADD CONSTRAINT "MarketChangeAlert_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MarketAlertEvent" ADD CONSTRAINT "MarketAlertEvent_alertId_fkey" FOREIGN KEY ("alertId") REFERENCES "MarketChangeAlert"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "InAppNotification" ADD CONSTRAINT "InAppNotification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UserMarketVisitBaseline" ADD CONSTRAINT "UserMarketVisitBaseline_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
