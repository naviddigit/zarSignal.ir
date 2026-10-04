import assert from 'node:assert/strict';
import test from 'node:test';
import { decryptIntegrationSecret, encryptIntegrationSecret } from '../src/server/integration-secrets';

test('Google secret encryption uses a versioned AUTH_SECRET fallback without exposing plaintext', () => {
  const oldAuth = process.env.AUTH_SECRET;
  const oldIntegration = process.env.INTEGRATION_ENCRYPTION_KEY;
  try {
    process.env.AUTH_SECRET = 'test-auth-secret-of-at-least-thirty-two-characters';
    delete process.env.INTEGRATION_ENCRYPTION_KEY;
    const encrypted = encryptIntegrationSecret('google-client-secret-123456789');
    assert.match(encrypted, /^v1auth\./);
    assert.doesNotMatch(encrypted, /google-client-secret/);
    process.env.INTEGRATION_ENCRYPTION_KEY = 'a-separate-integration-key-with-32-chars';
    assert.equal(decryptIntegrationSecret(encrypted), 'google-client-secret-123456789');
    const separatelyEncrypted = encryptIntegrationSecret('another-google-client-secret');
    assert.match(separatelyEncrypted, /^v1\./);
    assert.equal(decryptIntegrationSecret(separatelyEncrypted), 'another-google-client-secret');
  } finally {
    if (oldAuth === undefined) delete process.env.AUTH_SECRET; else process.env.AUTH_SECRET = oldAuth;
    if (oldIntegration === undefined) delete process.env.INTEGRATION_ENCRYPTION_KEY; else process.env.INTEGRATION_ENCRYPTION_KEY = oldIntegration;
  }
});
