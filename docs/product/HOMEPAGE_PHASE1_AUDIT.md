# ZarSignal Homepage — Phase 1 audit and delivery

Date: 2026-09-26. Scope: user-authorized A–K only. No deployment or production messaging.

## Inputs and repository baseline

- Read the complete `docs/ZarSignal_Astra_Homepage_Brief_FA.md` (actual repository spelling of the supplied path).
- Read Product Spec, Governance, Project Memory, START, Formula Registry, bubble/mazaneh specifications, calculator coverage, decision/data-quality documents, chart access and historical schema references, financial Golden Tests and runtime data flow.
- Read installed Next.js 16.3.5 guidance for client boundaries and Playwright before implementation.
- Baseline HEAD: `3fad994`. Pre-existing changes: `next-env.d.ts`, the untracked supplied Brief and `tmp/`. These were not treated as this task's work. Next regenerates `next-env.d.ts` during checks.
- Existing graphify graph only indexes the old Readme (16 nodes); queried for orientation, not trusted as current implementation evidence.
- No `ZarSignal_Master_Prompt_V5.3.txt` or independent Amendment Registry found, including an ignored-file filename search outside dependencies/build outputs. V5.3 engine approval cannot be inferred from the Brief.

## Production evidence, before implementation

Read-only HTTP checks: `https://zarsignal.ir`, `/api/health/database`, `/api/public/markets` returned 200. Database health reported PostgreSQL connected; market API reported `mode=live`, `status=ok`, nine quotes and 60-second polling. Observations in the first check were `2026-09-26T15:20:48.242Z`.

Public source fields were `زرسیگنال` and source URLs were null. Code confirms that `getPublicSnapshot()` sanitizes data for both public markets and authenticated v1 quotes. This verifies the observed public surface, not a full security audit or a claim about future freshness. The database-backed production read is in `src/server/quotes.ts`; no private DB credentials, configuration writes or migration changes were needed.

Browser capture of production confirmed `.hero-copy` invisible at 390px and visible at 1440px. Before screenshots are in `artifacts/homepage-phase1/before-production-*.png`. Follow-up public API evidence is stored in `production-audit.json` in the same directory. Production was not deployed or modified by this task.

## Conflicts and resolution

| Conflict | Evidence / precedence / resolution |
| --- | --- |
| START / early Project Memory say no live provider and formulas pending | Current DB-backed API plus newer Formula Registry and approved conversion spec take precedence. Do not repeat old copy on the homepage. |
| Gold/USD module headers say waiting for MARKET_18K | `BUBBLE_FORMULAS_SPEC`, `M_MAZANEH_TO_18K`, Registry and live-bubbles implement approved DERIVED path. No formula changed. |
| Silver module has a draft/approved arithmetic formula and Golden Tests, while Registry says BLOCKED | Latest public enablement remains blocked. Presence of SILVER_999 production prices or passing arithmetic tests is insufficient approval. No silver output enabled. |
| V5.3 USD/coin terminology versus internal USD_BUBBLE key | Runtime formula is `USD_GAP`: actual USD vs gold-implied USD. UI spells out its basis; no AED-dollar bubble or coin formula inferred. |
| Initial product draft mentions accounting/marketplace integration | Current instruction and historical schema exclusions separate HomeGold. No HomeGold code or integration added. |
| Brief proposes همراه plan and paid notification features | Existing configured prices/names remain in `/pricing`; no new plan, quota, payment or active notification claim introduced. |
| Prior chart doc puts preview on the default homepage | User-authorized progressive disclosure moves the existing short chart into professional details. `/charts` and symbol routes remain reachable. |
| Brief allows creating analytics adapter; current Phase 1 instruction allows only existing adapter | No runtime analytics adapter exists (search: trackEvent, gtag, dataLayer, posthog, plausible). Passive `data-analytics-*` attachment points only; no collection, network requests or fake events. Actual dispatch remains blocked on an approved adapter. |

## Capability classification

These categories distinguish implementation from production/service readiness; UI completion does not approve financial logic.

