import assert from 'node:assert/strict';
import test from 'node:test';
import { convertPurityPrice, convertPurityWeight, convertWeight } from '../src/lib/calculator-conversions';
import { goldDisplay, goldCanonical } from '../src/lib/gold-display-unit';

test('18k market unit switch preserves money and round-trips both engine units', () => {
  assert.equal(goldDisplay(4.3318, 'گرم', 'mesghal').value, 1);
  assert.equal(goldDisplay(10_000_000, 'تومان / گرم', 'mesghal').value, 43_318_000);
  assert.equal(goldDisplay(1, 'مثقال', 'gram').value, 4.3318);
  const weight = goldDisplay(12.345, 'گرم', 'mesghal').value;
  const price = goldDisplay(10_000_000, 'تومان / گرم', 'mesghal').value;
  assert.ok(Math.abs(weight * price - 123_450_000) < .00001);
  for (const unit of ['گرم', 'مثقال', 'تومان / گرم', 'تومان / مثقال']) {
    for (const mode of ['gram', 'mesghal'] as const) assert.ok(Math.abs(goldCanonical(goldDisplay(123.456, unit, mode).value, unit, mode) - 123.456) < 1e-10);
  }
  assert.deepEqual(goldDisplay(-1_000_000, 'تومان', 'mesghal'), { value: -1_000_000, unit: 'تومان' });
  assert.deepEqual(goldDisplay(10, 'درصد', 'mesghal'), { value: 10, unit: 'درصد' });
});

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
