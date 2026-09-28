# ZARSIGNAL — TRADING AGENT CONTRACT PACKAGE V1
# Source of Truth: ZarSignal Master Prompt V5.4
# Product Approval: Mojtaba
# Status: APPROVED where explicitly stated below

==================================================
00 — SOURCE OF TRUTH / PRECEDENCE
==================================================

Engine Source of Truth:
ZarSignal Master Prompt V5.4

V5.4 supersedes V5.3.

Active amendments preserved in V5.4:

- ZSA-FX-001
- COIN-2026-01 / ZSA-COIN-001
- SILVER-2026-01 / ZSA-SILVER-001

V5.4 creation audit reported preservation of all 58/58 prior sections
and addition of the Silver amendment without deleting existing rules.

Precedence:

1. Explicit active amendment
2. ZarSignal Master Prompt V5.4
3. Approved Formula Registry / Golden Tests
4. Approved Product Presentation Decisions
5. UI

UI, API or implementation code MUST NOT override engine rules.

Existing:
docs/trading-agent/DECISION_ENGINE.md
docs/trading-agent/TRADING_AGENT_SPEC.md

must not remain competing Sources of Truth.

After importing this package:
either mark them SUPERSEDED or convert them into references to this contract.

==================================================
01 — CANONICAL ANALYSIS RESULT
==================================================

Approved canonical engine result:

DOLLAR_TO_GOLD
GOLD_TO_DOLLAR
HOLD

Do not invent additional decision states.

System/data states are NOT analysis decisions:

DATA_UNAVAILABLE
DATA_STALE
DATA_CONFLICT
MODEL_BLOCKED

Access state such as PAYWALLED is also NOT an analysis result.

Recommended contract:

{
  "result": "DOLLAR_TO_GOLD | GOLD_TO_DOLLAR | HOLD | null",
  "status": "...",
  "confidence": {...},
  "reason_codes": [],
  "risk_flags": []
}

If status prevents a valid analysis:
result = null

Never map a data error to HOLD.

==================================================
02 — CONFIDENCE CONTRACT
==================================================

APPROVED FACT:

V5.4 contains an actual Confidence/Score methodology.

Therefore:

- Confidence MUST come from V5.4.
- Frontend MUST NOT calculate Confidence.
- API adapter MUST NOT invent Confidence.
- Do not invent weights.
- Do not invent thresholds.
- Do not derive Confidence from Data Quality.
- Do not modify Confidence because of the 21:00–10:00 warning window
  unless V5.4 itself explicitly requires such adjustment.

Confidence != Data Quality.

Contract must preserve:

confidence.value
confidence.scale
confidence.version

Optional:
confidence.label

ONLY expose label if V5.4 itself contains the official numeric→label mapping.

If the exact executable Confidence calculation is not yet present in the
repository, port it verbatim from V5.4 before enabling production Confidence.

DO NOT reconstruct missing weights from memory.

==================================================
03 — DATA QUALITY
==================================================

Data Quality is independent of Confidence.

At minimum architecture must support:

VALID
STALE
UNAVAILABLE
CONFLICT

Use exact existing V5.4 names where they differ.

Data problems must never silently produce a normal trading decision.

Every derived metric must retain timestamp/provenance sufficient to
determine whether its inputs are synchronized and valid.

==================================================
04 — GOLD / FX SEPARATION
==================================================

CRITICAL V5.4 RULE:

Gold-Implied USD Gap != Dollar Bubble

Never merge them.

Approved gold-derived implied USD relationship already present in the
ZarSignal calculation framework:

USD_IMPLIED_GOLD =
MARKET_18K × 41.4713024 / XAUUSD

where the equivalent conversion basis comes from:

31.1034768 / 0.75 = 41.4713024...

Gold theoretical 18K relationship:

GOLD_THEORETICAL_18K =
(XAUUSD / 31.1034768) × USD_MARKET × 0.75

Gold relative valuation and Gold-Implied USD Gap must remain separate
from the independent FX/Dollar Bubble defined by ZSA-FX-001.

