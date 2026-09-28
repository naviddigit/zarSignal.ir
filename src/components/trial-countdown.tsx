 'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
export function TrialCountdown({ expiresAt }: { expiresAt: string }) {
  const [remaining, setRemaining] = useState<number | null>(null);
  const router = useRouter();
  useEffect(() => {
    function tick() {
      const seconds = Math.max(0, Math.ceil((Date.parse(expiresAt) - Date.now()) / 1000));
      setRemaining(seconds);
      if (!seconds) { clearInterval(timer); router.refresh(); }
    }
    const timer = setInterval(tick, 1000); tick();
    return () => clearInterval(timer);
  }, [expiresAt, router]);
  const time = remaining === null ? '…' : [Math.floor(remaining / 3600), Math.floor(remaining % 3600 / 60), remaining % 60].map(n => String(n).padStart(2, '0')).join(':');
  return <span>زمان باقی‌مانده دسترسی آزمایشی: <bdi>{time}</bdi></span>;
}
