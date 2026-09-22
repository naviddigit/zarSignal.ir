import assert from 'node:assert/strict';
import test from 'node:test';
import { withDeadline } from '../src/lib/with-deadline';
import { defaultFarazConfig, mapQuotes, priceToFixed, validateFarazUrl } from '../src/server/ingestion/faraz';

test('database deadline releases rendering even when a query never resolves', async () => {
  await assert.rejects(withDeadline(new Promise<never>(() => {}), 20), /timed out/);
  assert.equal(await withDeadline(Promise.resolve(9), 100), 9);
  await assert.rejects(withDeadline(Promise.reject(new Error('database unavailable')), 100), /database unavailable/);
});

test('Faraz preserves ounce precision above 1000 and rejects invalid prices', () => {
  assert.equal(priceToFixed(4343.6), '4343.6');
  assert.equal(priceToFixed(66.022), '66.022');
  assert.equal(Number(priceToFixed(102750000)), 102750000);
  for (const price of [0, -1, Infinity, NaN]) assert.throws(() => priceToFixed(price));
});

test('Faraz maps all nine approved instruments and refuses partial/mismatched payloads', async () => {
  const config = await defaultFarazConfig();
  const fixture = Object.fromEntries(config.assets.map(asset => [asset.farazSymbol, { price: 1234.56 }]));
  const quotes = mapQuotes(fixture, config, new Date('2026-09-22T00:00:00Z'));
  assert.equal(quotes.length, 9);
  for (const symbol of ['GOLD_18K', 'SILVER_999', 'SEKE_CASH', 'ROB_SEKE']) {
    assert.ok(quotes.some(quote => quote.symbol === symbol));
  }
  assert.ok(quotes.every(quote => quote.sell === '1234.56'));
  delete fixture[config.assets[0].farazSymbol];
  assert.throws(() => mapQuotes(fixture, config, new Date()));
  assert.throws(() => mapQuotes({}, { ...config, assets: [{ ...config.assets[0], unit: 'wrong' }] }, new Date()));
});

test('Faraz requests cannot target arbitrary or insecure origins', () => {
  assert.equal(validateFarazUrl('https://faraz.io/watchlist-3'), 'https://faraz.io/');
  for (const url of ['http://faraz.io', 'https://faraz.io.evil.test', 'http://127.0.0.1', 'https://user:pass@faraz.io']) {
    assert.throws(() => validateFarazUrl(url));
  }
});
