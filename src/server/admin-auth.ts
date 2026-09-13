import { createHmac, timingSafeEqual } from 'node:crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

const cookieName = 'zarsignal_admin';
const maxAge = 60 * 60 * 8;

function config() {
  const token = process.env.ADMIN_BOOTSTRAP_TOKEN;
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!token || !secret || token.length < 24 || secret.length < 32) return null;
  if (process.env.NODE_ENV === 'production' && (token.startsWith('local-only-') || secret.startsWith('local-only-'))) return null;
  return { token, secret };
}

function sign(value: string, secret: string) {
  return createHmac('sha256', secret).update(value).digest('base64url');
}

function equal(a: string, b: string) {
  const left = Buffer.from(a); const right = Buffer.from(b);
  return left.length === right.length && timingSafeEqual(left, right);
}

export function sessionValue(now = Math.floor(Date.now() / 1000)) {
  const active = config();
  if (!active) return null;
  const expiresAt = now + maxAge;
  const payload = `v1.admin.${expiresAt}`;
  return `${payload}.${sign(payload, active.secret)}`;
}

export function validAdminToken(value: unknown) {
  const active = config();
  return typeof value === 'string' && !!active && equal(value, active.token);
}

export function isValidSession(value: string | undefined, now = Math.floor(Date.now() / 1000)) {
  const active = config();
  if (!active || !value) return false;
  const parts = value.split('.');
  if (parts.length !== 4 || parts[0] !== 'v1' || parts[1] !== 'admin') return false;
  const expiresAt = Number(parts[2]);
  if (!Number.isSafeInteger(expiresAt) || expiresAt < now || expiresAt > now + maxAge + 60) return false;
  return equal(parts[3], sign(parts.slice(0, 3).join('.'), active.secret));
}

export async function requireAdmin() {
  if (!isValidSession((await cookies()).get(cookieName)?.value)) redirect('/admin/login');
}

export const adminSession = { cookieName, maxAge };
