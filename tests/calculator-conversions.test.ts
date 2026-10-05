import assert from 'node:assert/strict';
import test from 'node:test';
import { convertPurityPrice, convertPurityWeight, convertWeight } from '../src/lib/calculator-conversions';

test('PDF weight conversions use the documented gram equivalents', () => {
  assert.equal(convertWeight(3.5, 'mesghal', 'gram'), 16.128);
  assert.equal(convertWeight(1, 'troyOunce', 'gram'), 31.1035);
});

test('purity price conversion preserves pure-gold value', () => {
  assert.equal(convertPurityPrice(7_500_000, '18k', '24k'), 9_990_000);
  assert.equal(convertPurityPrice(9_990_000, '24k', '18k'), 7_500_000);
});

test('G02 purity conversion preserves fine gold mass rather than treating weight as price', () => {
  const result = convertPurityWeight(10, '18k', '24k');
  assert.equal(result.fineWeight, 7.5);
  assert.ok(Math.abs(result.targetWeight - 7.5 / 0.999) < 1e-10);
  const back = convertPurityWeight(result.targetWeight, '24k', '18k');
  assert.ok(Math.abs(back.targetWeight - 10) < 1e-10);
  assert.throws(() => convertPurityWeight(-1, '18k', '24k'));
});
