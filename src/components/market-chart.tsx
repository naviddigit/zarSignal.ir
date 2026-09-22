'use client';

import { useState } from 'react';
import { chartDomain, type ChartPoint } from '@/lib/chart-data';

const number = (value: number) => new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 2 }).format(value);
const date = (value: string, full = false) => new Intl.DateTimeFormat('fa-IR', {
  month: 'short', day: 'numeric', ...(full ? { year: 'numeric', hour: '2-digit', minute: '2-digit' } as const : {}), timeZone: 'Asia/Tehran',
}).format(new Date(value));

/** A shared time axis and explicit units; no index-based interpolation or financial calculations. */
export function MarketChart({ points, label, unit, candles = false, percent = false }: {
  points: ChartPoint[]; label: string; unit: string; candles?: boolean; percent?: boolean;
}) {
  const [selected, setSelected] = useState<number | null>(null);
  if (!points.length) return null;
  const width = 900, height = 300, left = 118, right = 26, top = 26, bottom = 48;
  const plotWidth = width - left - right, plotHeight = height - top - bottom;
  const start = Date.parse(points[0].t), end = Date.parse(points.at(-1)!.t);
  const domain = chartDomain(points.flatMap(p => candles ? [p.l!, p.h!] : [p.value]));
  const x = (t: string) => left + (Date.parse(t) - start) / (end - start || 1) * plotWidth;
  const y = (v: number) => top + (domain.max - v) / (domain.max - domain.min) * plotHeight;
  const active = selected === null ? points.at(-1)! : points[Math.min(selected, points.length - 1)];
  const dates = [...new Set([0, Math.floor((points.length - 1) / 3), Math.floor((points.length - 1) * 2 / 3), points.length - 1])];
  const candleWidth = Math.max(2, Math.min(12, plotWidth / points.length * .55));
  const path = points.map((p, i) => `${i ? 'L' : 'M'}${x(p.t)},${y(p.value)}`).join(' ');
  function pick(clientX: number, rect: DOMRect) {
    const at = (clientX - rect.left) / rect.width * width;
    let nearest = 0;
    points.forEach((p, i) => { if (Math.abs(x(p.t) - at) < Math.abs(x(points[nearest].t) - at)) nearest = i; });
    setSelected(nearest);
  }
  return <div className={`market-chart ${percent ? 'is-percent' : ''}`}>
    <div className="chart-caption"><strong>{label}</strong><span>{unit} · {candles ? 'کندل روزانه' : 'مقادیر ثبت‌شده'}</span></div>
    <div className="chart-scroll" dir="ltr">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" tabIndex={0} aria-label={`${label}؛ محور قیمت و تاریخ؛ با کلیدهای جهت جابه‌جا شوید`}
        onPointerMove={event => pick(event.clientX, event.currentTarget.getBoundingClientRect())}
        onPointerLeave={() => setSelected(null)}
        onKeyDown={event => {
          if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
          event.preventDefault();
          setSelected(current => Math.max(0, Math.min(points.length - 1, (current ?? points.length - 1) + (event.key === 'ArrowLeft' ? -1 : 1))));
        }}>
        {[0, 1, 2, 3, 4].map(i => {
          const value = domain.min + (domain.max - domain.min) * i / 4;
          return <g key={i} className="chart-grid"><line x1={left} x2={width - right} y1={y(value)} y2={y(value)}/><text x={left - 12} y={y(value) + 4} textAnchor="end">{number(value)}{percent ? '٪' : ''}</text></g>;
        })}
        {dates.map(index => <g className="chart-grid" key={index}>
          <line x1={x(points[index].t)} x2={x(points[index].t)} y1={top} y2={height - bottom}/>
          <text x={x(points[index].t)} y={height - 18} textAnchor={index === 0 ? 'start' : index === points.length - 1 ? 'end' : 'middle'}>{end - start < 86_400_000 ? new Intl.DateTimeFormat('fa-IR', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Tehran' }).format(new Date(points[index].t)) : date(points[index].t)}</text>
        </g>)}
        {candles ? points.map(p => <g key={p.t} className={`chart-candle ${p.c! >= p.o! ? 'is-up' : 'is-down'}`}>
          <line x1={x(p.t)} x2={x(p.t)} y1={y(p.h!)} y2={y(p.l!)}/>
          <rect x={x(p.t) - candleWidth / 2} y={Math.min(y(p.o!), y(p.c!))} width={candleWidth} height={Math.max(1.5, Math.abs(y(p.o!) - y(p.c!)))}/>
        </g>) : <path className="chart-series" d={path}/>}
        {selected !== null && <g className="chart-crosshair"><line x1={x(active.t)} x2={x(active.t)} y1={top} y2={height - bottom}/><circle cx={x(active.t)} cy={y(active.value)} r="4"/></g>}
      </svg>
    </div>
    <div className="chart-tooltip" aria-live="polite"><time dateTime={active.t}>{date(active.t, true)}</time>
      {candles ? [['باز', active.o], ['بیشینه', active.h], ['کمینه', active.l], ['بسته', active.c]].map(([title, value]) => <span key={title}><small>{title}</small><bdi>{number(Number(value))}</bdi></span>) : <span><small>{label}</small><bdi>{number(active.value)} {unit}</bdi></span>}
    </div>
  </div>;
}
