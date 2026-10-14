'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { fetchJson } from '@/lib/fetch-json';
import type { Snapshot } from '@/lib/market';

/** Refresh server-rendered prices and their calculations together, only in a visible tab. */
export function MarketRefresh({ seconds = 60, recoverEmpty = false }: { seconds?: number; recoverEmpty?: boolean }) {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => { if (!document.hidden) router.refresh(); };
    const timer = window.setInterval(refresh, Math.max(30, seconds) * 1000);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [router, seconds]);
  useEffect(() => {
    if (!recoverEmpty) return;
    const controller = new AbortController();
    let timer: ReturnType<typeof setTimeout>;
    let attempts = 0;
    const retry = async () => {
      attempts++;
      try {
        const next = await fetchJson<Snapshot>('/api/public/markets', controller.signal, 12000);
        if (!controller.signal.aborted && next.quotes.length) { router.refresh(); return; }
      } catch { /* Normal periodic refresh continues even if recovery is exhausted. */ }
      if (!controller.signal.aborted && attempts < 3) timer = setTimeout(retry, 4000);
    };
    timer = setTimeout(retry, 1500);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [router, recoverEmpty]);
  return null;
}
