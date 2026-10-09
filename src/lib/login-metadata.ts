import { isIP } from 'node:net';

export function loginMetadata(headers: Pick<Headers, 'get'>, trustedVercel = false) {
  if (!trustedVercel) return { ip: null, country: null, region: null, city: null, userAgent: headers.get('user-agent')?.slice(0, 300) ?? null };
  const rawIp = headers.get('x-vercel-forwarded-for')?.split(',')[0].trim() || headers.get('x-real-ip');
  const text = (key: string) => {
    const raw = headers.get(key);
    if (!raw) return null;
    try { return decodeURIComponent(raw).slice(0, 100); } catch { return null; }
  };
  return {
    ip: rawIp && isIP(rawIp) ? rawIp : null,
    country: text('x-vercel-ip-country'), region: text('x-vercel-ip-country-region'), city: text('x-vercel-ip-city'),
    userAgent: headers.get('user-agent')?.slice(0, 300) ?? null,
  };
}
