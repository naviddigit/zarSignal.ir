import { createHmac, timingSafeEqual } from 'node:crypto';

export function verificationHash(id: string, code: string, secret: string) {
  return createHmac('sha256', secret).update(`email-verification:${id}:${code}`).digest('hex');
}
export function verificationMatches(id: string, code: string, stored: string, secret: string) {
  if (!/^\d{6}$/.test(code) || !/^[a-f0-9]{64}$/.test(stored)) return false;
  return timingSafeEqual(Buffer.from(verificationHash(id, code, secret), 'hex'), Buffer.from(stored, 'hex'));
}
