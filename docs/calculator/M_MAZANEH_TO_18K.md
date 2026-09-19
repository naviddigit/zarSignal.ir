# MAZANEH_TO_18K — تبدیل مظنه به طلای ۱۸ عیار

Status: APPROVED (ChatGPT Product · option B)  
formula_id: `MAZANEH_TO_18K`  
version: `1.0`

## Purpose

Derive `MARKET_18K` when direct 18K feed is absent.

## Units

| Field | Unit | Purity |
| --- | --- | --- |
| GOLD_MELTED (مظنه) | Toman / mesghal | 705 |
| MARKET_18K | Toman / gram | 750 |

## Constants

```
MESGHAL_GRAMS = 4.608
MAZANEH_PURITY = 705
GOLD_18K_PURITY = 750
```

## Formula

```
MARKET_18K = GOLD_MELTED * 750 / (705 * 4.608)
```

Reverse:

```
GOLD_MELTED = MARKET_18K * 4.608 * 705 / 750
```

## Provenance

- Output provenance = `DERIVED` (never `LIVE`)
- Input timestamp = GOLD_MELTED timestamp
- If GOLD_MELTED stale/invalid → derived MARKET_18K invalid/stale
- When future `MARKET_18K_DIRECT` exists, keep both for cross-check; do not delete derived

## Golden test

Input: `GOLD_MELTED = 100_000_000`

Exact with constants above:

```
MARKET_18K = 100000000 × 750 / (705 × 4.608) ≈ 23086583.92
```

Tolerance: ≤ 0.01 Toman (calculation layer).

Note: an earlier draft printed ≈ 23,089,835.46; that figure does not match these constants. Code and tests use the exact constant form.
