'use client';

import { chartDomain } from '@/lib/chart-data';

type SparklineProps = {
  values: number[];
  label: string;
  tone?: 'price' | 'bubble';
  className?: string;
  compact?: boolean;
};

/** Compact trend path — hide when fewer than 2 points. */
export function Sparkline({ values, label, tone = 'price', className = '', compact = false }: SparklineProps) {
  if (values.length < 2) return null;
  const domain = chartDomain(values);
  const w = compact ? 72 : 120;
  const h = compact ? 20 : 28;
  const span = Math.max(values.length - 1, 1);
  const path = values
    .map((value, index) => {
      const x = (index / span) * w;
      const y = h - ((value - domain.min) / (domain.max - domain.min || 1)) * (h - 4) - 2;
      return `${index ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
  return (
    <div className={`mini-spark is-${tone}${compact ? ' is-compact' : ''} ${className}`.trim()}>
      {label ? <small>{label}</small> : null}
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label || 'روند'} preserveAspectRatio="none">
        <path d={path} />
      </svg>
    </div>
  );
}
