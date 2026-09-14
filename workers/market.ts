import { setTimeout as delay } from 'node:timers/promises';
import { db } from '../src/lib/db';
import { getHamrateSettings, MIN_POLL_SECONDS, runHamrateIngestion } from '../src/server/ingestion/hamrate';
let stopping = false;
const controller = new AbortController();
for (const signal of ['SIGINT','SIGTERM'] as const) process.on(signal, () => { stopping = true; controller.abort(); });
async function main() {
  let failures = 0;
  do {
    const source = await getHamrateSettings();
    if (!source.enabled) { console.info('HamRate crawler is disabled in Admin > Data.'); break; }
    const seconds = source.pollSeconds;
    if (!Number.isInteger(seconds) || seconds < MIN_POLL_SECONDS || seconds > 86400) throw new Error(`pollSeconds must be ${MIN_POLL_SECONDS}..86400`);
    try { const result = await runHamrateIngestion(source, controller.signal); failures = 0; console.info(JSON.stringify({event:'ingestion_complete',...result})); } catch(error) { failures++; console.error(JSON.stringify({event:'ingestion_failed',message:error instanceof Error ? error.message : 'Unknown failure'})); if (process.argv.includes('--once')) { process.exitCode = 1; break; } }
    if (process.argv.includes('--once') || stopping) break;
    const backoff = Math.min(seconds * 2 ** Math.min(failures, 5), 3600);
    await delay(backoff * 1000 + Math.floor(Math.random()*1000), undefined, {signal:controller.signal}).catch(() => {});
  } while(!stopping);
}
main().catch(error => { console.error(error instanceof Error ? error.message : 'Worker startup failed'); process.exitCode = 1; }).finally(() => db.$disconnect());