Do not display Gold-Implied USD Gap under the title "حباب دلار".

Professional UI should use concepts such as:

دلار لحظه‌ای
دلار ضمنی طلا
فاصله دلار ضمنی
روند فاصله

without exposing proprietary formula implementation.

==================================================
05 — COIN AMENDMENT
==================================================

Active:
COIN-2026-01 / ZSA-COIN-001

CRITICAL:

CoinUSDGapPct != CoinBubblePct

These are separate dimensions.

Architecture must keep independent fields for:

coin_market_price
coin_theoretical_value
coin_bubble_pct

usd_implied_coin
coin_usd_gap_pct

Do not merge them into one generic "coin gap".

Any SwapEdge logic must remain bid/ask-aware according to V5.4.

Do not use midpoint-only assumptions where the active amendment requires
actual executable buy/sell sides.

==================================================
06 — SILVER AMENDMENT
==================================================

Active:
SILVER-2026-01 / ZSA-SILVER-001

Approved V5.4 formulas:

SilverTheo999 =
(XAGUSD × USDMarket / 31.1034768) × 0.999

USDImpliedSilver =
(Silver999Market × 31.1034768) /
(XAGUSD × 0.999)

SilverPremiumPct =
(Silver999Market - SilverTheo999) /
SilverTheo999 × 100

SilverUSDGapPct =
(USDImpliedSilver - USDMarket) /
USDMarket × 100

Version:

SILVER_CALC_VERSION = V5.4-SILVER.1

Requirements:

- synchronized snapshot
- data-quality validation
- double-counting protection
- versioned calculation
- Golden Test

SilverPremiumPct and SilverUSDGapPct are separate evidence dimensions.

Do not count the same economic divergence twice in a decision score.

IMPORTANT:
If required SILVER_999_MARKET is not available/valid,
do not fabricate Silver Bubble.

==================================================
07 — DOUBLE-COUNTING CONTROL
==================================================

V5.4 explicitly requires avoiding double counting economically equivalent
signals.

Examples:

Gold Premium/Discount
and
Gold-Implied USD Gap

may describe related divergence.

Likewise:

SilverPremiumPct
and
SilverUSDGapPct

must not automatically become two independent confirmations if they are
mathematically expressing the same underlying dislocation.

Coin valuation and CoinUSDGap must also follow the active coin amendment.

The engine decides how evidence is combined.

Frontend MUST NOT add confirmations or increase Confidence because two
related metrics are both displayed.

==================================================
08 — REPORT OUTPUT CONTRACT
==================================================

Create:

docs/trading-agent/ANALYSIS_OUTPUT_CONTRACT_V1.md

Recommended versioned response:

{
  "schema_version": "1.0",
  "report_id": "...",
  "analysis_snapshot_id": "...",

  "asset_id": "...",
  "comparison_pair": "...",
  "analysis_type": "...",
  "timeframe": "...",

  "engine_version": "5.4",
  "amendment_ids": [],
  "formula_versions": [],
  "input_snapshot_id": "...",

  "status": "...",
  "result": "...",

  "confidence": {
    "value": null,
    "scale": null,
    "label": null,
    "version": null
  },

  "reason_codes": [],
  "risk_flags": [],

  "trend_state": null,
  "momentum_state": null,
  "overall_market_trend": null,

  "data_quality": {...},

  "market_price": null,
  "theoretical_price": null,
  "deviation_percent": null,

  "gold_metrics": {},
  "fx_metrics": {},
  "coin_metrics": {},
  "silver_metrics": {},

  "analysis_timestamp_utc": "...",

  "time_reliability": "...",

  "formula_disclosure": "HIDDEN"
}

Exact enums for Trend/Momentum/Reason/Risk MUST be ported from V5.4.

Do not create substitute enums merely to satisfy TypeScript.

==================================================
09 — REASON CODE REGISTRY
==================================================

Create:

docs/trading-agent/REASON_CODE_REGISTRY.md

Each real V5.4 reason must be represented as:

