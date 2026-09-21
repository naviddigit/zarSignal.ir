import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Quote } from '@/lib/market';

type LocalSource = {
  key: string;
  name: string;
  url: string;
  enabled: boolean;
  pollSeconds: number;
  config: unknown;
};
type LocalRun = { status: string; count: number; startedAt: string; finishedAt: string | null; error: string | null };
export type LocalMarketState = { source?: LocalSource; quotes: Quote[]; lastRun: LocalRun | null };
const directory = path.join(process.cwd(), '.data');
const filename = path.join(directory, 'market.json');
const empty = (): LocalMarketState => ({ quotes: [], lastRun: null });

export async function readLocalMarket(): Promise<LocalMarketState> {
  try {
    return JSON.parse(await readFile(filename, 'utf8')) as LocalMarketState;
  } catch {
    return empty();
  }
}
async function writeLocalMarket(state: LocalMarketState) {
  await mkdir(directory, { recursive: true });
  const temporary = `${filename}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(state, null, 2), 'utf8');
  await rename(temporary, filename);
}
export async function saveLocalSource(source: LocalSource) {
  const state = await readLocalMarket();
  await writeLocalMarket({ ...state, source });
}
export async function saveLocalQuotes(quotes: Quote[]) {
  const state = await readLocalMarket();
  const startedAt = new Date().toISOString();
  await writeLocalMarket({
    ...state,
    quotes,
    lastRun: { status: 'SUCCEEDED', count: quotes.length, startedAt, finishedAt: startedAt, error: null },
  });
}
export async function saveLocalFailure(message: string) {
  const state = await readLocalMarket();
  const startedAt = new Date().toISOString();
  await writeLocalMarket({
    ...state,
    lastRun: { status: 'FAILED', count: 0, startedAt, finishedAt: startedAt, error: message },
  });
}
