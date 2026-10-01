# Calculator M01–M11 status — 2026-10-01

Product UI never shows M-codes. Auth P0 closed; this matrix is the production truth for Calculator Master.

| Module | Status | In `/calculator` | Notes | Need from Mojtaba (if BLOCKED) |
| --- | --- | --- | --- | --- |
| **M01** Weight conversion | **PARTIAL** | Yes (default) | Code + sample `3.5 مثقال → 16.128 گرم`; Phase1 says not fully approved for “professional launch” | Confirm rounding rules + full Golden Test set as APPROVED |
| **M02** Purity conversion | **PARTIAL** | Yes | UI live; no approved Golden Test pack | Approved fixture set (karats + silver fineness in/out) |
| **M03** Gold melted / mazaneh | **DONE** | Yes | Mazaneh↔18k + gold bubble; server Golden Tests | — |
| **M04** Jewelry gold | **BLOCKED** | Locked tile | SPEC_BLOCKER | Tax/اجرت law + product formula + Golden Tests |
| **M05** Coins | **BLOCKED** | Tab visible; tools locked | SPEC_BLOCKER | Coin weights, bubble formula, units |
| **M06** Silver | **PARTIAL** | Bubble live V5.4-SILVER.1 | Jewelry/ratio locked; neutral band blocked | Neutral band rules; jewelry/ratio Source |
| **M07** FX | **PARTIAL** | USD gap only | General FX converter locked | Pair list + rates Source for general FX |
| **M08** P&L | **BLOCKED** | No | SPEC_BLOCKER | Accounting model + audit trail Spec |
| **M09** Investment compare | **BLOCKED** | No | SPEC_BLOCKER | Comparison definition + fixtures |
| **M10** Advanced tools | **BLOCKED** | No | SPEC_BLOCKER | Which tools + formulas |
| **M11** Data input engine | **DONE** | Yes | LIVE/MANUAL provenance; server validates live | — |
| **SILVER_BUBBLE** | **DONE** | Yes | V5.4-SILVER.1 live | Neutral band only |
| **USD_GAP** | **DONE** | Yes | Approved gap vs implied USD | — |
| Buy/sell advice colors | **BLOCKED** | Forbidden | Never invent | Explicit product ban remains |
| Future gold / فردایی | **BLOCKED** | Forbidden | SOURCE_REQUIRED | Never invent; wait for Source |

## Mobile UX (this pass)

- Manual mode: clear to `0` + spinning neon ring (mode cue only)
- Result boxes: visual left (`grid-area: out` + result panel in main column)
- Mobile grid: no `1fr` stretch on main (removes empty gap in section)
- Soft boot logo: MIN 2.8s / MAX 5.2s

## Funnel events (wired)

`landing_view` / `returning_user` → `calculator_open` → `calculator_complete` → `signup_start` → `signup_complete` → `pricing_view` → `plan_select` → `checkout_start` → (later) `payment_success` / `subscription_activated`

Persistence warehouse still ACK-only until provider chosen.

## Payment prep

- `activateSubscriptionFromPayment` — server-only ACTIVE
- `POST /api/payments/webhook` — secret-gated stub; provider verify = SOURCE_REQUIRED
