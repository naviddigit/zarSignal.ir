CREATE TABLE "AnalysisTimePolicy" (
 "id" SERIAL PRIMARY KEY, "version" TEXT NOT NULL UNIQUE,
 "timezone" TEXT NOT NULL DEFAULT 'Asia/Tehran', "warningStart" TEXT NOT NULL, "warningEnd" TEXT NOT NULL,
 "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP, "actor" TEXT NOT NULL,
 CONSTRAINT "analysis_policy_time_valid" CHECK (
 "timezone" = 'Asia/Tehran' AND "warningStart" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'
 AND "warningEnd" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "warningStart" <> "warningEnd")
);
CREATE TABLE "AnalysisPolicyAudit" (
 "id" TEXT PRIMARY KEY, "actor" TEXT NOT NULL, "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "previousValue" JSONB NOT NULL, "newValue" JSONB NOT NULL, "policyVersion" TEXT NOT NULL UNIQUE,
 FOREIGN KEY ("policyVersion") REFERENCES "AnalysisTimePolicy"("version") ON DELETE RESTRICT
);
CREATE TABLE "AnalysisAcknowledgement" (
 "id" TEXT PRIMARY KEY, "userId" TEXT NOT NULL, "requestId" TEXT NOT NULL UNIQUE,
 "reportId" TEXT, "assetId" TEXT NOT NULL, "warningPolicyVersion" TEXT NOT NULL,
 "acknowledgedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT
);
CREATE INDEX "AnalysisAcknowledgement_userId_requestId_warningPolicyVersion_idx"
 ON "AnalysisAcknowledgement"("userId", "requestId", "warningPolicyVersion");
