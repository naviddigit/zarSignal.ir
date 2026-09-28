# AMENDMENTS

Status: PARTIAL — approved supplied rules only; complete FX/Coin/Silver amendment texts SOURCE_REQUIRED
Source: [owner-supplied package](TRADING_AGENT_CONTRACT_PACKAGE_V1.md), sections 00, 04, 05, 06, 07.

This is a lossless extraction of supplied sections, NOT the full Master Prompt V5.4. Recommended response examples are not executable validated schemas. No missing engine rules were reconstructed.

00 — SOURCE OF TRUTH / PRECEDENCE
==================================================

Engine Source of Truth:
ZarSignal Master Prompt V5.4

V5.4 supersedes V5.3.

Active amendments preserved in V5.4:

- ZSA-FX-001
- COIN-2026-01 / ZSA-COIN-001
- SILVER-2026-01 / ZSA-SILVER-001

V5.4 creation audit reported preservation of all 58/58 prior sections
and addition of the Silver amendment without deleting existing rules.

Precedence:

1. Explicit active amendment
2. ZarSignal Master Prompt V5.4
3. Approved Formula Registry / Golden Tests
4. Approved Product Presentation Decisions
5. UI

UI, API or implementation code MUST NOT override engine rules.

Existing:
docs/trading-agent/DECISION_ENGINE.md
docs/trading-agent/TRADING_AGENT_SPEC.md

must not remain competing Sources of Truth.

After importing this package:
either mark them SUPERSEDED or convert them into references to this contract.



04 — GOLD / FX SEPARATION
==================================================

CRITICAL V5.4 RULE:

Gold-Implied USD Gap != Dollar Bubble

Never merge them.

Approved gold-derived implied USD relationship already present in the
ZarSignal calculation framework:

USD_IMPLIED_GOLD =
MARKET_18K × 41.4713024 / XAUUSD

where the equivalent conversion basis comes from:

31.1034768 / 0.75 = 41.4713024...

Gold theoretical 18K relationship:

GOLD_THEORETICAL_18K =
(XAUUSD / 31.1034768) × USD_MARKET × 0.75

Gold relative valuation and Gold-Implied USD Gap must remain separate
from the independent FX/Dollar Bubble defined by ZSA-FX-001.

Do not display Gold-Implied USD Gap under the title "حباب دلار".

Professional UI should use concepts such as:

دلار لحظه‌ای
دلار ضمنی طلا
فاصله دلار ضمنی
روند فاصله

without exposing proprietary formula implementation.



05 — COIN AMENDMENT
==================================================

Active:
COIN-2026-01 / ZSA-COIN-001

CRITICAL:

CoinUSDGapPct != CoinBubblePct

These are separate dimensions.

Architecture must keep independent fields for:

coin_market_price
coin_theoretical_value
coin_bubble_pct

usd_implied_coin
coin_usd_gap_pct

Do not merge them into one generic "coin gap".

Any SwapEdge logic must remain bid/ask-aware according to V5.4.

Do not use midpoint-only assumptions where the active amendment requires
actual executable buy/sell sides.



06 — SILVER AMENDMENT
==================================================

Active:
SILVER-2026-01 / ZSA-SILVER-001

Approved V5.4 formulas:

SilverTheo999 =
(XAGUSD × USDMarket / 31.1034768) × 0.999

USDImpliedSilver =
(Silver999Market × 31.1034768) /
(XAGUSD × 0.999)

SilverPremiumPct =
(Silver999Market - SilverTheo999) /
SilverTheo999 × 100

SilverUSDGapPct =
(USDImpliedSilver - USDMarket) /
USDMarket × 100

Version:

SILVER_CALC_VERSION = V5.4-SILVER.1

Requirements:

- synchronized snapshot
- data-quality validation
- double-counting protection
- versioned calculation
- Golden Test

SilverPremiumPct and SilverUSDGapPct are separate evidence dimensions.

Do not count the same economic divergence twice in a decision score.

IMPORTANT:
If required SILVER_999_MARKET is not available/valid,
do not fabricate Silver Bubble.



07 — DOUBLE-COUNTING CONTROL
==================================================

V5.4 explicitly requires avoiding double counting economically equivalent
signals.

Examples:

Gold Premium/Discount
and
Gold-Implied USD Gap

may describe related divergence.

Likewise:

SilverPremiumPct
and
SilverUSDGapPct

must not automatically become two independent confirmations if they are
mathematically expressing the same underlying dislocation.

Coin valuation and CoinUSDGap must also follow the active coin amendment.

The engine decides how evidence is combined.

Frontend MUST NOT add confirmations or increase Confidence because two
related metrics are both displayed.
