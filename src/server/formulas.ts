import 'server-only';

import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { db } from '@/lib/db';
import { formulaKeys, formulaStatuses } from './formula-input';

export type FormulaKey = (typeof formulaKeys)[number];
export type FormulaStatus = (typeof formulaStatuses)[number];
export type ManagedFormula = {
  id: string;
  key: FormulaKey;
  marketSymbol: string;
  version: number;
  title: string;
  description: string;
  expression: string;
  inputs: string[];
  units: string[];
  constants: string[];
  rounding: string;
  edgeCases: string[];
  fixtures: string[];
  status: FormulaStatus;
  effectiveAt: Date | null;
  createdAt: Date;
};
type StoredFormula = Omit<ManagedFormula, 'effectiveAt' | 'createdAt'> & { effectiveAt: string | null; createdAt: string };
type FormulaWrite = Omit<ManagedFormula, 'id' | 'marketSymbol' | 'createdAt' | 'effectiveAt'> & { effectiveAt?: Date };

export const formulaCatalog = {
  GOLD_BUBBLE: { title: 'حباب طلا', marketSymbol: 'GOLD_MELTED' },
  SILVER_BUBBLE: { title: 'حباب نقره', marketSymbol: 'XAG_USD' },
  USD_BUBBLE: { title: 'حباب دلار', marketSymbol: 'USD' },
} satisfies Record<FormulaKey, { title: string; marketSymbol: string }>;

const filename = path.join(process.cwd(), '.data', 'formulas.json');
const useLocal = () => process.env.NODE_ENV !== 'production';
const list = (value: unknown) => Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
const hydrate = (row: StoredFormula): ManagedFormula => ({ ...row, effectiveAt: row.effectiveAt ? new Date(row.effectiveAt) : null, createdAt: new Date(row.createdAt) });

async function readLocal(): Promise<StoredFormula[]> { try { return JSON.parse(await readFile(filename, 'utf8')) as StoredFormula[]; } catch { return []; } }
async function writeLocal(rows: StoredFormula[]) {
  await mkdir(path.dirname(filename), { recursive: true });
  const temporary = `${filename}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(rows, null, 2), 'utf8');
  await rename(temporary, filename);
}

export async function getManagedFormulas(): Promise<{ storage: 'local' | 'postgresql'; formulas: ManagedFormula[] }> {
  if (useLocal()) return { storage: 'local', formulas: (await readLocal()).map(hydrate).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime()) };
  const rows = await db.formulaVersion.findMany({ orderBy: [{ key: 'asc' }, { version: 'desc' }] });
  return { storage: 'postgresql', formulas: rows.map(row => ({ ...row, key: row.key as FormulaKey, status: row.status as FormulaStatus, inputs: list(row.inputs), units: list(row.units), constants: list(row.constants), edgeCases: list(row.edgeCases), fixtures: list(row.fixtures) })) };
}

export async function getFormulaStatus() {
  let formulas: ManagedFormula[] = [];
  try { ({ formulas } = await getManagedFormulas()); } catch { /* Public pages fail closed when formula storage is unavailable. */ }
  return Object.fromEntries((Object.keys(formulaCatalog) as FormulaKey[]).map(key => {
    const versions = formulas.filter(item => item.key === key);
    return [key, { latest: versions[0] ?? null, approved: versions.find(item => item.status === 'APPROVED' && item.effectiveAt && item.effectiveAt.getTime() <= Date.now()) ?? null }];
  })) as Record<FormulaKey, { latest: ManagedFormula | null; approved: ManagedFormula | null }>;
}

export async function createManagedFormula(data: FormulaWrite) {
  const catalog = formulaCatalog[data.key];
  if (useLocal()) {
    const rows = await readLocal();
    if (rows.some(row => row.key === data.key && row.version === data.version)) throw new Error('duplicate_version');
    rows.push({ ...data, ...catalog, id: randomUUID(), effectiveAt: data.effectiveAt?.toISOString() ?? null, createdAt: new Date().toISOString() });
    return writeLocal(rows);
  }
  return db.formulaVersion.create({ data: { ...data, ...catalog } });
}
