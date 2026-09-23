import { Coins, Gem, Landmark } from 'lucide-react';
import type { Symbol } from '@/lib/market';

const iconBySymbol: Record<Symbol, typeof Coins> = {
  GOLD_MELTED: Coins,
  GOLD_18K: Coins,
  XAU_USD: Coins,
  XAG_USD: Gem,
  SILVER_999: Gem,
  USD: Landmark,
  AED: Landmark,
  SEKE_CASH: Coins,
  ROB_SEKE: Coins,
};

export function AssetMark({ symbol, category }: { symbol: Symbol; category: string }) {
  const Icon = iconBySymbol[symbol];
  return <span className={`market-asset-mark ${category}`} aria-hidden="true"><Icon size={20} /></span>;
}
