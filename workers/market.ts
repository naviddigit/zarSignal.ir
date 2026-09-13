import { readFile } from 'node:fs/promises';
import { setTimeout as delay } from 'node:timers/promises';
import { db } from '../src/lib/db';
import { parseSource, sourceConfigSchema } from '../src/server/ingestion/parser';
const sourceUrl = 'https://hamrate.com/';
let stopping = false;
const controller = new AbortController();
for (const signal of ['SIGINT','SIGTERM'] as const) process.on(signal, () => { stopping = true; controller.abort(); });
async function fetchHtml() {
  const response = await fetch(sourceUrl, { redirect:'error', signal:AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]), headers: { 'User-Agent':'ZarSignalMarketBot/0.1 (+https://zarsignal.ir/methodology)', 'Accept':'text/html' } });
  if (!response.ok) throw new Error(`Source HTTP ${response.status}; no bypass attempted`);
  if (!response.headers.get('content-type')?.includes('text/html')) throw new Error('Unexpected source content type');
  if (!response.body) throw new Error('Empty source response');
  const reader = response.body.getReader(); const chunks: Uint8Array[] = []; let size = 0;
  try { while (true) { const { done, value } = await reader.read(); if (done) break; size += value.length; if (size > 2_000_000) throw new Error('Source response too large'); chunks.push(value); } } finally { await reader.cancel(); }
  return Buffer.concat(chunks).toString('utf8');
}
async function ingest() {
  const input: unknown = JSON.parse(await readFile(process.env.MARKET_SOURCE_CONFIG ?? 'config/hamrate.json','utf8'));
  const config = sourceConfigSchema.parse(input);
  const run = await db.ingestionRun.create({ data:{ source:'hamrate', status:'RUNNING' } });
  try {
    const quotes = parseSource(await fetchHtml(), config);
    const result = await db.$transaction(async tx => {
      // Cross-process lock: only one writer per source, plus a deduplication constraint.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(7382091)`;
      const inserted = await tx.marketQuote.createMany({ data: quotes.map(q => ({ ...q, sourceUrl: sourceUrl, observedAt:new Date(q.observedAt), fetchedAt:new Date(q.fetchedAt) })), skipDuplicates:true });
      await tx.ingestionRun.update({ where:{id:run.id}, data:{status:'SUCCEEDED',count:inserted.count,finishedAt:new Date()} });
      return inserted;
    });
    console.info(JSON.stringify({ event:'ingestion_complete', count:result.count }));
  } catch (error) {
    const message = error instanceof Error ? error.message.slice(0,300) : 'Ingestion failed';
    await db.ingestionRun.update({ where:{id:run.id}, data:{status:'FAILED',error:message,finishedAt:new Date()} });
    throw error;
  }
}
async function main() {
  if (process.env.MARKET_SOURCE_ENABLED !== 'true') { console.info('Source disabled. Confirm collection/redistribution rights and configure verified selectors first.'); return; }
  const seconds = Number(process.env.MARKET_POLL_SECONDS ?? 300);
  if (!Number.isInteger(seconds) || seconds < 180 || seconds > 86400) throw new Error('MARKET_POLL_SECONDS must be 180..86400');
  let failures = 0;
  do {
    try { await ingest(); failures = 0; } catch(error) { failures++; console.error(JSON.stringify({event:'ingestion_failed',message:error instanceof Error ? error.message : 'Unknown failure'})); if (process.argv.includes('--once')) { process.exitCode = 1; break; } }
    if (process.argv.includes('--once') || stopping) break;
    const backoff = Math.min(seconds * 2 ** Math.min(failures, 5), 3600);
    await delay(backoff * 1000 + Math.floor(Math.random()*1000), undefined, {signal:controller.signal}).catch(() => {});
  } while(!stopping);
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Worker startup failed'); process.exitCode = 1; }).finally(() => db.$disconnect());
