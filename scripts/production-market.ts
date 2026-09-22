import { db } from '../src/lib/db';
import { defaultFarazConfig, FARAZ_KEY, FARAZ_URL, runFarazIngestion, syncFarazHistory } from '../src/server/ingestion/faraz';

async function main() {
  if (process.env.NODE_ENV !== 'production' || !process.env.DATABASE_URL) {
    throw new Error('Production environment and DATABASE_URL must be explicitly provided.');
  }
  if (process.argv.includes('--enable-faraz')) {
    const config = await defaultFarazConfig();
    await db.marketSource.upsert({
      where: { key: FARAZ_KEY },
      create: { key: FARAZ_KEY, name: 'فراز — دیده‌بان ۳', url: FARAZ_URL, enabled: true, pollSeconds: 60, config },
      update: { enabled: true, config, url: FARAZ_URL },
    });
  }
  console.info(JSON.stringify({ event: 'quotes_saved', ...await runFarazIngestion() }));
  if (process.argv.includes('--history')) {
    console.info(JSON.stringify({ event: 'history_saved', ...await syncFarazHistory() }));
  }
  if (process.argv.includes('--backfill-bubbles')) {
    const { backfillBubbleHistory } = await import('../src/server/backfill-bubbles');
    console.info(JSON.stringify({ event: 'bubble_backfill', ...await backfillBubbleHistory({ days: 90 }) }));
  }
}

main().catch(() => {
  console.error('Production ingestion failed. Check database migrations and source availability in the admin panel.');
  process.exitCode = 1;
}).finally(() => db.$disconnect());