| Capability | Category | Evidence / boundary |
| --- | --- | --- |
| DB-backed market ingestion/read and public provider redaction | IMPLEMENTED | Production health + nine public quotes; quotes.ts and ingestion code. |
| MAZANEH_TO_18K, GOLD_BUBBLE, USD_GAP arithmetic and Golden Tests | IMPLEMENTED | Registered v1.0; server modules and tests. DERIVED provenance retained. |
| Historical charts and server entitlement enforcement | IMPLEMENTED | history-access and chart APIs/tests. Entitlement duration does not guarantee data exists. |
| Calculator route | IMPLEMENTED | Partial coverage: five approved UI calculations; not M01–M11 completion. |
| Phase 1 hero, saved view depth, data-state card, manual radar, mobile navigation, educational report | IMPLEMENTED | home-experience, market-radar, homepage.css, header, mobile-tab-bar and alerts status route. |
| Existing validated public data into redesigned presentation | READY_TO_CONNECT → IMPLEMENTED | Same getPublicSnapshot/computeLiveBubbles; no new financial calculation in UI. |
| Google sign-in wiring | READY_TO_CONNECT | Auth.js capability checks exist; production credentials/login were not exercised in this task. |
| Passive analytics attachment points | READY_TO_CONNECT | DOM metadata ready; approved existing adapter was absent, so no event dispatch was added. |
| Additional non-financial disclosure/copy using current routes | READY_TO_BUILD | Can be iterated after Phase 1 review without a new formula. |
| V5.3 decision report / live conversion recommendation | SPEC_BLOCKED | Missing Master Prompt + Amendment Registry; Decision Engine document is explicitly a skeleton; v1 analysis API returns 503 after authorization. |
| Silver bubble and Neutral Band | SPEC_BLOCKED | Registry / approved safety rules; no threshold or enablement inferred. |
| Full calculator modules, model confidence, net-after-cost conversions | SPEC_BLOCKED | Coverage report, missing approved fixtures/contracts and executable bid/ask governance. |
| Production alerts, WhatsApp, SMS, payments, trading execution | SPEC_BLOCKED / outside Phase 1 | No active service presented; provider, consent, quotas and backend readiness must be established separately. |

## Before / after

- Before: mobile CSS hid the value proposition and CTA. After: natural heading → description → CTA → educational summary, with 16px mobile page margins and compact 56px header.
- Before: radar changed assets automatically every 3.4 seconds and showed silver as a lock. After: manual, stable selection; the centre describes data/model availability, with numeric bubble as evidence. No animations run in the new radar.
- Before: duplicated bubble/price/feature panels. After: one primary data card, optional professional disclosure, a separate permanently labelled educational report, and working links to existing price/chart/calculator/API pages.
- Data states: available calculation, stale input, unavailable data and blocked model. None produces HOLD, BUY/SELL, a conversion direction or a paywall. A long-open page downgrades data freshness every 30 seconds using the existing `isStale` rule; it does not invent a new financial threshold.
- Input observation times remain visible (oldest input in the summary, individual timestamps in details). Unknown costs, absent trend/momentum/model confidence and absence of executable bid/ask are explicit. No success percentage or financial target created.
- Simple/professional preference is optional localStorage only; it never changes server entitlement. Block reasons stay public.
- Bottom navigation: امروز / تحلیل‌ها / هشدارهای من / حساب من. Tools, pricing, methodology and business route remain in the native overflow menu. `/alerts` honestly describes the inactive service and has a return link.
- Updated obsolete calculator FAQ. No form pretends to save alerts and no user is routed to an active checkout.

## Analytics boundary

Passive attachment points: landing_view, hero_cta_click (sample/market), analysis_summary_view, audience_view_changed (simple/professional), analysis_detail_view and sample_analysis_view. They do not emit events. A future adapter must use actual viewport visibility for view events and actual expansion for detail events; presence in DOM is not a view. No identity, phone number, portfolio or financial amounts are included.

Signup, activation, consent, delivery and payment events are not simulated. A valid report plus a real watchlist save/alert setup would be required for activation; its product-approved time window remains unspecified. No activation KPI can be claimed in this phase.

## Validation and artifacts

See `artifacts/homepage-phase1/` for actual browser screenshots and `measurements.json` for viewport/CTA results. Tests cover 360×800, 390×844, 430×932, 768×1024 and 1440×1000 in light and dark, horizontal overflow, above-fold CTA, optional view persistence, manual silver selection, blocked state, alerts/login routes, tools menu, keyboard focus, text enlargement and reduced motion.

