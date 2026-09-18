# ZARSIGNAL_PRODUCT_SPEC.md

> Status: Product Source of Truth — Draft v0.1  
> Product: ZarSignal.ir  
> Purpose: Single reference for Product, UX, Engineering, Codex and AI agents  
> Rule: If this document conflicts with implementation guesses, this document wins.  
> Rule: NEVER invent financial formulas, market prices, accounting facts, tax rules, trading signals, or legal conclusions.

---

# 1. Product Vision

ZarSignal is a decision-support and professional tooling platform for the Iranian gold, silver, coin and FX markets.

The product must not position itself as a “magic signal seller”.
Its core value proposition is:

1. Show the user what the market is doing now.
2. Explain why.
3. Compare market price with implied/theoretical/fair-value calculations.
4. Help the user understand risk before acting.
5. Record the financial result correctly after acting.
6. Provide professional calculation and API tools around the same data layer.

Primary product principle:

> Data → Interpretation → Risk → Decision Support → Accounting

The user must be able to understand the state of the market in seconds, then drill down into the reasoning.

---

# 2. Target Users

## 2.1 Home Trader — نوسانگیر خانگی

Typical characteristics:
- Lower capital
- Lower trading frequency
- Less professional market infrastructure
- Needs simple explanations
- Needs stronger capital-management guardrails
- Needs fewer numbers on first screen
- May confuse “analysis” with “guaranteed signal”

Product behavior:
- Simpler language
- Clear risk warnings
- Position sizing guidance
- Strong emphasis on capital preservation
- Default conservative presentation
- Avoid encouraging overtrading

## 2.2 Professional Trader — نوسانگیر حرفه‌ای

Typical characteristics:
- Higher trade frequency
- Larger capital
- Needs raw inputs and formulas
- Wants theoretical/implied values
- Wants API access and historical data
- Needs accounting and auditability

Product behavior:
- Advanced dashboards
- Formula transparency
- More granular alerts
- API and data export
- Professional accounting
- Configurable thresholds

## 2.3 Developer / API Customer

Needs:
- Stable real-time market API
- Clear units/currency/precision
- Authentication
- Rate limits
- Status page
- Versioning
- Documentation
- Historical data where available

## 2.4 Future Marketplace Participant

Future users may trade:
- Melted gold
- Silver
- Coins

Marketplace is a later-stage product and MUST NOT be treated as an MVP dependency.

---

# 3. Core Product Modules

## 3.1 Market Bubble Board — تابلوی حباب

Assets:
- Gold
- Coin
- Silver
- FX / USD where relevant

Board should show, depending on asset and available formulas:
- Live market price
- Reference price
- Theoretical / implied price
- Absolute difference
- Percentage premium/discount (“bubble”)
- Short trend state
- Data timestamp
- Data source health
- Confidence / freshness state

UX principle:
The user must understand in under ~5 seconds whether:
- Market is above fair/reference value
- Below fair/reference value
- Near equilibrium
- Data is stale or uncertain

DO NOT:
- Color everything red/green like a gambling interface.
- Present an estimated/theoretical price as an objective truth.
- Hide timestamp or source state.

---

# 4. Swing-Trading Assistant — دستیار نوسانگیر

## 4.1 Purpose

The agent is a market-direction and decision-support assistant.

It MUST NOT claim certainty.
It MUST NOT guarantee profit.
It MUST NOT create undocumented buy/sell signals.

Primary outputs may include:
- Market bias: bullish / bearish / neutral
- Strength/confidence
- Market price
- Theoretical/implied value
- Premium/discount
- Important conditions supporting the bias
- Invalidation condition
- Risk warning
- Data freshness

## 4.2 Required Input Categories

Depending on the selected instrument:
- Live domestic market price
- Relevant global price
- USD/IRR or Toman reference
- Asset conversion coefficients
- Market spread
- Bubble/premium metrics
- User-selected horizon
- Timestamp
- Data quality state

Exact calculation formulas MUST be stored separately and versioned.

## 4.3 Decision Output Contract

Every agent result should be structurally explainable:

- `direction`
- `confidence`
- `market_price`
- `theoretical_price`
- `deviation_percent`
- `reasons[]`
- `risk_flags[]`
- `invalidation`
- `data_timestamp`
- `formula_version`
- `data_source_versions[]`

The UI must distinguish:
- Fact
- Calculated value
- Model inference
- User-entered value

## 4.4 Forbidden Behavior

The agent must not:
- Fabricate missing inputs.
- Fill missing price feeds with guessed numbers.
- say “buy now” solely because one ratio is positive.
- pretend backtested accuracy without real evidence.
- suppress uncertainty.
- silently change formulas.

---

# 5. Capital & Risk Management — مدیریت سرمایه

Capital management is a first-class product feature, not a disclaimer hidden in the footer.

## 5.1 User Agreement

Before using advanced trading guidance, the user should acknowledge that:
- Market trading contains risk.
- ZarSignal provides analysis/decision-support, not guaranteed returns.
- Position size and loss limits matter.
- The user has reviewed the capital-management education page.

The agreement should contain a direct link to the education page.

Do not use the agreement as a deceptive legal shield.
It should genuinely educate the user.

## 5.2 Education Page Structure

### Step 1 — Capital preservation
Goal:
Avoid catastrophic loss.

Explain:
- Never allocate all liquid capital to one trade.
- Separate trading capital from living/emergency money.
- A profitable system can still destroy an account with bad sizing.

### Step 2 — Risk per trade
User selects:
- Total trading capital
- Maximum acceptable loss
- Stop distance / invalidation level

System calculates an appropriate position size.

Generic formula:

`Risk Amount = Trading Capital × Risk %`

`Position Size = Risk Amount / Monetary Loss Per Unit at Stop`

The exact implementation must account for each market’s units.

### Step 3 — Stop / Invalidation
A stop is not a random percentage.
It should represent where the original trade thesis becomes invalid.

### Step 4 — Risk/Reward
Show:
- Maximum planned loss
- Planned target profit
- Risk/Reward ratio

Generic display:

`R:R = Potential Profit / Potential Loss`

### Step 5 — Exposure
Warn when:
- Several open positions depend on the same underlying variable.
- The user is effectively duplicating the same risk.

### Step 6 — Overtrading
More trades ≠ more expected profit.

### Step 7 — Drawdown
Show how recovery becomes harder after larger losses.

Educational examples can be shown, but examples must be clearly labeled as examples.

## 5.3 Home vs Professional Presentation

Home:
- Simple risk slider
- Strong warnings
- Default conservative thresholds

Professional:
- Manual risk configuration
- Multiple positions
- Portfolio exposure
- Exportable calculations

---

# 6. Melted Gold Accounting — حسابداری طلای آبشده

Accounting rules must prioritize auditability.

Framework:
`CLOUD ACCOUNTING AGENT V1.3`

## 6.1 Non-negotiable Accounting Principles

- No guessing.
- No fabricated transaction fields.
- Every transaction must have a traceable ID.
- Corrections must never silently overwrite history.
- Separate cash from inventory.
- Separate realized P&L from unrealized P&L.
- Preserve original purity/assay information.
- Normalize Toman/Rial explicitly.
- Normalize weight units explicitly.
- Use weighted-average cost unless the user explicitly selects another supported method.
- Maintain piece-level tracking where required.
- Preserve the perspective of the source document when reversing debtor/creditor interpretation.

## 6.2 Required Transaction Data

At minimum, where relevant:
- Transaction ID
- Date/time
- Buy / sell / receive / deliver / adjustment
- Weight
- Weight unit
- Purity / assay
- Price basis
- Currency unit: Rial or Toman
- Fees
- Taxes if applicable and explicitly known
- Counterparty
- Payment state
- Inventory effect
- Cash effect
- Supporting document
- Notes
- Correction/reversal references

## 6.3 Inventory

System must track:
- Gross weight
- Effective fine-gold equivalent where applicable
- Assay/purity
- Acquisition cost
- Remaining quantity
- Linked transaction history

## 6.4 P&L

Keep separate:
- Realized profit/loss
- Unrealized profit/loss

