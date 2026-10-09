import type { CalculatorModule } from '@/lib/calculator-access';

export type CalculatorProduct = 'gold' | 'silver' | 'fx' | 'coin' | 'trade';
export const calculatorProductLabels: Record<CalculatorProduct, string> = { gold: 'طلا', silver: 'نقره', fx: 'ارز', coin: 'سکه', trade: 'معامله سریع' };
export const calculatorProducts = Object.keys(calculatorProductLabels) as CalculatorProduct[];
export const calculatorToolsByProduct: Record<CalculatorProduct, CalculatorModule[]> = {
  trade: ['quickTrade', 'scaleIn', 'positionManager', 'scaleOut', 'tradeSimulator', 'meltedPnl', 'meltedPartialSell', 'meltedBreakEven', 'meltedNewBuy', 'meltedTargetAverage', 'meltedTarget'],
  gold: ['marketWeight', 'purity', 'mazanehTo18k', 'market18kToMazaneh', 'fineGold', 'goldBubble', 'uaeGold', 'capitalGold', 'goldSilverSwap', 'percentageChange'],
  silver: ['purity', 'fineSilver', 'silverBarCost', 'silverMintPremium', 'capitalSilver', 'silverBubble', 'goldSilverSwap', 'percentageChange'],
  fx: ['usdGap', 'aedDerivedUsd', 'fxRateGap', 'rateCompare', 'percentageChange'],
  coin: ['coinBuy', 'coinSell', 'coinCapital', 'coinPnl', 'coinBreakEven', 'purity', 'percentageChange'],
};

export const displayToolId = (id: string) => id === 'mazanehTo18k' || id === 'market18kToMazaneh' ? 'mazaneh' : id;
const displayTools = (product: CalculatorProduct) => [...new Set(calculatorToolsByProduct[product].map(displayToolId))];
const featured: Record<CalculatorProduct, string[]> = {
  trade: ['quickTrade', 'scaleIn', 'positionManager', 'scaleOut', 'tradeSimulator'],
  gold: ['marketWeight', 'mazaneh', 'goldBubble', 'fineGold', 'capitalGold'],
  silver: ['silverBubble', 'fineSilver', 'silverBarCost', 'goldSilverSwap', 'capitalSilver'],
  fx: ['usdGap', 'fxRateGap', 'aedDerivedUsd'],
  coin: ['coinBuy', 'coinSell', 'coinBreakEven', 'coinCapital', 'coinPnl'],
};

export type CalculatorNavigation = {
  categories: CalculatorProduct[];
  tools: Record<CalculatorProduct, string[]>;
  starred: Record<CalculatorProduct, string[]>;
};

export const defaultCalculatorNavigation: CalculatorNavigation = {
  categories: [...calculatorProducts],
  tools: Object.fromEntries(calculatorProducts.map(product => [product, [...featured[product].filter(id => displayTools(product).includes(id)), ...displayTools(product).filter(id => !featured[product].includes(id))]])) as CalculatorNavigation['tools'],
  /** Personal favorites live in the browser; server default stays empty. */
  starred: { gold: [], silver: [], fx: [], coin: [], trade: [] },
};

export function normalizeCalculatorNavigation(input: unknown): CalculatorNavigation {
  const raw = input && typeof input === 'object' ? input as Partial<CalculatorNavigation> : {};
  const ordered = (items: unknown, allowed: string[]) => {
    const selected = Array.isArray(items) ? items.filter((item): item is string => typeof item === 'string' && allowed.includes(item)) : [];
    return [...new Set([...selected, ...allowed])];
  };
  const categories = ordered(raw.categories, calculatorProducts) as CalculatorProduct[];
  const tools = {} as CalculatorNavigation['tools'];
  const starred = {} as CalculatorNavigation['starred'];
  for (const product of calculatorProducts) {
    tools[product] = ordered(raw.tools?.[product], defaultCalculatorNavigation.tools[product]);
    starred[product] = Array.isArray(raw.starred?.[product])
      ? [...new Set(raw.starred[product].filter(id => tools[product].includes(id)))]
      : [];
  }
  return { categories, tools, starred };
}

/** Order: user favorites → open tools → locked tools (admin tool order preserved inside each group). */
export function visibleCalculatorTools(
  product: CalculatorProduct,
  navigation: CalculatorNavigation,
  options?: { favorites?: string[]; lockedIds?: Iterable<string> },
): string[] {
  const order = navigation.tools[product];
  const favorites = new Set((options?.favorites ?? navigation.starred[product]).filter(id => order.includes(id)));
  const locked = new Set(options?.lockedIds ?? []);
  const favored = order.filter(id => favorites.has(id));
  const open = order.filter(id => !favorites.has(id) && !locked.has(id));
  const closed = order.filter(id => !favorites.has(id) && locked.has(id));
  return [...favored, ...open, ...closed];
}
