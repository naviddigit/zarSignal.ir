import assert from 'node:assert/strict';
import test from 'node:test';
import { hashPassword, verifyPassword, validEmail, validPassword } from '../src/lib/password';

test('password hash verifies and rejects wrong password', () => {
  const stored = hashPassword('correct-horse-battery');
  assert.ok(stored.startsWith('scrypt$'));
  assert.equal(verifyPassword('correct-horse-battery', stored), true);
  assert.equal(verifyPassword('wrong-password', stored), false);
});

test('email and password validators', () => {
  assert.equal(validEmail('a@b.co'), true);
  assert.equal(validEmail('bad'), false);
  assert.equal(validPassword('12345678'), true);
  assert.equal(validPassword('short'), false);
});
