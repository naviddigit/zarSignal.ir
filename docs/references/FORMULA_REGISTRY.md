# رجیستری فرمول‌ها

| formula_id | version | status | notes |
| --- | --- | --- | --- |
| MAZANEH_TO_18K | 1.0 / 1.1 | APPROVED | DERIVED MARKET_18K from GOLD_MELTED ÷ 4.3318 |
| GOLD_BUBBLE | 1.0 | APPROVED_LIVE_VIA_DERIVED | Uses MAZANEH_TO_18K; neutral SPEC_BLOCKER |
| USD_GAP | 1.0 | APPROVED_LIVE_VIA_DERIVED | USD bubble card; neutral SPEC_BLOCKER |
| SILVER_BUBBLE | 1.0 | LEGACY / DEPRECATED for live | Without ×0.999; kept for GT-SILVER-01..03 only — do not activate live |
| SILVER_BUBBLE | V5.4-SILVER.1 | APPROVED_LIVE | SilverTheo999 × 0.999; SILVER_999 Toman/gram direct; no 4.3318 divisor; neutral SPEC_BLOCKER |

Code: `mazaneh-to-18k.ts`, `bubble-formulas.ts` (`silverBubble` legacy, `silverBubbleV54` live), `live-bubbles.ts`

## V5.4-SILVER.1 activation

| Field | Formula | Unit |
| --- | --- | --- |
| silverTheo999 | `(XAG_USD × USD_IRT / 31.1034768) × 0.999` | Toman / gram |
| silverGap | `SILVER_999 − silverTheo999` | Toman / gram |
| silverPremiumPct | `silverGap / silverTheo999 × 100` | Percent |
| usdImpliedSilver | `(SILVER_999 × 31.1034768) / (XAG_USD × 0.999)` | Toman / USD |
| silverUsdGapPct | `(usdImpliedSilver − USD_IRT) / USD_IRT × 100` | Percent |

`silverPremiumPct` and `silverUsdGapPct` are separate API/UI fields — never merge into one generic `silver_gap`.
No Buy/Sell/Hold / Decision emission from this formula.
Neutral band: SPEC_BLOCKER.

## V5.4 package import — documentation only (historical)

Source: ../trading-agent/TRADING_AGENT_CONTRACT_PACKAGE_V1.md, sections 04–07, 24.
Legacy rows above are preserved; V5.4-SILVER.1 is now the live silver path.
