# ANALYSIS_OUTPUT_CONTRACT_V1

Status: PARTIAL — successful status enum, scalar types, nullability and executable engine mapping SOURCE_REQUIRED
Source: [owner-supplied package](TRADING_AGENT_CONTRACT_PACKAGE_V1.md), sections 01, 03, 08.

This is a lossless extraction of supplied sections, NOT the full Master Prompt V5.4. Recommended response examples are not executable validated schemas. No missing engine rules were reconstructed.

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
