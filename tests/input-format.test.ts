import test from 'node:test';
import assert from 'node:assert/strict';
import { formatNumericInput, numericValue, sanitizeNumericInput } from '../src/lib/numeric-input';
import { formatRelativeTime } from '../src/lib/time';

test('numeric input accepts Persian digits and preserves one decimal separator', () => {
  assert.equal(sanitizeNumericInput('۱۲٫۳۴x.۵', 3), '12.345');
  assert.equal(sanitizeNumericInput('۰۰۱۰.۵', 4), '10.5');
});

test('money input removes non-numeric characters and groups thousands', () => {
  const clean = sanitizeNumericInput('تومان ۸,۵۰۰,۰۰۰', 0);
  assert.equal(clean, '8500000');
  assert.equal(formatNumericInput(clean), '8,500,000');
  assert.equal(numericValue(clean), 8_500_000);
});

test('relative time reports live seconds and minutes', () => {
  const now = Date.parse('2026-09-14T12:00:30Z');
  assert.equal(formatRelativeTime('2026-09-14T12:00:20Z', now), '۱۰ ثانیه پیش');
  assert.equal(formatRelativeTime('2026-09-14T11:58:30Z', now), '۲ دقیقه پیش');
});
