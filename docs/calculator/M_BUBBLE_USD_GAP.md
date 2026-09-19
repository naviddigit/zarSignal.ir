# USD_GAP — فاصله نسبی دلار (نه «ارزش بنیادی دلار»)

Status: Formula APPROVED · Neutral band SPEC_BLOCKER · Live wiring blocked until MARKET_18K feed exists

Internal name: `USD_GAP` / `USD_GAP_PERCENT`  
Do NOT call this absolute/fundamental fair-value USD.

## Inputs

| Name | Unit |
| --- | --- |
| MARKET_18K | Toman / gram |
| XAU_USD | USD / troy oz |
| ACTUAL_USD | Toman / USD |

## Formula

```
IMPLIED_USD_FROM_GOLD = MARKET_18K × 31.1034768 / (XAU_USD × 0.75)
# equivalent: MARKET_18K × 41.4713024 / XAU_USD

USD_GAP = ACTUAL_USD - IMPLIED_USD_FROM_GOLD
USD_GAP_PERCENT = USD_GAP / IMPLIED_USD_FROM_GOLD × 100
```

Interpretation: gap between actual USD and gold-implied USD. Cross-market relative measure only.

## Golden tests

### GT-USD-01

- XAU=4000, MARKET_18K=19000000, ACTUAL_USD=200000
- IMPLIED ≈ 196988.69 · GAP% ≈ +1.5287%

### GT-USD-02

- XAU=4300, MARKET_18K=24000000, ACTUAL_USD=230000
- IMPLIED ≈ 231467.73 · GAP% ≈ -0.6341%

### GT-USD-03

- XAU=3500, MARKET_18K=16000000, ACTUAL_USD=180000
- IMPLIED ≈ 189583.10 · GAP% ≈ -5.0548%
