import 'server-only';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { db } from '@/lib/db';
import { initializeChartPlans } from '@/server/launch-plans';

const migration = '20260927120000_analysis_time_reliability';
const releaseKey = 'release-20260928-b1-install';
let pending: Promise<void> | undefined;

/** Owner-authorized release bootstrap, outside build; fixed SQL only, atomic and once per DB. */
export function prepareRelease() {
  if (!pending) pending = prepare().catch(error => { pending = undefined; throw error; });
  return pending;
}
async function prepare() {
  if (await db.integrationSetting.findUnique({where:{key:releaseKey}})) return;
  const sql = await readFile(path.join(process.cwd(),'prisma','migrations',migration,'migration.sql'),'utf8');
  await db.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(7382094)`;
    if (await tx.integrationSetting.findUnique({where:{key:releaseKey}})) return;
    const rows = await tx.$queryRaw<{finished_at: Date | null; rolled_back_at: Date | null}[]>`SELECT finished_at, rolled_back_at FROM "_prisma_migrations" WHERE migration_name = ${migration}`;
    if (rows.some(row => !row.finished_at && !row.rolled_back_at)) throw new Error('Migration requires operator review');
    if (!rows.some(row => row.finished_at && !row.rolled_back_at)) {
      for (const statement of sql.split(';').map(part=>part.trim()).filter(Boolean)) await tx.$executeRawUnsafe(statement);
      await tx.$executeRaw`INSERT INTO "_prisma_migrations" (id, checksum, finished_at, migration_name, started_at, applied_steps_count) VALUES (${randomUUID()}, ${createHash('sha256').update(sql).digest('hex')}, NOW(), ${migration}, NOW(), 1)`;
    }
    await initializeChartPlans(tx);
    await tx.integrationSetting.upsert({where:{key:'analysis-trial-hours'},update:{},create:{key:'analysis-trial-hours',category:'access',label:'دسترسی آزمایشی تحلیل',enabled:true,publicValue:'24'}});
    await tx.integrationSetting.create({data:{key:releaseKey,category:'system',label:'B1 schema and launch plans prepared',enabled:true,publicValue: new Date().toISOString()}});
  },{timeout:20000});
}
