'use client';

import Link from 'next/link';
import { instruments } from '@/lib/market';
import { HScrollRail } from '@/components/ui/h-scroll-rail';

export function AnalysisMarketSelect({ current }: { current?: string | null }) {
  const active = current?.toUpperCase() ?? null;
  return (
    <nav className="analysis-market-select" aria-label="انتخاب تحلیل">
      <HScrollRail
        className="analysis-market-select__rail"
        trackClassName="analysis-market-select__track"
        label="بازارهای تحلیل"
        step={132}
      >
        <Link
          href="/analysis"
          className="analysis-market-select__item"
          aria-current={active == null ? 'page' : undefined}
        >
          کل بازار
        </Link>
        {instruments.map(asset => (
          <Link
            key={asset.symbol}
            href={`/analysis/${asset.symbol.toLowerCase()}`}
            className="analysis-market-select__item"
            aria-current={asset.symbol === active ? 'page' : undefined}
          >
            {asset.short}
          </Link>
        ))}
      </HScrollRail>
    </nav>
  );
}
