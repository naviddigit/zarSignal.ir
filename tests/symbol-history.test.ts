import assert from 'node:assert/strict';
import test, { type TestContext } from 'node:test';
import { db } from '../src/lib/db';
import { GET } from '../src/app/api/public/markets/[symbol]/history/route';

function stubHistory(t: TestContext, fail = false) {
  const original = db.symbolHistoryBar.findMany;
  const query = t.mock.fn(async (_args: unknown) => {
    if (fail) throw new Error('private database detail');
    return [];
  });
  db.symbolHistoryBar.findMany = query as typeof original;
  t.after(() => { db.symbolHistoryBar.findMany = original; });
  return query;
}

test('history reads the route symbol without requiring a duplicate query parameter', async t => {
  const query = stubHistory(t);
  const response = await GET(new Request('https://zarsignal.ir/api/public/markets/gold_melted/history?days=1'), {
    params: Promise.resolve({ symbol: 'gold_melted' }),
  });
  assert.equal(response.status, 200);
  assert.equal((await response.json()).symbol, 'GOLD_MELTED');
  assert.equal((query.mock.calls[0].arguments[0] as { where: { symbol: string } }).where.symbol, 'GOLD_MELTED');
});

test('unknown symbols never query the database', async t => {
  const query = stubHistory(t);
  const response = await GET(new Request('https://zarsignal.ir/api/public/markets/unknown/history'), {
    params: Promise.resolve({ symbol: 'unknown' }),
  });
  assert.equal(response.status, 404);
  assert.equal(query.mock.callCount(), 0);
});

test('missing history storage returns an empty chart payload instead of breaking the page', async t => {
  stubHistory(t, true);
  const response = await GET(new Request('https://zarsignal.ir/api/public/markets/gold_melted/history'), {
    params: Promise.resolve({ symbol: 'gold_melted' }),
  });
  assert.equal(response.status, 200);
  const body = await response.json() as { bars: unknown[]; error?: string };
  assert.deepEqual(body.bars, []);
  assert.equal(body.error, 'history_unavailable');
});
