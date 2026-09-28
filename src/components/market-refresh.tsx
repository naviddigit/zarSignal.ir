'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Refresh server-rendered prices and their calculations together, only in a visible tab. */
export function MarketRefresh({ seconds = 60 }: { seconds?: number }) {
  const router = useRouter();
  useEffect(() => {
    const refresh = () => { if (!document.hidden) router.refresh(); };
    const timer = window.setInterval(refresh, Math.max(30, seconds) * 1000);
    document.addEventListener('visibilitychange', refresh);
    return () => { window.clearInterval(timer); document.removeEventListener('visibilitychange', refresh); };
  }, [router, seconds]);
  return null;
}
