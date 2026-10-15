import test from 'node:test';
import assert from 'node:assert/strict';
import { parseAccountPolicy, missingProfileFields, profileRequired, fieldRequired, registrationProfile, normalizePhone, profileDemographics } from '../src/lib/account-policy';
import { verificationHash, verificationMatches } from '../src/lib/email-verification';
import { loginMetadata } from '../src/lib/login-metadata';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import ts from 'typescript';
import * as verification from '../src/lib/email-verification';
import { isMaintenanceBypass } from '../src/lib/maintenance';

test('account requirements default off and accept only known fields', () => {
  assert.equal(parseAccountPolicy(null).profileRequired, false);
  const policy = parseAccountPolicy({ profileRequired: true, requiredFields: ['city', 'phone', 'city', 'unknown', '__proto__'] });
  assert.deepEqual(policy.requiredFields, ['city', 'phone']);
  assert.deepEqual(missingProfileFields({ city: 'بازار تهران', phone: '' }, policy), ['phone']);
  assert.deepEqual(missingProfileFields({ name: 'سارا محمدی', phone: '+989121234567' }, parseAccountPolicy(null)), []);
});

test('profile area and age accept only explicit choices and never infer age from occupation', () => {
  const policy = parseAccountPolicy({ profileRequired: true, requiredFields: ['city', 'ageGroup', 'occupation'] });
  assert.deepEqual(policy.requiredFields, ['city', 'ageGroup']);
  assert.deepEqual(missingProfileFields({ city: 'تهران' }, policy), ['city', 'ageGroup']);
  assert.deepEqual(missingProfileFields({ city: 'شهرستان', ageGroup: 'زیر ۱۸ سال' }, policy), []);
  assert.deepEqual(profileDemographics({ city: ' خارج از کشور ', ageGroup: '۱۸ سال و بالاتر' }), { city: 'خارج از کشور', ageGroup: '۱۸ سال و بالاتر' });
  assert.deepEqual(profileDemographics({ city: '', ageGroup: '' }), { city: null, ageGroup: null });
  assert.throws(() => profileDemographics({ city: 'arbitrary', ageGroup: 'زیر ۱۸ سال' }), /محدوده/);
  assert.throws(() => profileDemographics({ city: 'بازار تهران', ageGroup: 'معامله‌گر' }), /سنی/);
});

test('profile completion persists area and age separately and enforces required age on the server', async () => {
  const module = { exports: {} as typeof import('../src/app/account/complete/actions') };
  let saved: any = null;
  let saveError: unknown = null;
  const policy = parseAccountPolicy({ profileRequired: true, requiredFields: ['city', 'ageGroup'] });
  const source = readFileSync(new URL('../src/app/account/complete/actions.ts', import.meta.url), 'utf8');
  runInNewContext(ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    module, exports: module.exports, Error, require: (name: string) => {
      if (name === 'next/navigation') return { redirect: (url: string) => { throw new Error(`redirect:${url}`); } };
      if (name === 'next/dist/client/components/redirect-error') return { isRedirectError: (error: Error) => error.message.startsWith('redirect:') };
      if (name === 'next/headers') return { cookies: async () => ({ delete: () => {} }) };
      if (name === 'next/cache') return { revalidatePath: () => {} };
      if (name === '@/auth') return { auth: async () => ({ user: { id: 'user-one' } }) };
      if (name === '@/server/account-policy') return { getAccountPolicy: async () => policy };
      if (name === '@/server/account-schema') return { ensureAccountSchema: async () => {} };
      if (name === '@/lib/account-policy') return { missingProfileFields, profileRequired, registrationProfile, profileDemographics, profileFields: { ageGroup: 'سن' } };
      if (name === '@/lib/db') return { db: { user: { update: async ({ data }: any) => { if (saveError) throw saveError; saved = data; } } } };
      return {};
    },
  });
  const form = new FormData(); form.set('city', 'بازار تهران');
  await assert.rejects(() => module.exports.completeProfileAction(form), /سن/);
  assert.equal(saved, null);
  form.set('ageGroup', 'زیر ۱۸ سال'); form.set('occupation', 'legacy');
  await assert.rejects(() => module.exports.completeProfileAction(form), /redirect:\/account/);
  assert.equal((saved as any)?.city, 'بازار تهران');
  assert.equal((saved as any)?.ageGroup, 'زیر ۱۸ سال');
  assert.equal(Object.hasOwn(saved as unknown as object, 'occupation'), false);
  saveError = { code: 'P2002', meta: { target: ['phone'] } };
  await assert.rejects(() => module.exports.completeProfileAction(form), /شماره قبلاً/);
  saveError = new Error('database connection failed while updating phone');
  await assert.rejects(() => module.exports.completeProfileAction(form), /ذخیره اطلاعات ممکن نشد/);
  form.set('phone', '1234');
  await assert.rejects(() => module.exports.completeProfileAction(form), /موبایل معتبر/);
  assert.match((await module.exports.submitProfileAction(form)).error, /موبایل معتبر/);
  form.set('phone', '09121234567'); saveError = null;
  await assert.rejects(() => module.exports.submitProfileAction(form), /redirect:\/account/);
});

