# CONFIDENCE_SPEC

Status: SOURCE_REQUIRED — exact calculation, scale, weights and approved label mapping absent
Source: [owner-supplied package](TRADING_AGENT_CONTRACT_PACKAGE_V1.md), sections 02, 07.

This is a lossless extraction of supplied sections, NOT the full Master Prompt V5.4. Recommended response examples are not executable validated schemas. No missing engine rules were reconstructed.

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
