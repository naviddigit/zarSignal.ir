# Bubble & Public Terminology Spec v1.0

Status: APPROVED except explicit SPEC_BLOCKER items  
Source: ChatGPT Product Management + Master Prompt مجتبی  
Date registered: 2026-09-20

LiveCloud is behavioral reference only. Formulas below are NOT reverse-engineered from LiveCloud numbers.

## Safety

- Formula ≠ Signal
- Bubble ≠ Buy/Sell recommendation
- Neutral thresholds: SPEC_BLOCKER — do not invent ±0.5% / ±1%
- Until neutral range is approved: UI may show the numeric bubble but MUST NOT label Positive / Neutral / Negative via a band
- All inputs need timestamp + unit
- Rial/Toman mismatch blocks calculation
- XAU/XAG must be USD/troy oz before execution
- Historical bubble(T) uses synchronized inputs at T only
- Formula version must be persisted with history

## Data vs feed

Upstream feed has `GOLD_MELTED` (مظنه مثقال ۷۰۵), not a separate 18K gram row and not SILVER_999.

Approved path (option B):

- Derive `MARKET_18K` via `MAZANEH_TO_18K` (provenance DERIVED)
- Enable GOLD_BUBBLE + USD_GAP
- SILVER_BUBBLE remains SPEC_BLOCKER

When a direct 18K feed arrives later, keep DERIVED and DIRECT side-by-side for data-quality cross-check.

## Modules

| ID | Doc |
| --- | --- |
| GOLD_BUBBLE | `M_BUBBLE_GOLD.md` |
| SILVER_BUBBLE | `M_BUBBLE_SILVER.md` |
| USD_GAP | `M_BUBBLE_USD_GAP.md` |

Chart history rule: `../references/BUBBLE_HISTORY_RULE.md`  
Glossary: `../references/GLOSSARY.md`
