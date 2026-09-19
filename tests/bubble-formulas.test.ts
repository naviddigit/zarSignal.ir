import assert from 'node:assert/strict';
import test from 'node:test';
import { goldBubble, silverBubble, usdGap } from '../src/server/bubble-formulas';

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