test('mobile and user type are independently required without granting an access role', () => {
  const policy = parseAccountPolicy({ phoneRequired: true, customerTypeRequired: true, customerTypes: [' خانگی ', 'حرفه‌ای', 'خانگی', null, 'صراف'] });
  assert.deepEqual(policy.customerTypes, ['خانگی', 'حرفه‌ای', 'صراف']);
  assert.equal(profileRequired(policy), true);
  assert.equal(fieldRequired(policy, 'firstName'), false);
  assert.deepEqual(missingProfileFields({ name: 'سارا محمدی' }, policy), ['phone', 'customerType']);
  assert.throws(() => registrationProfile({ phone: '', customerType: 'خانگی' }, policy), /موبایل/);
  assert.throws(() => registrationProfile({ phone: '09121234567', customerType: 'ADMIN' }, policy), /نوع کاربر/);
  assert.throws(() => registrationProfile({ phone: 'abc09121234567', customerType: 'خانگی' }, policy), /موبایل/);
  assert.deepEqual(registrationProfile({ phone: '۰۹۱۲۱۲۳۴۵۶۷', customerType: 'حرفه‌ای' }, policy), { phone: '+989121234567', customerType: 'حرفه‌ای' });
  assert.equal(normalizePhone('+98 912 123 4567'), '+989121234567');
  assert.deepEqual(missingProfileFields({ phone: '+989121234567', customerType: 'گزینه حذف‌شده' }, policy), ['customerType']);
  assert.deepEqual(registrationProfile({ phone: '', customerType: '' }, parseAccountPolicy(null)), { phone: null, customerType: null });
});

test('signup rejects missing required type before account creation and persists a valid choice', async () => {
  const module = { exports: {} as typeof import('../src/app/login/actions') };
  let created: any = null;
  const policy = parseAccountPolicy({ customerTypeRequired: true });
  const source = readFileSync(new URL('../src/app/login/actions.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  runInNewContext(compiled, { module, exports: module.exports, require: (name: string) => {
    if (name === 'next/navigation') return { redirect: (url: string) => { throw new Error(url); } };
    if (name === '@/lib/account-policy') return { registrationProfile };
    if (name === '@/server/account-policy') return { getAccountPolicy: async () => policy };
    if (name === '@/server/account-schema') return { ensureAccountSchema: async () => {} };
    if (name === '@/server/ensure-schema') return { ensureHistorySchema: async () => {} };
    if (name === '@/lib/password') return { validEmail: () => true, validPassword: () => true, hashPassword: () => 'hash' };
    if (name === '@/lib/db') return { db: { user: { findUnique: async () => null, create: async ({ data }: any) => { created = data; return { id: 'test', ...data }; } } } };
    if (name === '@/auth') return { signIn: async () => {} };
    if (name === 'next-auth') return { AuthError: class extends Error {} };
    return {};
  } });
  const form = new FormData(); form.set('email', 'test@example.com'); form.set('password', 'password-long');
  await assert.rejects(() => module.exports.registerWithEmail(form), /error=profile/);
  assert.equal(created, null);
  form.set('customerType', 'حرفه‌ای'); form.set('role', 'ADMIN');
  await module.exports.registerWithEmail(form);
  assert.equal((created as any)?.customerType, 'حرفه‌ای');
  assert.equal((created as any)?.role, undefined);
});
test('verification hashes bind to challenge, code and secret', () => {
  const stored = verificationHash('ticket-one', '123456', 'test-secret');
  assert.equal(verificationMatches('ticket-one', '123456', stored, 'test-secret'), true);
  assert.equal(verificationMatches('ticket-two', '123456', stored, 'test-secret'), false);
  assert.equal(verificationMatches('ticket-one', '654321', stored, 'test-secret'), false);
  assert.equal(verificationMatches('ticket-one', '123456', stored, 'other-secret'), false);
  assert.equal(verificationMatches('ticket-one', 'abc123', stored, 'test-secret'), false);
});
test('login location uses trusted hosting headers and keeps unknowns honest', () => {
  const h = new Headers({ 'x-vercel-forwarded-for': '192.0.2.1', 'x-vercel-ip-country': 'IR', 'x-vercel-ip-city': '%D8%AA%D9%87%D8%B1%D8%A7%D9%86', 'cf-connecting-ip': '203.0.113.1' });
  assert.equal(loginMetadata(h).ip, null);
  assert.equal(loginMetadata(h, true).ip, '192.0.2.1');
  assert.equal(loginMetadata(h, true).city, 'تهران');
  h.set('x-vercel-forwarded-for', 'invalid');
  assert.equal(loginMetadata(h, true).ip, null);
  h.set('x-vercel-ip-city', '%broken');
  assert.equal(loginMetadata(h, true).city, null);
});

