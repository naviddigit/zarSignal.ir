'use client';

import { useRouter } from 'next/navigation';
import { instruments } from '@/lib/market';

export function AnalysisMarketSelect({ current }: { current?: string | null }) {
  const active = current?.toUpperCase() ?? null;
  const router = useRouter();
  return (
    <nav className="analysis-market-select" aria-label="انتخاب تحلیل">
      <label htmlFor="analysis-market">بازار</label>
      <select id="analysis-market" className="ds-input" value={active ?? ''}
        onChange={event => router.push(event.target.value ? `/analysis/${event.target.value.toLowerCase()}` : '/analysis')}>
        <option value="">کل بازار</option>
        {instruments.map(asset => (
          <option key={asset.symbol} value={asset.symbol}>{asset.short}</option>
        ))}
      </select>
    </nav>
  );
}
