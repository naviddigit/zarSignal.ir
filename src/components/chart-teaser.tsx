'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { enoughHistory, chartDomain, type ChartPoint } from '@/lib/chart-data';
import { snapshotChartPoints } from '@/lib/chart-history';

export function ChartTeaser() {
  const [count, setCount] = useState<number | null>(null);
  const [points, setPoints] = useState<ChartPoint[]>([]);
  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/public/bubbles/history?formula=GOLD_BUBBLE&range=24h', { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(10_000)]), cache: 'no-store' })
      .then(r => { if (!r.ok) throw new Error('unavailable'); return r.json(); }).then(data => { if (!controller.signal.aborted) { const points = snapshotChartPoints(data.points ?? [], 'GOLD_MELTED'); setCount(enoughHistory(points) ? points.length : 0); setPoints(points); } }).catch(() => { if (!controller.signal.aborted) setCount(0); });
    return () => controller.abort();
  }, []);
  return <section id="bubble-history" className="panel chart-teaser"><div><span className="eyebrow">PRICE + BUBBLE</span><h2>قیمت و حباب، در یک نگاه</h2><p>{count === null ? 'در حال بررسی تاریخچه…' : count ? `${new Intl.NumberFormat('fa-IR').format(count)} مشاهده در ۲۴ ساعت اخیر · مقیاس‌های مستقل` : 'تاریخچه کوتاه‌مدت در حال شکل‌گیری است؛ قیمت‌های فعلی در جدول بازار در دسترس‌اند.'}</p></div>{Boolean(count) && <div className="teaser-sparks">{(['value','bubble'] as const).map(key => {
    const domain = chartDomain(points.map(p => p[key]!));
    const start = Date.parse(points[0].t), span = Date.parse(points.at(-1)!.t) - start;
    const path = points.map((p,i) => `${i ? 'L' : 'M'}${4 + (Date.parse(p.t)-start)/span*152},${44-(p[key]!-domain.min)/(domain.max-domain.min)*40}`).join(' ');
    return <div key={key}><small>{key === 'value' ? 'آب‌شده · تومان' : 'حباب طلا · ٪'}</small><svg viewBox="0 0 160 48" role="img" aria-label={key === 'value' ? 'روند قیمت ۲۴ ساعت' : 'روند حباب ۲۴ ساعت'}><path className={`chart-series ${key === 'bubble' ? 'bubble-overlay' : ''}`} d={path}/></svg><bdi>{new Intl.NumberFormat('fa-IR',{maximumFractionDigits:2}).format(points.at(-1)![key]!)}</bdi></div>;
  })}</div>}<Link className="button" href="/charts/gold_melted">مشاهده چارت کامل</Link></section>;
}
