# Chart access and historical bubbles

## Shipped behavior

- Homepage: one compact 24-hour teaser; two small independent sparklines only when at least three synchronized observations span five minutes. One link to `/charts/gold_melted`.
- `/charts` lists nine instruments. `/charts/[symbol]` offers price + bubble on one time axis, independent price/percent axes, OHLC tooltip and series toggles. Silver bubble stays locked.
- Anonymous and ordinary accounts: last 24 hours. All nine current prices and current bubble numbers remain public. A daily price feed may have too few bars in 24 hours; the UI says so rather than inventing intraday candles.
- Both price-history and bubble-history APIs return 403 with **no older data** when entitlement is absent. Responses are private/no-store. No blur-only paywall or client-only enforcement.
- Active, started, unexpired Subscription.product must equal an active web Plan.slug. Its explicit feature `history:7d`, `history:30d`, or `history:90d` grants that depth. Role alone (including API_CUSTOMER) grants nothing. DB/auth failure denies access.
- Admin Plans has a history-depth selector. The capability is stored in existing Plan.features JSON and is hidden from marketing copy; `/pricing` renders its human-readable depth. No schema migration or payment gateway is introduced. Launch pricing was subsequently delegated by Navid and is initialized through Plan/PricingVersion.
- Current Subscription has no Plan FK: product/slug is the existing reference. Keep slugs stable while subscriptions exist. A future FK migration should follow subscription issuance/payment implementation.

## Backfill contract

`backfillBubbleHistory({days:90})` reads stored 1D bars for the same upstream source and UTC calendar day: GOLD_MELTED + XAU_USD + USD. Only completed days with all three positive closes qualify. No forward fill, no present-day prices, no invented silver model.

The approved mazanehTo18k, goldBubble and usdGap implementations are reused. Deterministic input IDs include provenance, day, formula and conversion versions. Two bulk inserts in one transaction use conflict protection; a retry retains the original audit calculation rather than overwriting it. Upstream corrections require an explicitly versioned new backfill.

Provenance `faraz-daily-sync-v1` remains internal. Public responses expose only cadence `daily` or `snapshot`. A daily result is labelled as a reconstruction from same-day closes, **not** a synchronized intraday tick: markets can close at different hours. capturedAt is UTC day end; original bar timestamps remain in the input snapshot. Current/incomplete day and missing counterpart days are omitted. The chart joins daily reconstructed results by day and never attaches a live snapshot to an old candle.

Live `recordBubbleSnapshots` and refreshProductionMarket are unchanged. Reconstructed history and forward observations coexist. Public 24-hour chart uses live snapshots; longer candles use reconstructed daily bubbles.

## Operations

- Preferred: Vercel login/link/env pull, with `.env.production.local` ignored. Run Prisma status with the production env explicitly loaded, outside build.
- `NODE_ENV=production node --env-file=.env.production.local --import tsx scripts/production-market.ts --history --backfill-bubbles`.
- Existing protected recover POST supports `?action=backfill-bubbles` and a read-only `?action=history-audit` for counts/migration records/plan configuration. Neither exposes credentials. GET does not mutate.
- No build migrations or minute Hobby cron. CRON_SECRET was configured as a Vercel Secret; the fixed emergency credential and query-string authentication were removed. Only authenticated POST is accepted for recovery. No credentials belong in this document.

## Launch pricing authorized by Navid — 2026-09-22

Navid explicitly delegated pricing. Idempotent protected POST action `initialize-chart-plans` creates Free (0), Home (149,000 toman/month; 30 days), Professional (299,000 toman/month; 90 days). It does not overwrite existing plan or pricing edits. These are launch experiment prices, not a validated market benchmark. No fabricated discount, scarcity, returns or profit promise.

The free price/radar/calculator remains useful. Sell historical context: price and bubble from the same day. Show actual available coverage. Alerts, exports, expanded watchlists, API and native apps are not included as delivered benefits. The responsive website works on mobile.

The symbol page now includes a compact ChartWorkspace; the homepage stays a teaser. Longer windows hard-gate on the server. A 90-day allowance does not imply 90 valid bubble days: production backfill currently has 63 matched days (2026-06-25 through 2026-09-21), 126 results across gold and USD. Repeating the job created zero duplicate snapshots.

## Private owner review

`/charts/preview` is noindex. A random CHART_PREVIEW_SECRET, stored only in Vercel and an ignored local owner-code file, grants a signed HttpOnly/Secure/SameSite=Strict cookie for two hours. It unlocks read-only chart history up to 90 days, not admin. POST requires same-origin; no key in URL or git. Logout clears the cookie; secret rotation invalidates existing cookies. Normal anonymous requests still receive 403 beyond 24h.

## Mobile reliability

Client fetch uses AbortController plus a timer, without AbortSignal.any/timeout (older Safari lacks these static methods). Cancellation and HTTP403 are tested. Quote retrieval was reduced from eleven simultaneous database queries to two to reduce connection-pool contention. This is not a capacity claim for 50,000 concurrent users.

## Remaining release dependencies

- Payment checkout and verified subscription issuance are not implemented; published prices are not a working checkout. Configure gateway and test real activation/refund before selling.
- Verify production identity provider end-to-end with a real account, then paid activation/expiration.
- Subscription.product remains a plan slug, not a foreign key.
- Vercel env pull returned redacted placeholders, not usable DB credentials; operations used the authenticated production runtime. No claim of direct local DB connectivity.
- Migration ledger has an unfinished old bubble-history migration despite present usable tables. Reconcile against the actual schema using Prisma's documented resolve workflow once direct credentials are available. Never add migrations back into the Vercel build.
- Growth and price validation: see GROWTH_50000.md.

## Production verification — 2026-09-22

- Vercel deployment 9972700 reached Ready and aliases include www.zarsignal.ir.
- Pricing initialization ran twice successfully; three plans use 0 / 149000 / 299000 toman monthly.
- Owner preview opened 90 daily candles and 63 daily bubble results on the live symbol page. Anonymous 90-day API remains 403.
- Local validation: 53 unit tests, 20 desktop/mobile browser cases, typecheck and production build passed.
- WebKit iPhone-sized stable homepage and chart checks supplement Chromium mobile emulation; this is browser-engine testing, not a physical iPhone test.
- Production logs exposed a missing Auth.js secret; a new random AUTH_SECRET was stored as a Vercel Secret. No secret is recorded here.