Unrealized P&L must be recalculated against a clearly identified market/reference price and timestamp.

## 6.5 Corrections

Never edit old financial history without trace.

Use:
- Reversal transaction
- Corrected transaction
- Reference to original ID
- Audit log

## 6.6 Currency and Unit Safety

Every calculation must know explicitly:
- Rial vs Toman
- Gram vs mesghal / ounce / other unit
- Purity basis

If unit is ambiguous:
STOP calculation and ask/flag.

---

# 7. Professional Gold / Silver / Coin Calculator

The calculator is not one giant form.
It should be a modular calculation center.

Possible modules:

## 7.1 Melted Gold
Inputs:
- Weight
- Purity
- Price basis
- Fees
- Optional tax fields where applicable

Outputs:
- Pure-gold equivalent
- Gross value
- Fees
- Final payable/receivable amount

## 7.2 Purity Conversion
Convert values between different assay/purity bases.

All conversions must display:
- Source purity
- Target purity
- Weight impact
- Formula used

## 7.3 Gold Price Conversions
Possible conversions:
- Ounce ↔ gram
- Global price + FX → domestic theoretical price
- Various purity standards

Exact constants must be centralized and versioned.

## 7.4 Coin
Possible outputs:
- Theoretical value
- Market value
- Bubble/premium
- Bubble %

## 7.5 Silver
Equivalent calculator architecture using silver-specific constants.

## 7.6 Boundary Conditions

Calculator must reject or visibly warn on:
- Negative weights
- Zero prices where not meaningful
- Impossible purity values
- Missing currency unit
- Extreme inputs
- Stale market price
- Mixed Rial/Toman inputs
- Unsupported units
- precision/rounding ambiguity

## 7.7 Calculator Auditability

Every result should be able to expose:
- Inputs
- Formula
- Constants
- Data timestamp
- Rounding policy
- Result

---

# 8. Trader Accounting Assistant — دستیار حسابدار نوسانگیر

Purpose:
Connect trading activity with accounting records.

Must support:
- Buys
- Sells
- Inventory
- Cash flow
- Fees
- Realized P&L
- Unrealized P&L
- Average cost
- Transaction history
- Corrections

Professional tier may include:
- Counterparties
- Multiple wallets/accounts
- Exports
- Advanced reports
- Tax-support reports where legally valid and explicitly defined

---

# 9. API Platform

API service is for developers and professional customers.

Core requirements:
- API keys
- Encrypted key storage
- Per-key permissions
- Rate limits
- Usage metering
- API versioning
- Error codes
- Status/health
- Documentation
- Source timestamp
- Unit metadata

Potential endpoints:
- Spot/latest price
- Market bubble metrics
- Theoretical/implied values
- Historical series
- Calculation endpoints
- Instrument metadata

API MUST NOT return an unlabeled number.
Every response should identify unit, currency, timestamp and source/calculation version.

---

# 10. Marketplace — Future

Future marketplace may cover:
- Melted gold
- Silver
- Coins

Marketplace requires a separate legal/security/product phase.

Do NOT prematurely build transaction execution before:
- Identity/KYC requirements are understood
- custody/settlement model is defined
- fraud prevention exists
- legal requirements are reviewed
- dispute process exists
- accounting linkage is designed
- security review is complete

Marketplace is NOT an MVP launch blocker.

---

# 11. Landing Page Information Architecture

Recommended priority:

1. Hero — what ZarSignal does
2. Live market pulse
3. Bubble/fair-value dashboard preview
4. Trading assistant preview
5. Why the analysis is explainable
6. Professional calculator
7. Trader accounting
8. Risk management / education
9. API for developers
10. Plans
11. Trust / methodology / data freshness
12. Future marketplace teaser
13. FAQ
14. Legal / risk disclaimer

The page should sell a clear outcome, not a pile of features.

Primary message:
“Understand market direction, valuation and risk from one place.”

---

# 12. Dashboard UX Principles

The main dashboard should answer:
1. What is happening?
2. Why?
3. How reliable/fresh is the data?
4. What would invalidate the interpretation?
5. What is my risk?

