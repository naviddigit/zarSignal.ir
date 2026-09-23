'use client';

import { chartDomain } from '@/lib/chart-data';

type SparklineProps = {
  values: number[];
  label: string;
  tone?: 'price' | 'bubble';
  className?: string;
};

/** Compact trend path used inside price cards (same spirit as landing chart teaser). */
export function Sparkline({ values, label, tone = 'price', className = '' }: SparklineProps) {
  if (values.length < 2) {
    return (
      <div className={`mini-spark is-empty ${className}`.trim()}>
        <small>{label}</small>
        <span className="mini-spark__placeholder" aria-hidden="true" />
      </div>
    );
  }
  const domain = chartDomain(values);
  const w = 120;
  const h = 36;
  const span = Math.max(values.length - 1, 1);
  const path = values
    .map((value, index) => {
      const x = (index / span) * w;
      const y = h - ((value - domain.min) / (domain.max - domain.min || 1)) * (h - 4) - 2;
      return `${index ? 'L' : 'M'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
  return (
    <div className={`mini-spark is-${tone} ${className}`.trim()}>
      <small>{label}</small>
      <svg viewBox={`0 0 ${w} ${h}`} role="img" aria-label={label} preserveAspectRatio="none">
        <path d={path} />
      </svg>
    </div>
  );
}
