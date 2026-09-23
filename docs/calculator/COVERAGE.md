# Calculator coverage — 2026-09-23

Inventory against `CALCULATOR_MASTER_SPEC` / M01–M11. Product UI never shows M-codes.

| Status | Count | Notes |
| --- | ---: | --- |
| Master Spec calculation families (M01–M11 + approved bubble/mazaneh/USD gap) | 14 | Counting module families + approved named formulas |
| Implemented in `/calculator` UI | 4 | mazaneh→18k, 18k→mazaneh, gold bubble/theoretical, USD gap |
| Approved + ready (Golden Test exists) | 4 | Same four; Phase 1 launch set |
| Spec blocker | 8 | M01/M02 approval fixtures, M04 jewelry, M05 coins, M06 silver model, M07 general FX, M08 P&L, M09 comparison, M10 advanced |
| Missing Golden Test (blocks launch even if code exists) | 2+ | M01/M02 conversions still need approved fixture sets |

**Real coverage for professional calculator launch: ~20–25%** of the designed product surface (4 of ~14–16 intended user-facing calculations).

Shell (tabs Gold/Silver/Coin/FX + Live/Manual provenance) is confirmed. Do not treat shell completion as calculator completion.
