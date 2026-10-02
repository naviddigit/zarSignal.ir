# رجیستری فرمول‌ها

| formula_id | version | status | notes |
| --- | --- | --- | --- |
| MAZANEH_TO_18K | 1.0 / 1.1 | APPROVED | DERIVED MARKET_18K from GOLD_MELTED ÷ 4.3318 |
| GOLD_BUBBLE | 1.0 | APPROVED_LIVE | DERIVED (mazaneh) and DIRECT (GOLD_18K) are separate evidence bases |
| USD_GAP | 1.0 | APPROVED_LIVE | Gold-implied USD gap — not independent dollar bubble |
| SILVER_BUBBLE | 1.0 | LEGACY / DEPRECATED for live | Without ×0.999; kept for GT-SILVER-01..03 only — do not activate live |
| SILVER_BUBBLE | V5.4-SILVER.1 | APPROVED_LIVE | SilverTheo999 × 0.999; SILVER_999 Toman/gram direct; no 4.3318 divisor; neutral SPEC_BLOCKER |
| USD_AED_GAP | V5.7-USD_AED_GAP.1 | APPROVED_EVIDENCE | AED×peg vs market USD; peg V5.7-USD_AED.1 |
| UAE18K_GAP | V5.7-UAE18K.1 | APPROVED_EVIDENCE | Theoretical UAE 18K reference — not Dubai retail |
| GOLD_SILVER_EDGE | V5.7-GS-RATIO.1 | APPROVED_EVIDENCE | Theoretical conversion edge; not executable swap |

Code: `mazaneh-to-18k.ts`, `bubble-formulas.ts`, `market-indicators.ts`, `live-bubbles.ts`

Spec: `docs/trading-agent/PREMIUM_R01_2_FORMULAS.md`

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

## Premium R01.2 / V5.7 evidence formulas

See `../trading-agent/PREMIUM_R01_2_FORMULAS.md`. Golden fixture in `tests/premium-r01-formulas.test.ts`.

## V5.4 package import — documentation only (historical)

Source: ../trading-agent/TRADING_AGENT_CONTRACT_PACKAGE_V1.md, sections 04–07, 24.
Legacy rows above are preserved; V5.4-SILVER.1 is now the live silver path.