code
definition
engine_emission_rule_reference
approved_persian_text
allowed_text_parameters
applicable_assets
introduced_in_version
deprecated_in_version

Important:

Reasoning is visible.
Formula is hidden.

The UI may translate a deterministic Reason Code into understandable
Persian.

Example architecture only:

ENGINE CODE
     ↓
APPROVED COPY MAP
     ↓
USER TEXT

Do not use an LLM to invent the explanation after receiving the result.

Do not invent Reason Codes that do not exist in V5.4.

==================================================
10 — RISK FLAG REGISTRY
==================================================

Create:

docs/trading-agent/RISK_FLAG_REGISTRY.md

Same governance:

code
definition
emission_rule_reference
approved_persian_text
applicable_assets
introduced_in_version

Risk Flags must originate from Engine/data validation rules.

Frontend does not manufacture warnings.

==================================================
11 — MARKET STATE REGISTRY
==================================================

Create:

docs/trading-agent/MARKET_STATE_REGISTRY.md

Port the exact V5.4 states for:

Trend
Momentum
Overall Market Trend
Gap Trend

Do not create arbitrary:

BULLISH
BEARISH
STRONG
WEAK

unless those exact semantics exist in V5.4.

==================================================
12 — USER ACCESS POLICY
==================================================

Create:

docs/trading-agent/ANALYSIS_ACCESS_POLICY.md

Three experiences:

-----------------------
FREE
-----------------------

Purpose:
prove ZarSignal value before asking for payment.

May show:

- current market price
- approved current Bubble/Gap
- simple interpretation
- freshness/data quality
- limited Analysis preview

Full paid Analysis remains gated.

-----------------------
HOME / خانگی
-----------------------

Show:

- canonical V5.4 result
- human-readable explanation
- V5.4 Confidence
- Data Quality
- analysis timestamp
- Time Reliability
- primary Reasons
- approved Risk Flags
- approved trend information
- entitled history
- approved basic alerts

Formula hidden.

-----------------------
PROFESSIONAL / حرفه‌ای
-----------------------

Everything in HOME plus:

- Implied USD
- Actual/Live USD
- Difference
- Difference Trend
- Overall Market Trend
- deeper evidence
- advanced history/comparison
- professional chart overlays
- advanced alert capabilities after approval

Formula hidden.

IMPORTANT:

Formula privacy != reasoning privacy.

Both HOME and PROFESSIONAL must understand WHY the engine reached its
result without receiving proprietary calculation expressions/weights.

Enforce entitlement server-side.

Do not return Professional-only fields and merely hide them with CSS.

==================================================
13 — TIME RELIABILITY
==================================================

APPROVED BY MOJTABA.

Timezone:

Asia/Tehran

Default Warning Window:

21:00 → 10:00

STANDARD:

10:00 <= Tehran Time < 21:00

WARNING:

21:00 <= Tehran Time < 24:00
OR
00:00 <= Tehran Time < 10:00

User can request analysis 24/7.

During WARNING window:

1. User requests Analysis.
2. Do not expose Analysis immediately.
3. Show reliability warning.
4. Require explicit acknowledgement.
5. If accepted, show Analysis.
6. Keep warning state visible on the report.

Approved Persian UX intent:

«هشدار اعتبار تحلیل

در این بازه زمانی نرخ‌های اصلی بازار ممکن است هنوز از اعتبار
و ثبات کافی برای تحلیل استاندارد برخوردار نباشند.

بازه اصلی و قابل اتکاتر تحلیل زرسیگنال از ساعت ۱۰:۰۰ صبح
تا ۲۱:۰۰ به وقت تهران است.

در صورت تمایل همچنان می‌توانید تحلیل فعلی را مشاهده کنید.»

Actions:

[مشاهده تحلیل با پذیرش هشدار]
[فعلاً نمایش نده]

PRE/WARNING must NOT modify V5.4 Confidence unless V5.4 explicitly says so.

==================================================
14 — ADMIN TIME SETTINGS
==================================================

