import type { CalculatorModule } from '@/lib/calculator-access';

export type CalculatorProduct = 'gold' | 'silver' | 'fx' | 'coin';
export const calculatorProductLabels: Record<CalculatorProduct, string> = { gold: 'طلا', silver: 'نقره', fx: 'دلار', coin: 'سکه' };
export const calculatorProducts = Object.keys(calculatorProductLabels) as CalculatorProduct[];
export const calculatorToolsByProduct: Record<CalculatorProduct, CalculatorModule[]> = {
  gold: ['marketWeight', 'weight', 'purity', 'mazanehTo18k', 'market18kToMazaneh', 'fineGold', 'goldBubble', 'uaeGold', 'capitalGold', 'meltedPnl', 'meltedTarget', 'meltedNewBuy', 'meltedTargetAverage', 'meltedPartialSell', 'meltedBreakEven', 'goldSilverSwap', 'percentageChange'],
  silver: ['weight', 'purity', 'fineSilver', 'silverBarCost', 'silverMintPremium', 'capitalSilver', 'silverBubble', 'goldSilverSwap', 'percentageChange'],
  fx: ['usdGap', 'aedDerivedUsd', 'fxRateGap', 'rateCompare', 'percentageChange'],
  coin: ['coinBuy', 'coinSell', 'coinCapital', 'coinPnl', 'coinBreakEven', 'weight', 'purity', 'percentageChange'],
};

export const displayToolId = (id: string) => id === 'mazanehTo18k' || id === 'market18kToMazaneh' ? 'mazaneh' : id;
const displayTools = (product: CalculatorProduct) => [...new Set(calculatorToolsByProduct[product].map(displayToolId))];
const featured: Record<CalculatorProduct, string[]> = {
  gold: ['marketWeight', 'weight', 'mazaneh', 'goldBubble', 'fineGold', 'meltedPnl', 'capitalGold'],
  silver: ['weight', 'silverBubble', 'fineSilver', 'silverBarCost', 'goldSilverSwap', 'capitalSilver'],
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
  tools: Object.fromEntries(calculatorProducts.map(product => [product, [...featured[product], ...displayTools(product).filter(id => !featured[product].includes(id))]])) as CalculatorNavigation['tools'],
  starred: Object.fromEntries(calculatorProducts.map(product => [product, [...featured[product]]])) as CalculatorNavigation['starred'],
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
      : [...defaultCalculatorNavigation.starred[product]];
  }
  return { categories, tools, starred };
}

export function visibleCalculatorTools(product: CalculatorProduct, navigation: CalculatorNavigation): string[] {
  const starred = new Set(navigation.starred[product]);
  return [...navigation.tools[product].filter(id => starred.has(id)), ...navigation.tools[product].filter(id => !starred.has(id))];
}