Do not overload the first screen.

Use progressive disclosure:
- Basic summary first
- Detailed formula/data second

---

# 13. Trust Architecture

For a financial product, trust is a feature.

Expose:
- Market data timestamp
- Source health
- Calculation methodology
- Formula/version identifiers
- Service status
- “Estimated/Theoretical” labels
- Change log for important model changes

Avoid fake precision.

If data is stale:
Do not continue presenting the output as live.

---

# 14. Authentication & Roles

Current implementation:
- Google authentication via Auth.js
- Prisma models: User, Account, Session, VerificationToken
- Admin authentication
- Signed admin session / HttpOnly cookie

Expected roles:
- Visitor
- Registered user
- Home trader
- Professional trader
- API customer
- Admin

Authorization must be enforced server-side, not only by hiding UI.

---

# 15. Admin Panel

Admin areas should include:

## System
- health
- build/version
- DB state
- background jobs
- API latency

## Market Data
- provider status
- last update
- failed feeds
- manual disable/fallback controls

## Analysis Models
- active formula/model version
- change history
- test status
- release control

## Integrations
- provider configuration
- encrypted credentials
- test connection
- last successful request

Secrets:
- AES-256-GCM at rest where currently implemented
- never send stored secret values back to browser
- never log secrets

## Subscription/API
- plans
- limits
- usage
- active keys
- revocation

## SEO / Content
- indexability
- sitemap
- robots
- structured data
- public content status

---

# 16. Plans / Monetization

Do not finalize prices until product value is tested.

Suggested capability segmentation:

Free / Visitor:
- Delayed or limited market view
- Basic calculators
- Education

Home:
- Live dashboard
- Home trading assistant
- risk tools
- basic accounting

Professional:
- advanced assistant
- advanced accounting
- deeper analytics
- exports
- configurable alerts
- higher limits

Developer/API:
- API access
- separate metering and pricing

Marketplace:
- later transactional monetization model

---

# 17. Notification Strategy

Useful notifications:
- Data feed failure
- User-defined premium/discount thresholds
- Material change in market regime
- Risk threshold exceeded
- Important account/API usage state

Avoid:
- manipulative FOMO
- “BUY NOW” marketing
- excessive push notifications
- gamification of losses/wins

---

# 18. SEO / AI Discoverability

Current implementation includes:
- sitemap
- robots
- canonical
- JSON-LD
- llms.txt
- sharing cards

Requirements:
- `/admin` must stay non-indexable
- Private user pages must not be indexed
- Public educational/calculator pages should have crawlable explanatory content
- Dynamic price pages must clearly timestamp price data

SEO copy must not make unsupported profit claims.

---

# 19. Security Requirements

Already implemented / planned:
- HttpOnly auth session where applicable
- encrypted integration secrets
- PostgreSQL + Prisma
- environment variables for secrets

Before production:
- rotate `ADMIN_BOOTSTRAP_TOKEN`
- set strong `AUTH_SECRET`
- set independent `INTEGRATION_ENCRYPTION_KEY`
- configure production Google OAuth callback
- apply DB migrations
- run production security review
- implement rate limiting
- CSRF/session review
- authorization tests
- audit admin actions
- secret scanning
- backup/restore test
- dependency vulnerability scan

Never commit `.env`.

---

# 20. Data Architecture Principle

All financial modules should share a canonical instrument/data model.

Example fields:
- instrument_id
- symbol
- category
- market_price
- price_unit
- currency_unit
- timestamp
- source
- source_health
- theoretical_price
- theoretical_formula_version
- precision

Avoid each page implementing its own conversion constants.

Centralize:
- units
- constants
- formulas
- rounding policies
- market providers

---

# 21. Formula Governance

This is critical.

Every financial formula should have:
- `formula_id`
- `version`
- human-readable description
- input schema
- unit requirements
- constants
- rounding behavior
- edge cases
- tests
- effective date

No formula changes silently.

---

# 22. Testing Requirements

