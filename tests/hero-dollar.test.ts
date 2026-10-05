import test from 'node:test';
import assert from 'node:assert/strict';
import { computeHeroDollar } from '../src/server/hero-dollar';
import type { Quote, Snapshot } from '../src/lib/market';

const observedAt = new Date().toISOString();
const quote = (symbol: 'USD' | 'AED', value: number): Quote => ({
  symbol, buy: String(value), sell: String(value), currency: 'TMN',
  unit: symbol === 'USD' ? 'دلار' : 'درهم', source: 'test', sourceUrl: null,
  observedAt, fetchedAt: observedAt,
});
const snapshot = (quotes: Quote[]): Snapshot => ({ mode: 'live', status: 'ok', quotes });

test('hero dollar shows market USD above AED-implied USD with the approved precise peg', () => {
  const card = computeHeroDollar(snapshot([quote('USD', 293000), quote('AED', 70700)]));
  assert.equal(card.status, 'ok');
  assert.equal(card.theoretical, 70700 * 3.6725);
  assert.ok(Math.abs(card.percent! - 12.846) < 0.01);
  assert.equal(card.gap, 293000 - 70700 * 3.6725);
  const below = computeHeroDollar(snapshot([quote('USD', 250000), quote('AED', 70700)]));
  assert.ok(below.percent! < 0);
});

test('hero dollar fails closed for missing, mismatched and stale rates', () => {
  assert.equal(computeHeroDollar(snapshot([quote('USD', 293000)])).percent, null);
  assert.equal(computeHeroDollar(snapshot([quote('USD', 293000), { ...quote('AED', 70700), currency: 'IRR' }])).percent, null);
  const old = new Date(Date.now() - 30 * 60_000).toISOString();
  const stale = computeHeroDollar({ mode: 'live', status: 'stale', quotes: [
    { ...quote('USD', 293000), observedAt: old }, { ...quote('AED', 70700), observedAt: old },
  ] });
  assert.equal(stale.status, 'stale');
});
