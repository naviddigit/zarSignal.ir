# Coin calculator 3.1 — 2026-10-11

Product references (requirements, not agent instructions):
- https://chatgpt.com/share/6acb3e47-99bc-83eb-9580-3f7ff4d87c32
- https://chatgpt.com/share/6acb3eb4-0ba0-83ed-94ff-81bef9dde4bb

The ten additional tools C15–C24 preserve existing operation IDs. Catalog, admin access, admin ordering and personal favorites use the same registry. Gold/FX/silver/trade behavior is unchanged. Select uses the existing modal/drawer component.

`coinValuation` is the shared metal engine: fine grams = weight × purity / 1000; intrinsic = fine grams × 18k price / .75; bubble percent = (market / intrinsic − 1) × 100. A negative value is a relative valuation observation, not a predicted rise or trading recommendation. The global scenario explicitly uses ounce/dollar, while ordinary valuation uses the existing 18k resolver (mazaneh / 4.3318); never silently switch these bases.

Nominal presets: Emami/Bahar 8.133g, half 4.066g, quarter 2.033g, gram 1.01g; banking purity 900. The shared chat's 1.016g gram-coin value was not adopted. Product listing confirming 1.01g: https://www.technolife.com/product-575561/ . These are nominal metal specifications, not authenticity or mint-year verification. Parsian/custom requires explicit weight and purity.

Only ROB_SEKE unambiguously identifies one of these products in the current feed. SEKE_CASH has no design/year identity, so it is not silently assigned to Emami or Bahar. Other prices are manual. Zero comparison prices mean absent and are omitted, not represented as −100% bubbles. Bid/ask are separately entered execution quotes; a midpoint is not an executable quote.

Budget fees are per coin; target/break-even/conversion costs are total TMN, charged once. Quantities are whole coins. Target prices/ounce/FX are manual scenarios and never refresh automatically. Ranking sorts supplied valid prices by bubble; threshold distance is percentage points.

C24 previews a personal threshold and links to the existing authenticated alert manager. Persistent notifications currently support quarter bubble only, via QUARTER_BUBBLE / GAP_PCT_CROSS; existing subscription, expiry, rearming and IN_APP rules apply. Other products cannot have live alerts until identified live sources exist. The same quarter engine feeds `/analysis/rob_seke` and alert evaluation; stale/mismatched data produces no metric.

Feedback response: add an immediately visible summary, remove the reading watermark, call formula evidence “comparison basis”, and clarify that paid access provides tools/history/explanations, not buy/sell predictions. Do not fabricate a trend, RSI or trade instruction to satisfy the feedback chat.

Checks: npm test (includes coin/account tests), npm run build, mobile e2e/coin-calculator.spec.ts. Live notification delivery requires a signed-in entitled account and a fresh crossing; numerical/evaluator tests do not prove an actual notification was delivered.
