# ANALYSIS_ACCESS_POLICY

Status: APPROVED presentation policy; executable plan capability mapping and trial field scope SOURCE_REQUIRED
Source: [owner-supplied package](TRADING_AGENT_CONTRACT_PACKAGE_V1.md), sections 12, 20, 25.

This is a lossless extraction of supplied sections, NOT the full Master Prompt V5.4. Recommended response examples are not executable validated schemas. No missing engine rules were reconstructed.

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
