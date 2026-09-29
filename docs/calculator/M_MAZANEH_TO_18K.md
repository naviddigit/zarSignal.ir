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
MESGHAL_GRAMS = 4.608          # physical weight only
MAZANEH_PURITY = 705
GOLD_18K_PURITY = 750
MAZANEH_TO_18K_DIVISOR = 4.3318  # market shortcut for price
```

## Formula

```
MARKET_18K = GOLD_MELTED / 4.3318
```

Reverse:

```
GOLD_MELTED = MARKET_18K * 4.3318
```

## Golden test

Input: `GOLD_MELTED = 100_000_000`

```
MARKET_18K = 100000000 / 4.3318 ≈ 23085091.65
```

Tolerance: ≤ 0.01 Toman (calculation layer).
