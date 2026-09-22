import { test } from 'node:test';
import assert from 'node:assert/strict';
import { newApiKey, readBearer, hashApiKey } from '../src/server/api-access';
import { isValidSession, sessionValue } from '../src/server/admin-auth';
import { decryptIntegrationSecret, encryptIntegrationSecret } from '../src/server/integration-secrets';
test('generates high entropy secrets and stores only one-way hashes', () => { const a = newApiKey(), b = newApiKey(); assert.notEqual(a.secret,b.secret); assert.equal(a.keyHash,hashApiKey(a.secret)); assert.notEqual(a.keyHash,a.secret); assert.equal(readBearer(`Bearer ${a.secret}`),a.secret); });
test('rejects missing and malformed credentials before database access', () => { for (const input of [null,'','Bearer test','Basic xxx',`Bearer zs_${'a'.repeat(65)}`]) assert.throws(() => readBearer(input)); });
test('admin sessions are signed, expiry-bound and reject altered values', () => { const now = 1_800_000_000; const session = sessionValue(now); assert.ok(session); assert.equal(isValidSession(session,now),true); assert.equal(isValidSession(`${session}x`,now),false); assert.equal(isValidSession(session,now + 60 * 60 * 9),false); });
test('integration secrets use authenticated encryption and reject tampering', t => {
  const previous = process.env.INTEGRATION_ENCRYPTION_KEY;
  process.env.INTEGRATION_ENCRYPTION_KEY = 'test-only-integration-key-at-least-32-characters';
  t.after(() => { if (previous === undefined) delete process.env.INTEGRATION_ENCRYPTION_KEY; else process.env.INTEGRATION_ENCRYPTION_KEY = previous; });
  const encrypted = encryptIntegrationSecret('google-secret');
  assert.equal(decryptIntegrationSecret(encrypted), 'google-secret');
  assert.throws(() => decryptIntegrationSecret(`${encrypted}x`));
});