test('email verification consumes once, expires and limits wrong attempts', async () => {
  const module = { exports: {} as typeof import('../src/server/email-verification') };
  let row: { id: string; userId: string; attempts: number; tokenHash: string; expiresAt: Date } | null = null;
  let verified = 0;
  const tx = {
    emailChallenge: {
      updateMany: async ({ where }: { where: { id: string; expiresAt: { gt: Date } } }) => {
        if (!row || row.id !== where.id || row.expiresAt <= where.expiresAt.gt || row.attempts >= 5) return { count: 0 };
        row.attempts++; return { count: 1 };
      },
      findUnique: async () => row,
      deleteMany: async () => { const count = row ? 1 : 0; row = null; return { count }; },
    },
    user: { update: async () => { verified++; return { id: 'user-one' }; } },
  };
  const source = readFileSync(new URL('../src/server/email-verification.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  runInNewContext(compiled, { module, exports: module.exports, Date, process: { env: { AUTH_SECRET: 'test-secret' } }, require: (name: string) => {
    if (name === '@/lib/db') return { db: { $transaction: async (fn: (value: typeof tx) => unknown) => fn(tx) } };
    if (name === '@/lib/email-verification') return verification;
    return {};
  } });
  const fresh = () => ({ id: 'ticket', userId: 'user-one', attempts: 0, tokenHash: verificationHash('ticket', '123456', 'test-secret'), expiresAt: new Date(Date.now() + 600_000) });
  row = fresh();
  assert.ok(await module.exports.consumeEmailChallenge('ticket', '123456'));
  assert.equal(await module.exports.consumeEmailChallenge('ticket', '123456'), null);
  assert.equal(verified, 1);
  row = fresh();
  for (let i = 0; i < 5; i++) assert.equal(await module.exports.consumeEmailChallenge('ticket', '654321'), null);
  assert.equal(await module.exports.consumeEmailChallenge('ticket', '123456'), null);
  row = { ...fresh(), expiresAt: new Date(0) };
  assert.equal(await module.exports.consumeEmailChallenge('ticket', '123456'), null);
  assert.equal(verified, 1);
});

