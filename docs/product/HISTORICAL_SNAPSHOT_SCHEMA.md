# Historical Calculation Snapshot — Schema Proposal

Status: APPROVED FOR IMPLEMENTATION (2026-09-21)  
Writer: on each successful HamRate ingest + Vercel cron `* * * * *` (every minute)  
Retention proposal: 90 days raw (confirm with Mojtaba)  
Aligned with: `BUBBLE_HISTORY_RULE.md`, ChatGPT PRODUCT DECISION 2026-09-21  
No new formulas.

## Goal

Persist Price + Bubble at time T with synchronized inputs only. Charts and Free 24h window read these rows — never recompute historical bubble from current XAU/USD.

## Poll cadence (ops)

Mojtaba: refresh every **30 seconds**.  
Current Vercel Hobby cron is daily — insufficient. Implementation must use an always-on/worker or paid cron (or external ping) writing snapshots on each successful ingest. Schema is cadence-agnostic.

## Models

### 1) `MarketInputSnapshot`

One row per successful synchronized quote set used for calculation.

| Field | Type | Notes |
| --- | --- | --- |
| id | cuid | = `input_snapshot_id` referenced by bubble rows |
| capturedAt | DateTime | server capture time |
| mode | String | `live` only for production history |
| quality | String | `ok` \| `stale` \| `partial` |
| goldMeltedMid | Decimal? | مظنه mid |
| goldMeltedBid | Decimal? | |
| goldMeltedAsk | Decimal? | |
| goldMeltedObservedAt | DateTime? | |
| xauUsdMid | Decimal? | |
| xauUsdBid | Decimal? | |
| xauUsdAsk | Decimal? | |
| xauUsdObservedAt | DateTime? | |
| usdIrtMid | Decimal? | |
| usdIrtBid | Decimal? | |
| usdIrtAsk | Decimal? | |
| usdIrtObservedAt | DateTime? | |
| market18k | Decimal? | DERIVED via MAZANEH_TO_18K |
| mazanehVersion | String? | e.g. `1.0` |
| silver999Mid | Decimal? | null until Afraz feed |
| silver999ObservedAt | DateTime? | |

Indexes: `capturedAt DESC`

Rule: if required inputs for a formula missing or not same-window → do **not** write a bubble row for that formula (or write `status=unavailable` with null metrics). Prefer skip null-bubble rows for chart cleanliness; store input row anyway for audit.

### 2) `BubbleSnapshot`

One row per formula per input snapshot (GOLD_BUBBLE, USD_GAP; SILVER only when feed exists).

| Field | Type | Notes |
| --- | --- | --- |
| id | cuid | |
| inputSnapshotId | FK → MarketInputSnapshot | required |
| instrumentKey | String | `GOLD_18K` \| `USD_IRT` \| `SILVER_999` (display asset) |
| formulaId | String | `GOLD_BUBBLE` \| `USD_GAP` \| `SILVER_BUBBLE` |
| formulaVersion | String | e.g. `1.0` |
| conversionVersion | String? | MAZANEH_TO_18K version when used |
| provenance | String | `DERIVED` \| `DIRECT` |
| marketPrice | Decimal? | market side used in formula (18k or USD) |
| marketBid | Decimal? | optional |
| marketAsk | Decimal? | optional |
| theoreticalPrice | Decimal? | |
| bubbleAbsolute | Decimal? | gap |
| bubblePercent | Decimal? | |
| status | String | `ok` \| `stale` \| `unavailable` \| `blocked` |
| computedAt | DateTime | |
| capturedAt | DateTime | denormalized = input.capturedAt for chart queries |

Unique: `[inputSnapshotId, formulaId]`  
Indexes: `[formulaId, capturedAt DESC]`, `[instrumentKey, capturedAt DESC]`

## Chart API (P0)

`GET /api/public/bubbles/history?formula=GOLD_BUBBLE&range=24h|7d|30d`

- Free clients: only `24h`  
- Home+: `7d` / `30d` (enforce after Auth)  
- Response points: `{ t, marketPrice, theoreticalPrice, bubblePercent, status }`  
- Gaps: omit points or mark `unavailable` — **no interpolated line**

## Retention (needs Mojtaba number)

Proposal until confirmed:

| Tier | Keep |
| --- | --- |
| Raw snapshots | 90 days @ full 30s resolution |
| Rollup 5m | 1 year |
| Rollup 1h | 3+ years |

Do not implement rollup in P0 — only raw + index. Confirm retention before production volume.

## Conflict check vs current Spec

| Spec rule | Schema support |
| --- | --- |
| Bubble(T) uses inputs at T only | FK `inputSnapshotId` + stored theoretical/bubble |
| Never recompute with current XAU/USD | Chart reads stored `bubblePercent` |
| formula version persisted | `formulaVersion` + `conversionVersion` |
| Neutral band | not stored; UI still no Pos/Neu/Neg labels |
| Silver blocked | no SILVER rows until Afraz |
| HomeGold | no tables |

## Out of scope this migration

- Auth / Plan gating (next after chart works for Free 24h)
- Neutral classification
- HomeGold ledger
- Changing bubble formulas

## Acceptance before code

- [ ] Navid OK on two-table shape  
- [ ] Mojtaba OK on 30s writer path (not Hobby daily cron alone)  
- [ ] Mojtaba OK on retention proposal or alternate days  
- [ ] Afraz silver tracked separately (no fake rows)
