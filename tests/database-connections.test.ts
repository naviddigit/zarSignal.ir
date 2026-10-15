import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import { runtimeDatabaseUrl } from '../src/lib/database-url';
import { parseAccountPolicy } from '../src/lib/account-policy';

test('runtime Postgres uses one connection by default while preserving explicit pool configuration', () => {
  const url = new URL(runtimeDatabaseUrl('postgresql://user:secret@example.test/db?sslmode=require')!);
  assert.equal(url.searchParams.get('connection_limit'), '1');
  assert.equal(url.searchParams.get('pool_timeout'), '10');
  assert.equal(url.searchParams.get('sslmode'), 'require');
  assert.equal(url.password, 'secret');
  assert.equal(new URL(runtimeDatabaseUrl('postgres://u:p@example.test/db?connection_limit=2&pool_timeout=20')!).searchParams.get('connection_limit'), '2');
  assert.equal(runtimeDatabaseUrl('prisma+postgres://example.test/?api_key=test'), 'prisma+postgres://example.test/?api_key=test');
  assert.equal(runtimeDatabaseUrl(undefined), undefined);
});

test('concurrent profile-policy checks share the read, expire, and clear on admin changes', async () => {
  let reads = 0, clock = 0;
  const module = { exports: {} as typeof import('../src/server/account-policy') };
  const source = ts.transpileModule(readFileSync('src/server/account-policy.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  runInNewContext(source, { module, exports: module.exports, Date: { now: () => clock }, require: (name: string) => {
    if (name === '@/lib/account-policy') return { parseAccountPolicy };
    return { db: { integrationSetting: { findUnique: async () => { reads++; return { publicValue: JSON.stringify({ phoneRequired: true }) }; } } } };
  } });
  const results = await Promise.all(Array.from({ length: 10 }, () => module.exports.getAccountPolicy()));
  assert.equal(reads, 1); assert.equal(results.every(result => result.phoneRequired), true);
  module.exports.clearAccountPolicyCache(); await module.exports.getAccountPolicy(); assert.equal(reads, 2);
  clock = 5001; await module.exports.getAccountPolicy(); assert.equal(reads, 3);
});

test('account schema checks share one read and issue no DDL when already migrated', async () => {
  const module = { exports: {} as typeof import('../src/server/account-schema') };
  let reads = 0; const writes: string[] = [];
  let columns = ['firstName', 'lastName', 'city', 'occupation', 'customerType', 'ageGroup'];
  const context = { module, exports: module.exports, require: () => ({ db: {
    $queryRawUnsafe: async () => { reads++; return [{ columns, loginTable: 'LoginEvent', loginIndex: 'index', emailTable: 'EmailChallenge' }]; },
    $executeRawUnsafe: async (sql: string) => { writes.push(sql); },
  } }) };
  const compiled = ts.transpileModule(readFileSync('src/server/account-schema.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  runInNewContext(compiled, context);
  await Promise.all([module.exports.ensureAccountSchema(), module.exports.ensureAccountSchema()]);
  assert.equal(reads, 1); assert.deepEqual(writes, []);
  columns = columns.filter(column => column !== 'ageGroup');
  const second = { ...context, accountSchemaReady: undefined, module: { exports: {} as typeof module.exports }, exports: {} as typeof module.exports };
  second.exports = second.module.exports;
  runInNewContext(compiled, second);
  await second.module.exports.ensureAccountSchema();
  assert.equal(writes.length, 1); assert.match(writes[0], /ADD COLUMN IF NOT EXISTS "ageGroup"/);
});
