# رجیستری فرمول‌ها

| formula_id | version | status | notes |
| --- | --- | --- | --- |
| MAZANEH_TO_18K | 1.0 | APPROVED | DERIVED MARKET_18K from GOLD_MELTED |
| GOLD_BUBBLE | 1.0 | APPROVED_LIVE_VIA_DERIVED | Uses MAZANEH_TO_18K; neutral SPEC_BLOCKER |
| USD_GAP | 1.0 | APPROVED_LIVE_VIA_DERIVED | USD bubble card; neutral SPEC_BLOCKER |
| SILVER_BUBBLE | 1.0 | BLOCKED | Needs SILVER_999_MARKET |

Code: `mazaneh-to-18k.ts`, `bubble-formulas.ts`, `live-bubbles.ts`

## V5.4 package import — documentation only

Source: ../trading-agent/TRADING_AGENT_CONTRACT_PACKAGE_V1.md, sections 04–07, 24.
Existing rows above describe legacy implementation; they are not V5.4 certification.

| Source formula name | Source version | Import status | Mapping / remaining prerequisite |
| --- | --- | --- | --- |
| GOLD_THEORETICAL_18K | SOURCE_REQUIRED | Supplied expression matches existing theoretical calculation | Exact V5.4 formula identifier/version and engine fixtures required |
| USD_IMPLIED_GOLD | SOURCE_REQUIRED | Supplied expression matches existing implied USD calculation | This is not the independent FX/Dollar Bubble; exact version required |
| SilverTheo999 | V5.4-SILVER.1 | APPROVED expression, NOT ACTIVATED | New factor 0.999 differs from legacy SILVER_BUBBLE 1.0; V5.4 Golden Test required |
| USDImpliedSilver | V5.4-SILVER.1 | APPROVED expression, NOT ACTIVATED | Synchronization, validation, fixture required |
| SilverPremiumPct | V5.4-SILVER.1 | APPROVED expression, NOT ACTIVATED | Depends on SilverTheo999; do not reuse old silver fixtures |
| SilverUSDGapPct | V5.4-SILVER.1 | APPROVED expression, NOT ACTIVATED | Separate field; engine must prevent double counting |

Source names above are preserved; no new canonical formula IDs have been invented.
Existing USD_GAP percent is (actual - implied) / implied ×100. The package supplies implied USD but no replacement Gold Gap percent expression. Preserve existing definition until exact engine mapping is supplied; never silently reverse sign or denominator.
No production formula or historical record changed in this import.
