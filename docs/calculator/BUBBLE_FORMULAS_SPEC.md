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

## Data gap vs current ZarSignal feed (SPEC_BLOCKER for live wiring)

Current live symbols: `GOLD_MELTED` (مثقال), `XAU_USD`, `XAG_USD`, `USD`, `EUR`, `AED`, `DUBAI_GOLD_OZ`.

Missing for these formulas:

- `MARKET_18K` = domestic 18K gold [Toman / gram]
- `SILVER_999_MARKET` = domestic silver 999 [Toman / gram]

Do NOT invent conversion from مثقال آب‌شده → گرم ۱۸ عیار without a separate approved Spec.

## Modules

| ID | Doc |
| --- | --- |
| GOLD_BUBBLE | `M_BUBBLE_GOLD.md` |
| SILVER_BUBBLE | `M_BUBBLE_SILVER.md` |
| USD_GAP | `M_BUBBLE_USD_GAP.md` |

Chart history rule: `../references/BUBBLE_HISTORY_RULE.md`  
Glossary: `../references/GLOSSARY.md`
