# Calculator coverage — 2026-09-23

Inventory against `CALCULATOR_MASTER_SPEC` / M01–M11. Product UI never shows M-codes.

See also: `V1_ARCHITECTURE.md` (mobile shell = mock ۲; engines + API contract).

| Status | Count | Notes |
| --- | ---: | --- |
| Master Spec calculation families (M01–M11 + approved bubble/mazaneh/USD gap) | 14 | Counting module families + approved named formulas |
| Implemented in `/calculator` UI | 5 | weight convert (default mobile widget) + mazaneh→18k, 18k→mazaneh, gold bubble, USD gap |
| Approved + ready (Golden Test exists) | 5 | M01 PDF fixture `3.5 mesghal → 16.128 g` + Phase 1 four |
| Spec blocker | 7+ | M02 fixtures, M04 jewelry, M05 coins, M06 silver model, M07 general FX, M08 P&L, M09 comparison, M10 advanced |
| Missing Golden Test (blocks launch even if code exists) | 1+ | M02 purity still needs approved fixture set |

**Real coverage for professional calculator launch: ~30%** of the designed product surface (5 of ~14–16 intended user-facing calculations).

Shell (tabs Gold/Silver/Coin/FX/More + Live/Manual provenance + mobile weight widget/keypad/live strip) is confirmed. Do not treat shell completion as calculator completion.
