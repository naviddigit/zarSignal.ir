-- Symbol OHLC history for charts (Faraz chart-history seed, ~3 months+)
CREATE TABLE IF NOT EXISTS "SymbolHistoryBar" (
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
);

CREATE UNIQUE INDEX IF NOT EXISTS "SymbolHistoryBar_source_symbol_resolution_openTime_key"
ON "SymbolHistoryBar"("source", "symbol", "resolution", "openTime");

CREATE INDEX IF NOT EXISTS "SymbolHistoryBar_symbol_resolution_openTime_idx"
ON "SymbolHistoryBar"("symbol", "resolution", "openTime");
