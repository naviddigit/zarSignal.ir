# Phase B1 — implementation record

Scope: server-side Asia/Tehran reliability policy, admin configuration/audit, per-user acknowledgement. No engine, confidence, signal, marker or Silver formula activation. No production deployment.

SMS owner decision (2026-09-28): Kavenegar is the selected provider. No sending implemented/activated in B1. ANALYSIS_STATE_CHANGE remains EXPERIMENTAL; SMS/WhatsApp production remain off.

## Storage
Migration: prisma/migrations/20260927120000_analysis_time_reliability/migration.sql
- AnalysisTimePolicy: append-only application writes; serial order, unique version, fixed timezone, validated warningStart/End, actor and createdAt.
- AnalysisPolicyAudit: previous/new JSON, actor, timestamp, policyVersion relation; committed in the same transaction under a shared advisory lock.
- AnalysisAcknowledgement: userId FK, unique server-generated requestId, nullable reportId, assetId, warningPolicyVersion, acknowledgedAt. No AnalysisSnapshot mutation.
- Default version approved-default-v1 is usable without stored policy. DB unavailable: default gate remains; acceptance cannot be falsely recorded.
- Bootstrap admin audit actor = bootstrap-admin (shared administrative credential, not a named human). Authenticated admin actor = user:<database id>.

## Request scope
Acceptance is valid only for the same authenticated user, request ID, asset and active policy version. URL request ID alone cannot grant access. A new navigation without that request requires fresh acceptance during WARNING. Policy change invalidates old acceptance. Future engine must bind request/report atomically; no engine permission token is issued now.

## API/UI
POST /api/admin/analysis-settings authenticates admin server-side before validation/storage and rejects cross-origin writes.
/admin/analysis-settings uses existing fields/theme controls, pending/result messages and last 10 audit entries.
/analysis/[symbol] evaluates server time only, withholds page content during warning until acceptance. Entry/decline/login flow does not generate trading decisions. Existing API /api/v1/analysis remains unavailable with no result.
The requested warning sentences were removed per owner instruction; the page after acceptance still states engine unavailable.

## Limits
No original V5.4 executable contract, Confidence, Reason/Risk/state registry or approved V5.4 fixtures supplied. They remain SOURCE_REQUIRED. Anonymous users must authenticate before acceptance can be associated with a user.

## Verification (local only)
- `npm test`: 69/69 passed, including all seven requested Tehran boundaries, daytime/overnight validation and host timezone independence.
- `npx tsc --noEmit`: passed.
- `npm run build`: passed (Next.js 16.3.5). Migration execution was NOT added to build.
- `tests/time-reliability.integration.test.ts`: passed against isolated PostgreSQL 18 on 127.0.0.1:55439/b1_reliability. Tests real policy/audit writes, transaction rollback when audit fails, fallback, user A/B isolation, wrong asset and policy invalidation.
- `node scripts/verify-b1.mjs`: passed in WebKit with isolated fixture sessions: admin save feedback, 401 anonymous, 403 cross-origin, 400 equal endpoints, warning at 360/390/430, withheld analysis, explicit acceptance, other-user denial, policy invalidation, browser timezone independence.
- Screenshots visually reviewed: `artifacts/phase-b1/admin-desktop.png`, `admin-mobile-dark.png`, and `warning-360.png`, `warning-390.png`, `warning-430.png`. Screenshot warning hours are a deliberately configured test window around test execution time, NOT changed application defaults. Tested via WebKit, not a physical iPhone.
- Mobile admin intrinsic-width overflow found during screenshot review was corrected. Cards now have separation and values use theme text colors.

## Migration status / release blocker
The new B1 migration applied successfully in the isolated database. No production DB migration was executed. Main application DB must receive the reviewed migration before policy saves and acknowledgements can persist; reads fall back safely meanwhile.

Fresh-database replay found an existing UTF-8 BOM in `20260921170000_bubble_history_snapshots/migration.sql` that PostgreSQL rejected. For this isolated test only, a normalized copy outside the repository was executed and that migration marked applied. The historical repository migration was not changed. Review migration history before any production rollout; do not blindly replay or rewrite an applied migration.

## B1 files
- `prisma/schema.prisma`; `prisma/migrations/20260927120000_analysis_time_reliability/migration.sql`
- `src/lib/time-reliability.ts`; `src/server/time-reliability.ts`; `src/server/admin-auth.ts`
- `src/app/api/admin/analysis-settings/route.ts`
- `src/app/admin/(protected)/analysis-settings/page.tsx`, `loading.tsx`; protected admin `layout.tsx`
- `src/components/analysis-time-settings.tsx`; `src/components/analysis-reliability-warning.tsx`
- `src/app/analysis/actions.ts`; `src/app/analysis/[symbol]/page.tsx`; `src/app/theme.css`
- `tests/time-reliability.test.ts`; `tests/time-reliability.integration.test.ts`; `scripts/verify-b1.mjs`; `package.json`; `e2e/product-preview.spec.ts`
- This report and local screenshot artifacts. Earlier calculator/homepage/contract changes remain separate existing working-tree changes.

No push, deployment, trading engine activation, confidence adjustment, analysis markers or SMS sending was performed.
