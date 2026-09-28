# ANALYSIS_SNAPSHOT_SPEC

Status: APPROVED snapshot principles; exact typed engine fields SOURCE_REQUIRED
Source: [owner-supplied package](TRADING_AGENT_CONTRACT_PACKAGE_V1.md), sections 16, 17, 19.

This is a lossless extraction of supplied sections, NOT the full Master Prompt V5.4. Recommended response examples are not executable validated schemas. No missing engine rules were reconstructed.

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
