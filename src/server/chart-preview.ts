import { createHmac, timingSafeEqual } from 'node:crypto';
export const previewCookie = 'zarsignal_chart_preview';
export const previewMaxAge = 2 * 60 * 60;
function secret() { const value = process.env.CHART_PREVIEW_SECRET; return value && value.length >= 32 ? value : null; }
function equal(a: string, b: string) { const x = Buffer.from(a), y = Buffer.from(b); return x.length === y.length && timingSafeEqual(x, y); }
export function validPreviewCode(code: string) { const key = secret(); return Boolean(key && equal(code, key)); }
export function createPreviewSession(now = Math.floor(Date.now() / 1000)) {
  const key = secret(); if (!key) return null;
  const body = `v1.${now + previewMaxAge}`;
  return `${body}.${createHmac('sha256', key).update(body).digest('base64url')}`;
}
export function validPreviewSession(value?: string, now = Math.floor(Date.now() / 1000)) {
  const key = secret(); if (!key || !value) return false;
  const parts = value.split('.');
  const [version, timestamp, signature] = parts;
  const expires = Number(timestamp);
  if (parts.length !== 3 || version !== 'v1' || !Number.isSafeInteger(expires) || expires <= now || expires > now + previewMaxAge) return false;
  return equal(signature ?? '', createHmac('sha256', key).update(`${version}.${timestamp}`).digest('base64url'));
}
