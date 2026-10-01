import assert from 'node:assert/strict';
import test from 'node:test';
import { goldBubble, silverBubble, silverBubbleV54, usdGap } from '../src/server/bubble-formulas';

const near = (actual: number, expected: number, digits = 2) => {
  const scale = 10 ** digits;
  assert.equal(Math.round(actual * scale) / scale, Math.round(expected * scale) / scale);
};

test('GT-GOLD-01', () => {
  const r = goldBubble({ xauUsd: 4000, usdIrt: 200000, market18k: 19000000 });
  near(r.theoretical, 19290447.94);
  near(r.percent, -1.5057, 4);
});

test('GT-GOLD-02', () => {
  const r = goldBubble({ xauUsd: 4300, usdIrt: 230000, market18k: 24000000 });
  near(r.theoretical, 23847816.27);
  near(r.percent, 0.6381, 4);
});

test('GT-GOLD-03', () => {
  const r = goldBubble({ xauUsd: 3500, usdIrt: 180000, market18k: 16000000 });
  near(r.theoretical, 15191227.75);
  near(r.percent, 5.3239, 4);
});

test('GT-SILVER-01', () => {
  const r = silverBubble({ xagUsd: 50, usdIrt: 200000, silver999Market: 350000 });
  near(r.theoretical, 321507.47);
  near(r.percent, 8.8622, 4);
});

test('GT-SILVER-02', () => {
  const r = silverBubble({ xagUsd: 55, usdIrt: 230000, silver999Market: 410000 });
  near(r.theoretical, 406706.94);
  near(r.percent, 0.8097, 4);
});

test('GT-SILVER-03', () => {
  const r = silverBubble({ xagUsd: 40, usdIrt: 180000, silver999Market: 220000 });
  near(r.theoretical, 231485.38);
  near(r.percent, -4.9616, 4);
});

/**
 * V5.4-SILVER.1 golden tests — independent of legacy GT-SILVER-*.
 * Rounding digits match existing Formula Registry convention (same as GT-SILVER);
 * official tolerance Spec not yet separate.
 */
test('GT-V54-SILVER-01', () => {
  const r = silverBubbleV54({ xagUsd: 50, usdIrt: 200000, silver999Market: 350000 });
  assert.equal(r.formulaVersion, 'V5.4-SILVER.1');
  near(r.silverTheo999, 321185.9582205935, 6);
  near(r.silverGap, 28814.041779406485, 6);
  near(r.silverPremiumPct, 8.971139939939944, 6);
  near(r.usdImpliedSilver, 217942.27987987985, 6);
  near(r.silverUsdGapPct, 8.971139939939924, 6);
});

test('GT-V54-SILVER-02', () => {
  const r = silverBubbleV54({ xagUsd: 55, usdIrt: 230000, silver999Market: 410000 });
  near(r.silverTheo999, 406300.2371490508, 6);
  near(r.silverGap, 3699.7628509491915, 6);
  near(r.silverPremiumPct, 0.9105982504243376, 6);
  near(r.usdImpliedSilver, 232094.37597597597, 6);
  near(r.silverUsdGapPct, 0.9105982504243351, 6);
});

test('GT-V54-SILVER-03', () => {
  const r = silverBubbleV54({ xagUsd: 40, usdIrt: 180000, silver999Market: 220000 });
  near(r.silverTheo999, 231253.88991882736, 6);
  near(r.silverGap, -11253.889918827364, 6);
  near(r.silverPremiumPct, -4.866465131798476, 6);
  near(r.usdImpliedSilver, 171240.36276276276, 6);
  near(r.silverUsdGapPct, -4.866465131798468, 6);
});

test('V5.4 silver differs from legacy by ×0.999 on theoretical', () => {
  const input = { xagUsd: 50, usdIrt: 200000, silver999Market: 350000 };
  const legacy = silverBubble(input);
  const v54 = silverBubbleV54(input);
  near(v54.silverTheo999 / legacy.theoretical, 0.999, 6);
  assert.ok(v54.silverPremiumPct > legacy.percent);
});

test('GT-USD-01', () => {
  const r = usdGap({ xauUsd: 4000, market18k: 19000000, actualUsd: 200000 });
  near(r.theoretical, 196988.69);
  near(r.percent, 1.5287, 4);
});

test('GT-USD-02', () => {
  const r = usdGap({ xauUsd: 4300, market18k: 24000000, actualUsd: 230000 });
  near(r.theoretical, 231467.73);
  near(r.percent, -0.6341, 4);
});

test('GT-USD-03', () => {
  const r = usdGap({ xauUsd: 3500, market18k: 16000000, actualUsd: 180000 });
  near(r.theoretical, 189583.1);
  near(r.percent, -5.0548, 4);
});
