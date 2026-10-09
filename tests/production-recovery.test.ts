import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { createRequire } from 'node:module';
import { renderToStaticMarkup } from 'react-dom/server';
import { withDeadline } from '../src/lib/with-deadline';
import { defaultFarazConfig, mapQuotes, priceToFixed, validateFarazUrl } from '../src/server/ingestion/faraz';

test('production plans never replace failed database reads with sample prices', async () => {
  const module = { exports: {} as typeof import('../src/server/plans') };
  const source = readFileSync(new URL('../src/server/plans.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  const nativeRequire = createRequire(import.meta.url);
  let fail = false;
  runInNewContext(compiled, { module, exports: module.exports, process: { env: { NODE_ENV: 'production' }, cwd: () => '.' }, require: (name: string) => {
    if (name === 'server-only') return {};
    if (name === '@/server/prepare-release') return { prepareRelease: async () => {} };
    if (name === '@/lib/db') return { db: { plan: { findMany: async () => {
      if (fail) throw new Error('database unavailable');
      return [{ id: 'real-home', features: [], pricingVersions: [{ price: 249000, effectiveAt: new Date(0), active: true }], active: true, webAvailable: true }];
    } } } };
    return nativeRequire(name);
  } });
  assert.equal((await module.exports.getPublishedPlans())[0].pricingVersions[0].price, '249000');
  fail = true;
  await assert.rejects(module.exports.getManagedPlans(), /database unavailable/);
  await assert.rejects(module.exports.getPublishedPlans(), /database unavailable/);
});

test('Google configuration retries transient storage errors without enabling an unconfigured provider', async () => {
  for (const failure of ['once', 'always'] as const) {
    const module = { exports: {} as typeof import('../src/auth') };
    let reads = 0;
    const dependencies: Record<string, unknown> = {
      'next-auth': () => ({}), 'react': { cache: (fn: unknown) => fn },
      'next-auth/providers/google': () => ({}), 'next-auth/providers/credentials': () => ({}),
      '@auth/prisma-adapter': { PrismaAdapter: () => ({}) },
      '@/lib/password': {}, '@/server/integration-secrets': { decryptIntegrationSecret: () => 'x'.repeat(30) },
      '@/lib/db': { db: { integrationSetting: { findUnique: async () => {
        reads++;
        if (reads === 1 || failure === 'always') throw new Error('transient connection failure');
        return { enabled: true, publicValue: 'test.apps.googleusercontent.com', valueEncrypted: 'encrypted' };
      } } } },
    };
    const source = readFileSync(new URL('../src/auth.ts', import.meta.url), 'utf8');
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
    runInNewContext(compiled, { module, exports: module.exports, process: { env: {} }, require: (name: string) => {
      assert.ok(name in dependencies, `unexpected dependency: ${name}`);
      return dependencies[name];
    } });
    assert.equal((await module.exports.getAuthCapabilities()).google, failure === 'once');
    assert.equal(reads, 2);
  }
});

test('pricing page never displays hardcoded paid prices or checkout links during an outage', async () => {
  const module = { exports: {} as typeof import('../src/app/pricing/page') };
  const source = readFileSync(new URL('../src/app/pricing/page.tsx', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const nativeRequire = createRequire(import.meta.url);
  runInNewContext(compiled, { module, exports: module.exports, require: (name: string) => {
    if (name === '@/server/plans') return { getPublishedPlans: async () => { throw new Error('database unavailable'); } };
    if (name === '@/server/analysis-trial') return { trialPolicy: async () => ({ enabled: false }) };
    if (name === '@/lib/history-access') return { planHistoryDays: () => 0 };
    if (name === '@/components/funnel-track') return { FunnelTrack: () => null };
    if (name === 'next/link') return 'a';
    return nativeRequire(name);
  } });
  const html = renderToStaticMarkup(await module.exports.default());
  assert.ok(html.includes('قیمت موقتاً در دسترس نیست'));
  assert.equal(html.includes('href="/subscribe/'), false);
  for (const amount of [149000, 299000, 249000, 799000, 1490000]) {
    assert.equal(html.includes(new Intl.NumberFormat('fa-IR').format(amount)), false);
  }
});

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
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
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
