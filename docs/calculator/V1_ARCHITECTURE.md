# Calculator V1 — mobile shell + engines

Status: active · UX source = mobile mock (تبدیل وزن → محبوب → قیمت لحظه‌ای → کی‌پد)  
Desktop mock = density reference only.

## Product rules

1. Max 3 steps: pick calc → enter number → see result.
2. No float for money/weight in durable paths; use decimal-safe arithmetic (JS: integer scaling or `decimal.js` only where needed; server already owns approved formulas).
3. Suspicious PDF algebra never ships; PASS requires numeric example + Golden Test.
4. UI never shows M-codes; locked modules explain blocker honestly.
5. Every result carries Audit: inputs, units, provenance, formulaId, version — never the expression string in public payloads.

## Engines (map)

| Engine | V1 | Gate |
| --- | --- | --- |
| Gold Core | Weight convert (default widget), mazaneh↔18k, gold bubble | M01 PASS tests exist; mazaneh/bubble APPROVED |
| Market Data (M11) | LIVE + MANUAL override on price fields | Server validates source/unit/freshness |
| Audit | Required on every professional result | Existing `CalculatorResult` shape |
| Coin / Jewelry / Silver / Trading | Locked tabs | SPEC_BLOCKER until Golden Test |

## First screen (mobile)

1. Asset tabs: طلا (active tools) · نقره/سکه/ارز (locked or USD_GAP only on ارز)
2. Primary widget: weight unit conversion (from ↔ to + swap)
3. Popular chips: وزن · مظنه↔۱۸ · حباب طلا · (locked placeholders)
4. Live strip: مظنه تهران · گرم ۱۸ · اونس · دلار
5. Thumb keypad feeding focused field (mobile only)

## API contract (professional)

```
POST /api/public/calculator/professional
{ operation, inputs: { [key]: { provenance: 'LIVE'|'MANUAL', value: number } } }

→ { formulaId, version, calculatedAt, outputs[], inputs[] (echo+audit), constants[] }
```

Weight-only conversion may stay client-side (open constants) but still shows unit + factor line like mock (`1 مثقال = 4.608 گرم`).

## Formula audit queue

| ID | Verdict | Next |
| --- | --- | --- |
| M01 Weight | PASS | Default mobile widget |
| MAZANEH_TO_18K | PASS | Popular chip |
| GOLD_BUBBLE | PASS | Popular chip |
| USD_GAP | PASS | Under ارز tab |
| M02 Purity | HOLD | Needs approved rounding fixtures |
| M04–M10 | BLOCK | Spec first |

## Non-goals V1

- Buy/sell signals or colored trade advice
- History ledger UI from desktop mock (optional later)
- Shipping jewelry/tax without legal/spec freeze
