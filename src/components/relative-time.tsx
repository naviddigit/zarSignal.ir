'use client';

import { useEffect, useState } from 'react';
import { formatRelativeTime } from '@/lib/time';

export function RelativeTime({ value, prefix = '' }: { value: string; prefix?: string }) {
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);
  const exact = new Intl.DateTimeFormat('fa-IR', {
    dateStyle: 'medium', timeStyle: 'medium', timeZone: 'Asia/Tehran',
  }).format(new Date(value));
  return <time dateTime={value} title={exact} suppressHydrationWarning>
    {prefix}{now === null ? 'در حال محاسبه…' : formatRelativeTime(value, now)}
  </time>;
}
