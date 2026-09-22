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
  const date = new Date(value);
  const valid = Number.isFinite(date.getTime());
  const exact = valid ? new Intl.DateTimeFormat('fa-IR', {
    dateStyle: 'medium', timeStyle: 'medium', timeZone: 'Asia/Tehran',
  }).format(date) : 'زمان نامشخص';
  return <time dateTime={valid ? value : undefined} title={exact}>
    {prefix}{now === null || !valid ? exact : formatRelativeTime(value, now)}
  </time>;
}