Minimum:
- unit tests for formulas
- boundary tests
- currency unit tests
- Rial/Toman confusion tests
- purity tests
- rounding tests
- stale-data behavior
- mobile UI tests
- desktop UI tests
- auth/authorization tests
- API contract tests

Financial tests should use known fixtures with expected outputs.

---

# 23. Product Metrics

North-star candidates:
- Weekly users who complete a meaningful market analysis session
- Retention after first useful decision-support experience

Track funnel:
- Landing visit
- Dashboard interaction
- Calculator completion
- Signup
- First assistant use
- Risk-management acknowledgement
- Return visit
- Paid conversion

Do not optimize for raw page views.

Target:
- Build toward 10,000 genuinely active/useful customers, not vanity registrations.

---

# 24. MVP Priorities

P0:
- Reliable market data layer
- Bubble/theoretical calculations
- Core market dashboard
- clear data freshness
- basic trading assistant
- risk education
- calculator foundations
- authentication
- safe admin/integration management

P1:
- Professional calculator suite
- Trader accounting
- user preferences
- alert engine
- subscriptions
- API beta

P2:
- advanced analytics
- historical comparisons
- portfolio/risk exposure
- richer professional reports

P3:
- marketplace

---

# 25. Codex Operating Rules

Codex is an implementation agent, not the Product Owner.

Before implementing financial logic, Codex MUST verify:
1. Is the formula explicitly defined?
2. Are input units explicit?
3. Is currency unit explicit?
4. Is rounding defined?
5. Are edge cases defined?
6. Are tests defined?

If any answer is NO:
Do not invent.
Create a `SPEC_BLOCKER` item.

Example:

`SPEC_BLOCKER: Exact coin theoretical-value formula is not defined in Product Spec.`

Codex may propose an implementation, but must not silently make it canonical.

---

# 26. Known Current Technical State

Current local routes reported:
- `/`
- `/admin`
- `/admin/integrations`
- `/login`

Current technical stack/components reported:
- Next.js application
- Auth.js Google authentication
- Prisma
- PostgreSQL target database
- encrypted integration keys using AES-256-GCM
- light/dark mode
- sitemap / robots / canonical / JSON-LD / llms.txt

Current blocker:
- PostgreSQL local database not running / Docker Desktop not active
- migration not yet deployed to a running DB

Required once PostgreSQL is available:

```bash
npx prisma migrate deploy
```

Google OAuth local callback:

```text
http://localhost:3000/api/auth/callback/google
```

Production callback:

```text
https://zarsignal.ir/api/auth/callback/google
```

Required production environment variables include:

```env
AUTH_SECRET=
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
INTEGRATION_ENCRYPTION_KEY=
```

---

# 27. Open Specification Blockers

The following MUST be resolved from the original domain requirements before production financial logic is considered final:

1. Exact melted-gold accounting formulas and transaction examples.
2. Exact supported purity conversion formulas/standards.
3. Exact fee/tax treatment for each transaction type.
4. Exact theoretical/implied price formulas per instrument.
5. Exact coin bubble formulas and instrument constants.
6. Exact silver formulas.
7. Exact trading-agent threshold logic.
8. Exact confidence scoring.
9. Exact alert thresholds/defaults.
10. Exact accounting report structure.
11. Subscription prices and limits.
12. API SLA / rate limits.
13. Legal wording for trading-risk agreement.
14. Marketplace regulatory/custody/settlement model.

Until resolved, Codex must treat these as blockers rather than guess.

---

# 28. Definition of Done for Financial Features

A financial feature is NOT done just because UI/build/tests pass.

It is done only when:
- formula is approved
- units are explicit
- source data is validated
- stale-data handling exists
- edge cases are tested
- calculation is explainable
- output is timestamped
- mobile/desktop UX passes
- risk/legal labeling is correct where required
- audit trail exists where required

---

# 29. Product North Star

ZarSignal should become the place where a user can answer:

> بازار الان کجاست، چرا اینجاست، نسبت به ارزش محاسباتی چقدر فاصله دارد، ریسک من چیست، و نتیجهٔ معامله‌ام واقعاً چقدر بوده؟

Every feature should support that question.

If it does not, it should justify why it belongs in the product.
