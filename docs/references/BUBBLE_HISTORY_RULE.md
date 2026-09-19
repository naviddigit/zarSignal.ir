# Bubble history / chart rule

Status: APPROVED

Every historical price point used for bubble analysis must store the calculation snapshot of that same moment.

## Minimum record

- asset_id
- market_price
- market_bid (if available)
- market_ask (if available)
- timestamp
- theoretical_price
- bubble_absolute
- bubble_percent
- formula_id
- formula_version
- input_snapshot_id
- data_quality / status

## Rules

- Current XAU/USD must NEVER recalculate historical gold bubble
- Current USD must NEVER recalculate historical bubble
- Bubble at T uses synchronized inputs at T only
- Price(T) + Theoretical(T) + Bubble(T) + FormulaVersion(T) must be reproducible
- If required inputs for T are missing: bubble(T) = NULL / UNAVAILABLE
- Never fabricate or interpolate silently
