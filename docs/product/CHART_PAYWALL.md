# Chart access and historical bubbles

## Shipped behavior

- Homepage: one compact 24-hour teaser; two small independent sparklines only when at least three synchronized observations span five minutes. One link to `/charts/gold_melted`.
- `/charts` lists nine instruments. `/charts/[symbol]` offers price + bubble on one time axis, independent price/percent axes, OHLC tooltip and series toggles. Silver bubble stays locked.
- Anonymous and ordinary accounts: last 24 hours. All nine current prices and current bubble numbers remain public. A daily price feed may have too few bars in 24 hours; the UI says so rather than inventing intraday candles.
- Both price-history and bubble-history APIs return 403 with **no older data** when entitlement is absent. Responses are private/no-store. No blur-only paywall or client-only enforcement.
- Active, started, unexpired Subscription.product must equal an active web Plan.slug. Its explicit feature `history:7d`, `history:30d`, or `history:90d` grants that depth. Role alone (including API_CUSTOMER) grants nothing. DB/auth failure denies access.
- Admin Plans has a history-depth selector. The capability is stored in existing Plan.features JSON and is hidden from marketing copy; `/pricing` renders its human-readable depth. No schema migration, new price or payment gateway is introduced.
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

## Monetization proposal for Navid

Keep the free price/radar/calculator useful. Sell historical context rather than restricting basic quotes. The exact benefit at the paywall is “price and bubble from the same historical day”; show actual available coverage, not a claim of guaranteed profit.

Existing product priorities name Free / Home / Professional / API. **PROPOSAL:** Home gets 30 days, Professional 90 days; API remains separate. Admin chooses depth explicitly. Alerts, exports and expanded watchlists remain future work, not purchasable claims in this release.

Existing development presets include 249,000 / 799,000 / 1,490,000 toman but are explicitly test prices; they are not production pricing approval. Use only published Plan/PricingVersion records. No new price is proposed or silently published here. Payment checkout is not implemented; upgrade CTA leads to existing pricing/login, not a simulated successful purchase.

Measure the funnel: chart visits → longer-range attempts → pricing visits → authenticated users → verified paid activation; then 7/30-day chart retention and subscription renewal. Instrument these events when analytics/consent is configured. First validate willingness to pay with real cohorts; 100,000 buyers is a growth goal, not a promised outcome.

## Remaining release dependencies

- Configure production identity provider and payment/subscription issuance before claiming self-serve purchasing works.
- Assign history depths to approved production plans; API-only plans should remain at zero unless explicitly sold a chart entitlement.
- Verify a real paid account end-to-end once an active subscription exists. Synthetic fixtures are test-only and never inserted as market prices.
