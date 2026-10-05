# Calculator design-chat audit — 2026-10-05

Source: [3- طراحی ماشین حساب طلا](https://chatgpt.com/share/6ac34f80-6448-83ed-9b0c-79cb7f1545e5), especially V3.0's G/F/C/S/A/M12/T modules and LOCK-V3 rules. This is an implementation inventory, not a claim that every proposed module is approved for release.

## Numbers that must not be mixed

| Context | Correct operation | Current UI |
| --- | --- | --- |
| Physical mass of one Iranian mesghal | `1 mesghal = 4.608 g` | Dedicated **تبدیل وزن فیزیکی** tool |
| Market price: 705 mazaneh to 750 gold per gram | `18k price = mazaneh / 4.3318` | **مظنه ↔ گرم ۱۸** tool |
| Reverse market price | `mazaneh = 18k price × 4.3318` | Same tool, direction control |

`4.608` is forbidden **inside the melted-gold trading-price/transaction flow** (LOCK-V3-002); it remains the correct physical weight of a mesghal. A weight converter must not silently use `4.3318` as grams. G02 purity **weight** conversion preserves fine-metal mass: `fine = gross × source fineness / 1000`, then `target gross = fine × 1000 / target fineness`. Price conversion is a different operation.

## Current coverage against the design chat

| Family | Present now | Remaining work before calling the family complete |
| --- | --- | --- |
| G01–G09 Gold | Physical units, G02 fine-weight/equivalent-weight, G03 fine gold/metal value, G04 both price directions, G08 UAE comparison, G09 theoretical capital-to-gold, gold bubble | G01 quote/grade matrix, G02 target market price, G05–G07 bar flows; verified quotes and costs are needed |
| F01–F06 FX | Domestic USD quote, gold-implied USD gap, F03 AED-derived USD via existing versioned peg, F04 manual rate gap, F06 rate comparison | F05 registry-backed currency conversion and verified feeds; F03 is theoretical, not executable FX |
| C01–C14 Coins | C01 buy cost, C02 whole-coin capital, C03 net sale, C08 P&L, C09 break-even from explicit prices/fees | Coin specification registry, remaining scenarios and reliable bid/ask feeds; bubble belongs to Bubble Board per LOCK-V3-003 |
| S01–S20 Silver | Direct 999 quote, V5.4 bubble, S03 fine silver, S07 theoretical capital-to-silver, S08–S09 theoretical bar metal/final cost with explicit mint/tax/spread, S10 bar/metal price gap | Grain/bar conversions, separately sourced mint premium, bid/ask and cost-aware optimizer; no fixed 1% premium |
| A01–A14 Melted-gold trader | G04 price factor; A02/A13 P&L, A03 target, A06 new-buy impact, A07 target average, A08 partial-sale **preview**, A09 break-even with explicit quantities and costs | Actual position ledger, unlimited step buys (A01), automatic cost basis, A04/A05/A10/A11 and executable bid/ask; must never use physical `4.608` as a price factor |
| M12 Gold → silver swap | Market-reference and theoretical comparisons, purity scaling and gap math | Executable bid/ask mode, costs, complete output metadata; current result is **not** a trade instruction |
| T01–T06 Shared tools | Physical unit conversion and T02 percentage change | Scenario/ROI and richer formula-detail presentation with explicit provenance |

The shared chat describes many more calculations than the current product implements. Do not represent the entire calculator as complete or turn missing tools into paid locks. Existing `STATUS_M01_M11.md` tracks the older subset and must be read with this wider V3.0 inventory. New formula-backed tools have server-side plan access in `/admin/analysis-settings`; this is access control, not evidence that the remaining family is complete.

## Release rule

For each remaining module, freeze its input contract and unit, source of live/manual prices, bid/ask and cost treatment, rounding/display tolerance, and golden examples. Only then activate a result or paywall. Do not fill missing prices or rules by guessing and do not generate Buy/Sell/Hold advice from the calculator.