Implement with existing ZarSignal Design System.

Suggested:

/admin/analysis-settings

Settings:

timezone = Asia/Tehran

warning_start = 21:00
warning_end = 10:00

Admin can change Start/End.

Requirements:

- HH:mm validation
- overnight ranges supported
- invalid/equal range rejected
- server-side Admin authorization
- DB persistence
- Audit Log

Audit:

updated_at
updated_by
previous_value
new_value

Frontend must NOT hard-code 21:00/10:00.

If config unavailable:

fallback to APPROVED DEFAULT:

Asia/Tehran
21:00 → 10:00

==================================================
15 — ACKNOWLEDGEMENT MODEL
==================================================

Do NOT mutate a shared Analysis Snapshot merely because one user accepted
a warning.

Analysis Snapshot = shared immutable engine fact.

User acknowledgement = user/request-specific record.

Recommended:

AnalysisAcknowledgement

id
user_id
report_id
warning_policy_version
acknowledged_at
request_id

This prevents User A's acknowledgement from appearing as User B's.

==================================================
16 — ANALYSIS SNAPSHOT
==================================================

Create immutable/versioned AnalysisSnapshot.

Minimum:

analysis_snapshot_id
report_id
asset_id
comparison_pair

result
confidence

reason_codes[]
risk_flags[]

trend_state
momentum_state
overall_market_trend

market_price
theoretical_price
deviation_percent

gold_metrics
fx_metrics
coin_metrics
silver_metrics

data_quality

engine_version
amendment_ids[]
formula_versions[]
input_snapshot_id

analysis_timestamp_utc

time_reliability
warning_policy_version

status
superseded_by

Never overwrite historical Analysis.

Correction/supersession must preserve the previous snapshot.

==================================================
17 — HISTORICAL INTEGRITY
==================================================

Historical state must mean:

what ZarSignal actually knew and concluded at time T.

Required conceptual relationship:

Price(T)
Bubble(T)
Analysis(T)
FormulaVersion(T)
InputSnapshot(T)

Do NOT recalculate historical Analysis using today's:

USD
XAU
XAG
formula version
market state

and present it as the historical decision.

==================================================
18 — CANDLESTICK CHART
==================================================

Premium users require a professional candlestick chart.

TradingView-like familiarity is desirable,
but do not copy TradingView branding/UI.

Required:

OHLC Candles
Timeframe
Zoom
Pan
Crosshair
Tooltip
Responsive mobile interaction

Audit existing chart dependencies before adding a heavy new library.

==================================================
19 — ANALYSIS MARKERS
==================================================

Markers must originate ONLY from actual AnalysisSnapshot records.

Frontend cannot create signals.

Each marker:

report_id
analysis_snapshot_id
timestamp
result
confidence

Place marker at actual Analysis timestamp.

Tap/click:

show compact Analysis card:

Result
Time
Confidence
one-line approved reason
View Full Analysis

Historical marker must never move merely because later market data changed.

If generated during WARNING window:

show:
«خارج از بازه استاندارد تحلیل»

==================================================
20 — PREMIUM OVERLAY CONTROL
==================================================

Premium user can toggle:

[✓] نقاط تحلیل زرسیگنال

OFF:
candles only

ON:
approved Analysis markers

Persist user preference.

If useful after UX testing, support filters:

DOLLAR_TO_GOLD
GOLD_TO_DOLLAR
HOLD

Do not overcrowd mobile chart.

Dense markers may use visual clustering/filtering,
but must not falsify history.

==================================================
21 — ALERT ARCHITECTURE
==================================================

Prepare architecture for:

PRICE_THRESHOLD
BUBBLE_THRESHOLD
RELATIVE_GAP_THRESHOLD
ANALYSIS_STATE_CHANGE

But:

ANALYSIS_STATE_CHANGE
STATUS = EXPERIMENTAL

Mojtaba explicitly requires testing before production approval.

DO NOT enable production state-change notifications yet.

==================================================
22 — SMS / WHATSAPP / IN-APP
==================================================

