import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';

function encryptionKey(version?: string) {
  if (version === 'v1auth') {
    const secret = process.env.AUTH_SECRET;
    if (!secret || secret.length < 32) throw new Error('AUTH_SECRET is not configured');
    return createHash('sha256').update('zarsignal:integration-secrets:v1:').update(secret).digest();
  }
  const raw = process.env.INTEGRATION_ENCRYPTION_KEY;
  if (!raw || raw.length < 32) throw new Error('INTEGRATION_ENCRYPTION_KEY is not configured');
  return createHash('sha256').update(raw).digest();
}

export function encryptIntegrationSecret(value: string) {
  const iv = randomBytes(12);
  const version = process.env.INTEGRATION_ENCRYPTION_KEY?.length && process.env.INTEGRATION_ENCRYPTION_KEY.length >= 32 ? 'v1' : 'v1auth';
  const cipher = createCipheriv('aes-256-gcm', encryptionKey(version), iv);
  const encrypted = Buffer.concat([cipher.update(value, 'utf8'), cipher.final()]);
  return [version, iv.toString('base64url'), cipher.getAuthTag().toString('base64url'), encrypted.toString('base64url')].join('.');
}

export function decryptIntegrationSecret(value: string) {
  const [version, iv, tag, encrypted, extra] = value.split('.');
  if (!['v1', 'v1auth'].includes(version) || !iv || !tag || !encrypted || extra) throw new Error('invalid_encrypted_secret');
  const decipher = createDecipheriv('aes-256-gcm', encryptionKey(version), Buffer.from(iv, 'base64url'));
  decipher.setAuthTag(Buffer.from(tag, 'base64url'));
  return Buffer.concat([decipher.update(Buffer.from(encrypted, 'base64url')), decipher.final()]).toString('utf8');
}