test('credentials require verified email only when policy is enabled', async () => {
  let factory: () => Promise<any>;
  let required = true;
  let emailVerified: Date | null = null;
  const module = { exports: {} };
  const source = readFileSync(new URL('../src/auth.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true } }).outputText;
  runInNewContext(compiled, { module, exports: module.exports, process: { env: {} }, require: (name: string) => {
    if (name === 'next-auth') return (fn: typeof factory) => { factory = fn; return {}; };
    if (name === 'react') return { cache: (fn: unknown) => fn };
    if (name === 'next-auth/providers/credentials') return (config: unknown) => config;
    if (name === '@auth/prisma-adapter') return { PrismaAdapter: () => ({}) };
    if (name === '@/lib/password') return { validEmail: () => true, validPassword: () => true, verifyPassword: (password: string) => password === 'correct-password' };
    if (name === '@/server/account-policy') return { getAccountPolicy: async () => ({ emailVerificationRequired: required }) };
    if (name === '@/server/email-verification') return { consumeVerificationCode: async () => null };
    if (name === '@/lib/db') return { db: { integrationSetting: { findUnique: async () => null }, user: { findUnique: async () => ({ id: 'test-user', passwordHash: 'hash', emailVerified }) } } };
    return {};
  } });
  const config = await factory!();
  const authorize = config.providers[0].authorize;
  assert.equal(await authorize({ email: 'test@example.com', password: 'correct-password' }), null);
  emailVerified = new Date();
  assert.equal((await authorize({ email: 'test@example.com', password: 'correct-password' })).id, 'test-user');
  assert.equal(await authorize({ email: 'test@example.com', password: 'wrong-password' }), null);
  emailVerified = null; required = false;
  assert.equal((await authorize({ email: 'test@example.com', password: 'correct-password' })).id, 'test-user');
  assert.equal(await authorize({ code: '123456' }), null);
});

test('mandatory profile blocks pages and APIs, including chunked sessions, but keeps completion reachable', async () => {
  const module = { exports: {} as typeof import('../src/proxy') };
  let required = true;
  let role = 'USER';
  let phoneRequired = false;
  let customerTypeRequired = false;
  const source = readFileSync(new URL('../src/proxy.ts', import.meta.url), 'utf8');
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
  runInNewContext(compiled, { module, exports: module.exports, URL, require: (name: string) => {
    if (name === 'next/server') return { NextResponse: { next: () => ({ kind: 'next', headers: new Headers() }), redirect: (url: URL) => ({ kind: 'redirect', url: url.toString() }), json: (body: unknown, options: unknown) => ({ kind: 'json', body, ...options as object }) } };
    if (name === '@/server/maintenance') return { getMaintenanceSettings: async () => ({ enabled: false }) };
    if (name === '@/lib/maintenance') return { isMaintenanceBypass };
    if (name === '@/server/account-policy') return { getAccountPolicy: async () => ({ profileRequired: required, requiredFields: ['phone'], phoneRequired, customerTypeRequired, customerTypes: ['خانگی', 'حرفه‌ای'] }) };
    if (name === '@/lib/account-policy') return { missingProfileFields, profileRequired };
    if (name === '@/auth') return { auth: async () => ({ user: { id: 'user-one' } }) };
    if (name === '@/server/account-schema') return { ensureAccountSchema: async () => {} };
    if (name === '@/lib/db') return { db: { user: { findUnique: async () => ({ role, phone: null }) } } };
    return {};
  } });
  const request = (path: string, cookie = '__Secure-authjs.session-token.0') => ({ url: `https://www.zarsignal.ir${path}`, nextUrl: new URL(`https://www.zarsignal.ir${path}`), method: 'GET', headers: new Headers(), cookies: { getAll: () => [{ name: cookie }] } });
  const proxy = module.exports.proxy as (request: any) => Promise<any>;
  assert.equal((await proxy(request('/calculator'))).kind, 'redirect');
  assert.equal((await proxy(request('/calculator', 'authjs.session-token'))).kind, 'redirect');
  assert.equal((await proxy(request('/api/public/markets/gold/history'))).status, 403);
  assert.equal((await proxy(request('/account/complete'))).kind, 'next');
  assert.equal((await proxy(request('/admin/customers'))).kind, 'next');
  role = 'ADMIN';
  assert.equal((await proxy(request('/calculator'))).kind, 'next');
  role = 'USER'; required = false;
  assert.equal((await proxy(request('/calculator'))).kind, 'next');
  phoneRequired = true;
  assert.equal((await proxy(request('/calculator'))).kind, 'redirect');
  assert.equal((await proxy(request('/api/public/markets'))).status, 403);
  phoneRequired = false; customerTypeRequired = true;
  assert.equal((await proxy(request('/calculator'))).kind, 'redirect');
  assert.equal((await proxy(request('/account/complete'))).kind, 'next');
});
