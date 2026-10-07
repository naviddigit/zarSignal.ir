import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { withDeadline } from '../src/lib/with-deadline';
import { defaultFarazConfig, mapQuotes, priceToFixed, validateFarazUrl } from '../src/server/ingestion/faraz';

test('public rendering returns stored stale prices before recovery; explicit fresh waits for new prices', async () => {
  const callbacks: (() => Promise<void>)[] = [];
  let refreshes = 0;
  let release!: () => void;
  let observedAt = new Date('2000-01-01');
  const recovery = new Promise<void>(resolve => { release = () => { observedAt = new Date(); resolve(); }; });
  const module = { exports: {} as typeof import('../src/server/quotes') };
  const dependencies: Record<string, unknown> = {
    'next/cache': { unstable_cache: (read: unknown) => read },
    'next/server': { after: (callback: () => Promise<void>) => callbacks.push(callback) },
    '@/lib/db': { db: {
      $queryRaw: async () => [{ symbol: 'GOLD_MELTED', buy: 100, sell: 101, currency: 'TMN', unit: 'mithqal', source: 'provider', sourceUrl: null, observedAt, fetchedAt: observedAt }],
      marketSource: { findMany: async () => [] },
    } },
    '@/lib/with-deadline': { withDeadline },
    '@/server/ingestion/faraz-meta': { FARAZ_KEY: 'faraz' },
    '@/lib/market': { instruments: [{ symbol: 'GOLD_MELTED' }], formulaCriticalSymbols: ['GOLD_MELTED'], isStale: (quote: { observedAt: string }) => new Date(quote.observedAt).getFullYear() === 2000 },
    '@/server/refresh-market': { refreshProductionMarket: async () => { refreshes++; await recovery; return { ok: true }; } },
    '@prisma/client': { Prisma: { sql: () => '', join: () => '' } },
  };
  const source = readFileSync(new URL('../src/server/quotes.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  runInNewContext(compiled, { module, exports: module.exports, require: (name: string) => {
    assert.ok(name in dependencies, `unexpected dependency: ${name}`);
    return dependencies[name];
  }, process: { env: { NODE_ENV: 'production', MARKET_MODE: 'live' } } });
  const stored = await module.exports.getPublicSnapshot();
  assert.equal(stored.status, 'stale');
  assert.equal(stored.quotes[0].observedAt, '2000-01-01T00:00:00.000Z');
  assert.equal(stored.quotes[0].source, 'زرسیگنال');
  assert.equal(refreshes, 0);
  assert.equal(callbacks.length, 1);
  const background = callbacks[0]();
  let freshFinished = false;
  const fresh = module.exports.getPublicSnapshot(true).then(snapshot => { freshFinished = true; return snapshot; });
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(freshFinished, false);
  release();
  await background;
  assert.equal((await fresh).status, 'ok');
  assert.equal(callbacks.length, 1);
});

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
