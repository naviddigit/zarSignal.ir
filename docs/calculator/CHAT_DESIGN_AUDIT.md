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
| G01–G09 Gold | Physical units, G02 fine-weight/equivalent-weight, G04 both price directions, gold bubble/value comparison | Full G01 quote/grade matrix, G02 target market price/metal value, standalone G03, G05–G09 outputs including bar, UAE and capital flows; each needs named inputs, units, rounding and fixture tests |
| F01–F06 FX | Domestic USD quote and gold-implied USD gap | AED-derived USD and independent rate identity, general currency conversion/cross rates and their verified feeds |
| C01–C14 Coins | Coin watch price only; no calculator result | Contracted coin specs, buy/sell sides, costs and transaction rules, golden fixtures; bubble belongs to Bubble Board per LOCK-V3-003 |
| S01–S20 Silver | Direct 999 quote, V5.4-SILVER.1 bubble, physical units and fineness-weight conversion | Grain/bar and conversion flows, mint premium from data rather than fixed 1%, ratio/optimizer with bid/ask and costs |
| A01–A14 Melted-gold trader | G04 price factor only | Position ledger, step buys, realized/unrealized P&L, cost basis, partial sells, scenarios and target calculations; this is a separate accounting product and must never use physical `4.608` as a price factor |
| M12 Gold → silver swap | Not implemented | Both tradable sides and costs, synchronized quotes, explicit theoretical-only state when costs are incomplete |
| T01–T06 Shared tools | Physical unit conversion and some percentages embedded in existing calculators | Unified scenario/ROI/formula-detail tools with explicit provenance |

The shared chat describes many more calculations than the current product implements. Do not represent the entire calculator as complete. In particular, a locked tile is not an implemented paid tool. Existing `STATUS_M01_M11.md` tracks the older subset and must be read with this wider V3.0 inventory.

## Release rule

For each remaining module, freeze its input contract and unit, source of live/manual prices, bid/ask and cost treatment, rounding/display tolerance, and golden examples. Only then activate a result or paywall. Do not fill missing prices or rules by guessing and do not generate Buy/Sell/Hold advice from the calculator.
