import type { CalculatorProduct } from '@/lib/calculator-navigation';

const STORAGE_KEY = 'zarsignal-calc-favorites-v1';

type FavoritesMap = Record<CalculatorProduct, string[]>;

const emptyFavorites = (): FavoritesMap => ({ gold: [], silver: [], fx: [], coin: [], trade: [] });

export function readCalculatorFavorites(): FavoritesMap {
  if (typeof window === 'undefined') return emptyFavorites();
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '{}') as Partial<FavoritesMap>;
    const next = emptyFavorites();
    for (const product of Object.keys(next) as CalculatorProduct[]) {
      next[product] = Array.isArray(raw[product])
        ? [...new Set(raw[product]!.filter((id): id is string => typeof id === 'string'))]
        : [];
    }
    return next;
  } catch {
    return emptyFavorites();
  }
}

export function writeCalculatorFavorites(favorites: FavoritesMap) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(favorites));
  } catch {
    /* ignore quota / private mode */
  }
}

export function toggleCalculatorFavorite(favorites: FavoritesMap, product: CalculatorProduct, id: string): FavoritesMap {
  const current = favorites[product] ?? [];
  const next = current.includes(id) ? current.filter(value => value !== id) : [...current, id];
  return { ...favorites, [product]: next };
}