Design may support:

IN_APP
SMS
WHATSAPP

Production sending requires:

provider configured
user consent
throttling
delivery status
disable/unsubscribe
approved trigger

SMS should be a trigger, not a 30-line report.

Deep link should open the exact Analysis Report,
not homepage.

==================================================
23 — GOLDEN TEST GOVERNANCE
==================================================

Create:

docs/trading-agent/golden/manifest.json
docs/trading-agent/golden/cases/*.json

Each test:

case_id
engine_version
amendment_ids
evaluation_time_utc
input_snapshot
active_config
expected_output
comparison_tolerances
approved_by

Do not invent tolerance.

Existing approved Golden Tests from V5.4/amendments must be ported
verbatim.

At minimum test categories must cover the real approved cases for:

Gold
FX
Coin
Silver
DOLLAR_TO_GOLD
GOLD_TO_DOLLAR
HOLD
STALE DATA
MISSING DATA
CONFLICT where defined

If an exact expected value is not recoverable from the approved source,
mark the test:

SOURCE_REQUIRED

Do not fabricate expected values.

==================================================
24 — FORMULA REGISTRY
==================================================

Use existing:

docs/references/FORMULA_REGISTRY.md

Do NOT create a competing formula registry.

Register V5.4 formula IDs/version IDs there.

Derived values must expose internal formula/version identifiers for audit,
while proprietary expressions remain hidden from public API/UI.

==================================================
25 — PUBLIC FORMULA PRIVACY
==================================================

Do not expose proprietary formula expressions, weights or scoring rules to:

FREE
HOME
PROFESSIONAL

Public/paid UI can expose:

value
meaning
reason
trend
risk
timestamp
confidence
data quality
approved methodology description

but not proprietary engine implementation.

Public API responses must follow the same access policy.

==================================================
26 — MOBILE REPORT UX
==================================================

Mobile-first.

Test:

360
390
430

LEVEL 1:
visible without long scrolling:

Asset
Result
one-line explanation
Confidence
Data Quality
Time Reliability
Timestamp

CTA:

[چرا؟]
[روی چارت]

LEVEL 2:

Reasons
Valuation state
Trend
Momentum if provided
Risk
Relevant Gap
Changes

LEVEL 3 PROFESSIONAL:

Implied USD
Actual USD
Difference
Difference Trend
Overall Market Trend
deeper historical evidence

Formula stays hidden.

==================================================
27 — IMPLEMENTATION ORDER
==================================================

PHASE A is already audited.

Now import/normalize this contract package.

Before Phase B:

1. Map V5.4 fields to ANALYSIS_OUTPUT_CONTRACT.
2. Port exact Confidence implementation.
3. Port exact Reason/Risk/Market State registries.
4. Register formulas/versions.
5. Port existing Golden Tests.
6. Make tests pass.

If any exact V5.4 value/rule is absent from the available source:
STOP only that field/module and report SOURCE_REQUIRED.

Do not block unrelated approved work.

Then:

PHASE B
- Analysis API
- AnalysisSnapshot
- Mobile Report
- FREE/HOME/PRO entitlement
- 21:00→10:00 Tehran Gate
- Admin settings
- acknowledgement

PHASE C
- Candlestick
- historical markers
- Premium ON/OFF overlay

PHASE D
- Watchlist
- alert configuration UX
- notification infrastructure

ANALYSIS_STATE_CHANGE production:
DO NOT ENABLE
until Mojtaba explicitly approves after testing.

==================================================
28 — REQUIRED REPORT BACK
==================================================

After importing the package, report:

1. Exact V5.4 rules successfully mapped
2. Exact Confidence implementation found/mapped
3. Reason Codes mapped
4. Risk Flags mapped
5. Market states mapped
6. Formula Registry changes
7. Golden Tests imported/passed
8. SOURCE_REQUIRED items, if any
9. DB migrations proposed
10. API contract proposed
11. No guessed formulas/thresholds confirmation

Do not start inventing missing engine logic.
