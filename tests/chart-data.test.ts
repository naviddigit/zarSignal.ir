import test from 'node:test';
import assert from 'node:assert/strict';
import { chartDomain, chartPoints, enoughHistory } from '../src/lib/chart-data';

test('constant price is centered in a finite padded domain', () => {
  const domain = chartDomain([100, 100, 100]);
  assert.ok(domain.min < 100 && domain.max > 100);
  assert.equal((domain.min + domain.max) / 2, 100);
});
test('history sorts and deduplicates timestamps and rejects invalid observations', () => {
  const points = chartPoints([{ t: '2026-09-22T01:00:00Z', value: 2 }, { t: 'bad', value: 5 },
    { t: '2026-09-22T00:00:00Z', value: 1 }, { t: '2026-09-22T01:00:00Z', value: 3 }, { t: '2026-09-23', value: NaN }]);
  assert.deepEqual(points.map(p => p.value), [1, 3]);
  assert.equal(enoughHistory(points), false);
});
test('bubble history needs three distinct points and five minutes of coverage', () => {
  const points = [0, 60_000, 300_000].map(t => ({ t: new Date(t).toISOString(), value: 0 }));
  assert.equal(enoughHistory(points), true);
  assert.equal(enoughHistory(points.slice(0, 2)), false);
  assert.equal(enoughHistory(points.map((p, i) => ({ ...p, t: new Date(i * 1000).toISOString() }))), false);
});
