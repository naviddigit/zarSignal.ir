# GOLD_BUBBLE — حباب طلای ۱۸ عیار

Status: Formula APPROVED · Neutral band SPEC_BLOCKER · Live wiring blocked until MARKET_18K feed exists

Canonical asset: 18K / purity 750 gold

## Inputs

| Name | Meaning | Unit |
| --- | --- | --- |
| XAU_USD | global gold | USD / troy oz |
| USD_IRT | domestic USD | Toman / USD |
| MARKET_18K | domestic 18K gold market | Toman / gram |

## Constants

```
TROY_OZ_GRAMS = 31.1034768
PURITY_18K = 0.75
```

## Formula

```
THEORETICAL_18K = XAU_USD × USD_IRT / 31.1034768 × 0.75
GOLD_GAP = MARKET_18K - THEORETICAL_18K
GOLD_BUBBLE_PERCENT = GOLD_GAP / THEORETICAL_18K × 100
```

Interpretation: `< 0` market below theoretical; `> 0` above; `≈ 0` relative equilibrium. Not a trade signal.

## Golden tests

### GT-GOLD-01

- XAU_USD=4000, USD_IRT=200000, MARKET_18K=19000000
- THEORETICAL_18K ≈ 19290447.94
- GOLD_BUBBLE_PERCENT ≈ -1.5057%

### GT-GOLD-02

- XAU_USD=4300, USD_IRT=230000, MARKET_18K=24000000
- THEORETICAL_18K ≈ 23847816.27
- GOLD_BUBBLE_PERCENT ≈ +0.6381%

### GT-GOLD-03

- XAU_USD=3500, USD_IRT=180000, MARKET_18K=16000000
- THEORETICAL_18K ≈ 15191227.75
- GOLD_BUBBLE_PERCENT ≈ +5.3239%
