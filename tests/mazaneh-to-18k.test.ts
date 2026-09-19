import assert from 'node:assert/strict';
import test from 'node:test';
import { mazanehTo18k, market18kToMazaneh } from '../src/server/mazaneh-to-18k';
import { goldBubble, usdGap } from '../src/server/bubble-formulas';

test('GT-MAZANEH-TO-18K', () => {
  const derived = mazanehTo18k(100_000_000);
  // Exact: 1e8 * 750 / (705 * 4.608) ≈ 23086583.92
  assert.ok(Math.abs(derived.market18k - 23_086_583.92) <= 0.01);
  assert.equal(derived.provenance, 'DERIVED');
  assert.equal(derived.formulaId, 'MAZANEH_TO_18K');
});

test('reverse mazaneh conversion round-trips', () => {
  const melted = 100_000_000;
  const back = market18kToMazaneh(mazanehTo18k(melted).market18k);
  assert.ok(Math.abs(back - melted) < 1e-6);
});

test('gold bubble accepts derived MARKET_18K from mazaneh', () => {
  const market18k = mazanehTo18k(100_000_000).market18k;
  const r = goldBubble({ xauUsd: 4000, usdIrt: 200000, market18k });
  assert.ok(Number.isFinite(r.percent));
});

test('usd gap accepts derived MARKET_18K from mazaneh', () => {
  const market18k = mazanehTo18k(100_000_000).market18k;
  const r = usdGap({ xauUsd: 4000, market18k, actualUsd: 200000 });
  assert.ok(Number.isFinite(r.percent));
});
