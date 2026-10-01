# SILVER_BUBBLE — حباب نقره ۹۹۹

## Live path (APPROVED): V5.4-SILVER.1

Status: Formula APPROVED · Neutral band SPEC_BLOCKER · Live wiring ACTIVE via `silverBubbleV54`

Canonical asset: Silver 999

### Inputs

| Name | Meaning | Unit |
| --- | --- | --- |
| XAG_USD | global silver | USD / troy oz |
| USD_IRT | domestic USD | Toman / USD |
| SILVER_999 | domestic silver 999 | Toman / gram |

### Constants

```
TROY_OZ_GRAMS = 31.1034768
SILVER_PURITY_999 = 0.999
```

No mazaneh-style divisor (unlike gold ÷ 4.3318). Market input is already Toman/gram.

### Formula

```
silverTheo999 = (XAG_USD × USD_IRT / 31.1034768) × 0.999
silverGap = SILVER_999 − silverTheo999
silverPremiumPct = silverGap / silverTheo999 × 100
usdImpliedSilver = (SILVER_999 × 31.1034768) / (XAG_USD × 0.999)
silverUsdGapPct = (usdImpliedSilver − USD_IRT) / USD_IRT × 100
```

Do not merge premium and USD-gap into one generic field. Do not emit Buy/Sell/Hold.

### Golden tests (V5.4)

See `tests/bubble-formulas.test.ts` → `GT-V54-SILVER-01..03`.

---

## Legacy (DEPRECATED for live): SILVER_BUBBLE 1.0

Status: kept for regression only (`silverBubble` without ×0.999). Do not activate live. Do not rename fixtures to V5.4.

```
THEORETICAL_SILVER_999 = XAG_USD × USD_IRT / 31.1034768
SILVER_GAP = SILVER_999_MARKET − THEORETICAL_SILVER_999
SILVER_BUBBLE_PERCENT = SILVER_GAP / THEORETICAL_SILVER_999 × 100
```

### GT-SILVER-01 (legacy)

- XAG_USD=50, USD_IRT=200000, SILVER_999_MARKET=350000
- THEORETICAL ≈ 321507.47 · BUBBLE ≈ +8.8622%

### GT-SILVER-02 (legacy)

- XAG_USD=55, USD_IRT=230000, SILVER_999_MARKET=410000
- THEORETICAL ≈ 406706.94 · BUBBLE ≈ +0.8097%

### GT-SILVER-03 (legacy)

- XAG_USD=40, USD_IRT=180000, SILVER_999_MARKET=220000
- THEORETICAL ≈ 231485.38 · BUBBLE ≈ −4.9616%
