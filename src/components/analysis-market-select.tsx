'use client';

import Link from 'next/link';
import { instruments } from '@/lib/market';

export function AnalysisMarketSelect({ current }: { current?: string | null }) {
  const active = current?.toUpperCase() ?? null;
  return (
    <nav className="analysis-market-select" aria-label="انتخاب تحلیل">
      <div className="analysis-market-select__track">
        <Link className="analysis-market-select__item" href="/analysis" aria-current={!active ? 'page' : undefined}>کل بازار</Link>
        {instruments.filter(asset => asset.symbol !== 'XAU_USD' && asset.symbol !== 'XAG_USD').map(asset => (
          <Link key={asset.symbol} className="analysis-market-select__item" href={`/analysis/${asset.symbol.toLowerCase()}`} aria-current={active === asset.symbol ? 'page' : undefined}>{asset.short}</Link>
        ))}
      </div>
    </nav>
  );
}
