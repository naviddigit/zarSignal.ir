import test from 'node:test';
import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import { createPreviewSession, validPreviewCode, validPreviewSession, previewMaxAge } from '../src/server/chart-preview';
import { fetchJson } from '../src/lib/fetch-json';

test('owner preview is signed, time-limited, revocable and requires the exact code', t => {
  const old = process.env.CHART_PREVIEW_SECRET;
  t.after(() => { if (old === undefined) delete process.env.CHART_PREVIEW_SECRET; else process.env.CHART_PREVIEW_SECRET = old; });
  process.env.CHART_PREVIEW_SECRET = randomBytes(32).toString('hex');
  assert.equal(validPreviewCode(process.env.CHART_PREVIEW_SECRET), true);
  assert.equal(validPreviewCode('wrong'), false);
  const session = createPreviewSession(1000)!;
  assert.equal(validPreviewSession(session, 1001), true);
  assert.equal(validPreviewSession(session + 'x', 1001), false);
  assert.equal(validPreviewSession(session + '.', 1001), false);
  assert.equal(validPreviewSession(session, 1000 + previewMaxAge), false);
  process.env.CHART_PREVIEW_SECRET = randomBytes(32).toString('hex');
  assert.equal(validPreviewSession(session, 1001), false);
});

test('compatible JSON fetch aborts slow requests and propagates server paywall', async t => {
  const original = globalThis.fetch;
  t.after(() => { globalThis.fetch = original; });
  globalThis.fetch = (async () => new Response('{}', { status: 403 })) as typeof fetch;
  await assert.rejects(fetchJson('/test', new AbortController().signal), /http_403/);
  globalThis.fetch = ((_url, options) => new Promise((_resolve, reject) => {
    options?.signal?.addEventListener('abort', () => reject(new Error('aborted')));
  })) as typeof fetch;
  await assert.rejects(fetchJson('/test', new AbortController().signal, 10), /aborted/);
});
