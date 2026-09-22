import assert from 'node:assert/strict';
import test from 'node:test';
import { convertPurityPrice, convertWeight } from '../src/lib/calculator-conversions';

test('PDF weight conversions use the documented gram equivalents', () => {
  assert.equal(convertWeight(3.5, 'mesghal', 'gram'), 16.128);
  assert.equal(convertWeight(1, 'troyOunce', 'gram'), 31.1035);
});

test('purity price conversion preserves pure-gold value', () => {
  assert.equal(convertPurityPrice(7_500_000, '18k', '24k'), 9_990_000);
  assert.equal(convertPurityPrice(9_990_000, '24k', '18k'), 7_500_000);
});
