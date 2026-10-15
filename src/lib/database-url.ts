/** Serverless instances must not each open Prisma's CPU-sized default pool. */
export function runtimeDatabaseUrl(raw: string | undefined) {
  if (!raw) return undefined;
  let url: URL;
  try { url = new URL(raw); } catch { return raw; }
  if (url.protocol !== 'postgres:' && url.protocol !== 'postgresql:') return raw;
  if (!url.searchParams.has('connection_limit')) url.searchParams.set('connection_limit', '1');
  if (!url.searchParams.has('pool_timeout')) url.searchParams.set('pool_timeout', '10');
  return url.toString();
}