- `npm test`: 59/59 passed, including all existing gold/USD/mazaneh Golden Tests and the new display-state expiration check. Passing silver arithmetic tests does not unblock the product.
- `npm run typecheck`: passed during implementation; build also performs TypeScript validation.
- `npm run build`: first attempt hit Windows Prisma DLL lock while dev server was running; after stopping that server, generation and the production build succeeded. No dependency upgrade was made.
- Final `npm run build`: passed (Prisma generation, Next production compilation/TypeScript and prepare-sites).
- Final `npm run typecheck` and `git diff --check`: passed.
- Final production-build browser run: `npx playwright test e2e/homepage-phase1.spec.ts e2e/charts.spec.ts --project=desktop --workers=1 --grep 'Phase 1|two points'` — **2 passed (40.2s)**. This includes all ten viewport/theme combinations, zero page errors, the new homepage interactions, insufficient-history behavior and the existing real server-side 403 paywall with no older-data leakage.
- Final captures use a local production build with `MARKET_MODE=demo`: no fake prices; unavailable-data state is shown. `local-stale-390-dark.png` preserves the earlier real dev rendering with stale local input. Both are distinct from the before-production screenshots. No live decision is asserted in any capture.
- CTA bottom positions: 360px viewport = 368.28px; 390/430 = 339.78px; 768 = 438.98px; 1440 = 449.98px. All are above the fold; mobile CTA is above the bottom navigation. No horizontal overflow in tested widths or enlarged text.
- Browser viewport tests are Edge/Chromium emulation, not physical-device or Safari certification. Local snapshots differ from production; screenshot freshness labels reflect the local inputs, not a production-market claim.
- Legacy E2E files contain pre-existing obsolete assumptions (table with seven/nine rows on homepage, old embedded calculator, old hero order). The new Phase 1 suite expresses current acceptance; do not claim the entire legacy E2E suite passed.

### Screenshot index

| Viewport | Light | Dark |
| --- | --- | --- |
| 360×800 | [full page](../../artifacts/homepage-phase1/after-360-light.png) | [full page](../../artifacts/homepage-phase1/after-360-dark.png) |
| 390×844 | [full page](../../artifacts/homepage-phase1/after-390-light.png) | [full page](../../artifacts/homepage-phase1/after-390-dark.png) |
| 430×932 | [full page](../../artifacts/homepage-phase1/after-430-light.png) | [full page](../../artifacts/homepage-phase1/after-430-dark.png) |
| 768×1024 | [full page](../../artifacts/homepage-phase1/after-768-light.png) | [full page](../../artifacts/homepage-phase1/after-768-dark.png) |
| 1440×1000 | [full page](../../artifacts/homepage-phase1/after-1440-light.png) | [full page](../../artifacts/homepage-phase1/after-1440-dark.png) |

[Before mobile](../../artifacts/homepage-phase1/before-production-390.png) · [Before desktop](../../artifacts/homepage-phase1/before-production-1440.png) · [360 first screen](../../artifacts/homepage-phase1/first-screen-360-light.png) · [390 first screen](../../artifacts/homepage-phase1/first-screen-390-dark.png) · [Silver blocked](../../artifacts/homepage-phase1/silver-blocked-professional.png) · [Alerts](../../artifacts/homepage-phase1/alerts-mobile.png) · [Login](../../artifacts/homepage-phase1/login-mobile.png) · [Enlarged text](../../artifacts/homepage-phase1/text-enlargement-reduced-motion.png)

## Files changed by this task

- `src/app/page.tsx`, `src/app/homepage.css`: page hierarchy, educational report, honest service copy.
- `src/components/home-experience.tsx`, `src/components/market-radar.tsx`: view preference, manual radar and progressive disclosure.
- `src/lib/bubbles.ts`: presentation-only freshness state helper; no formula change.
- `src/app/theme.css`, `src/components/header.tsx`, `src/components/mobile-tab-bar.tsx`: remove mobile hiding rules, shared navigation/accessibility.
- `src/app/alerts/page.tsx`: inactive-service status route.
- `src/lib/faq.ts`: correct calculator capability description.
- `package.json`, `tests/homepage-states.test.ts`, `e2e/homepage-phase1.spec.ts`: targeted validation.
- This report and `artifacts/homepage-phase1/*`: review evidence.

## Phase 2 recommendation — not authorized or started

1. Supply the approved V5.3 Master Prompt and Amendment Registry, reconcile the decision output contract and resolve executable bid/ask/cost and timestamp governance. Production ingestion does not establish Decision Engine readiness.
2. Validate engine outputs, report states/versioning and reference fixtures before replacing the educational Hero with a live decision. Keep silver and Neutral Band blocked until explicit approval.
3. Connect an approved consent-aware analytics adapter to the passive hooks; agree activation window and metric definitions.
4. Separately scope authentication continuation, watchlist/alert persistence, subscriptions and channels after verifying actual backend readiness. No production message or payment activation follows from Phase 1 approval alone.

Stop after Phase 1. Await explicit approval before Phase 2 or deployment.
