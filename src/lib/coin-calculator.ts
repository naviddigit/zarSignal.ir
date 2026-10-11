import type { CalculatorField, CalculatorResult } from './calculator-catalog';

export const COIN_SPEC_VERSION = 'COIN-3.1';
// Nominal banking products; year/authenticity affect the quote, not this metal-weight calculation.
export const coinSpecs = {
  emami: { label: 'امامی', weight: 8.133, purity: 900 },
  bahar: { label: 'بهار آزادی', weight: 8.133, purity: 900 },
  half: { label: 'نیم‌سکه', weight: 4.066, purity: 900 },
  quarter: { label: 'ربع‌سکه', weight: 2.033, purity: 900 },
  gram: { label: 'سکه گرمی', weight: 1.01, purity: 900 },
  custom: { label: 'پارسیان / مشخصات دستی', weight: 0, purity: 750 },
} as const;
export type CoinId = keyof typeof coinSpecs;
export const coinOperations = {
  coinIntrinsic: 'ارزش فلزی سکه', coinBubble: 'حباب سکه', coinRadar: 'رادار حباب',
  coinCompare: 'مقایسه حباب سکه‌ها', coinBudget: 'سرمایه و حباب', coinTarget: 'سناریوی هدف',
  coinBubbleBreakEven: 'حباب سربه‌سر', coinScenario: 'سناریوی طلا و ارز', coinSwap: 'مقایسه تبدیل', coinAlert: 'هشدار شخصی',
} as const;
export type CoinOperation = keyof typeof coinOperations;
export const isCoinOperation = (value: string): value is CoinOperation => Object.hasOwn(coinOperations, value);
export function requireCoinId(value: unknown): CoinId {
  if (typeof value !== 'string' || !Object.hasOwn(coinSpecs, value)) throw new Error('نوع سکه معتبر نیست.');
  return value as CoinId;
}
const field = (key: string, label: string, unit = 'تومان', allowZero = false): CalculatorField => ({ key, label, unit, allowZero });
const gram: CalculatorField = { key: 'gram', label: 'گرم طلای ۱۸ عیار', unit: 'تومان / گرم', symbol: 'GOLD_18K', currency: 'TMN', quoteUnit: 'گرم' };
export function coinFields(operation: CoinOperation, coin: CoinId): CalculatorField[] {
  const metal = [...(coin === 'custom' ? [field('weight', 'وزن محصول', 'گرم'), { ...field('purity', 'عیار محصول', 'از ۱۰۰۰'), max: 1000 }] : []), gram];
  const price: CalculatorField = { ...field('price', 'قیمت مرجع هر سکه'), ...(coin === 'quarter' ? { symbol: 'ROB_SEKE' as const, currency: 'TMN', quoteUnit: 'عدد' } : {}) };
  const cost = field('cost', 'کل هزینه‌های خرید و فروش', 'تومان', true);
  const quantity = field('quantity', 'تعداد سکه', 'عدد');
  if (operation === 'coinIntrinsic') return metal;
  if (operation === 'coinCompare' || operation === 'coinRadar') return [gram, ...Object.entries(coinSpecs).filter(([id]) => id !== 'custom').map(([id, spec]) => ({ ...field(id === 'gram' ? 'coinGram' : id, `قیمت ${spec.label} (صفر = بدون نرخ)`, 'تومان', true), ...(id === 'quarter' ? { symbol: 'ROB_SEKE' as const, currency: 'TMN', quoteUnit: 'عدد' } : {}) })), ...(operation === 'coinRadar' ? [{ ...field('threshold', 'آستانه حباب', 'درصد', true), min: -100 }] : [])];
  if (operation === 'coinBudget') return [...metal, price, field('capital', 'سرمایه'), field('fee', 'هزینه هر سکه', 'تومان', true)];
  if (operation === 'coinTarget') return [...metal, price, quantity, field('target', 'قیمت هدف هر سکه'), cost];
  if (operation === 'coinBubbleBreakEven') return [...metal, field('price', 'قیمت خرید هر سکه'), quantity, cost];
  if (operation === 'coinScenario') return [...(coin === 'custom' ? metal.slice(0, 2) : []), { ...field('xau', 'اونس هدف طلا', 'دلار / اونس') }, field('usd', 'دلار هدف', 'تومان / دلار'), { ...field('threshold', 'حباب هدف', 'درصد', true), min: -99.99 }, price];
  if (operation === 'coinSwap') return [field('price', 'نرخ فروش سکه مبدأ'), quantity, field('destination', 'نرخ خرید مقصد (سکه یا گرم ۱۸)'), cost];
  return [...metal, price, ...(operation === 'coinBubble' ? [field('bid', 'نرخ خرید فروشنده (صفر = ناموجود)', 'تومان', true), field('ask', 'نرخ فروش فروشنده (صفر = ناموجود)', 'تومان', true)] : [{ ...field('threshold', 'آستانه شخصی حباب', 'درصد', true), min: -100 }])];
}

export function coinValuation(weight: number, purity: number, gold18: number, price: number) {
  if (![weight, purity, gold18].every(n => Number.isFinite(n) && n > 0) || purity > 1000 || !Number.isFinite(price) || price < 0) throw new Error('مشخصات سکه یا نرخ مرجع معتبر نیست.');
  const fine = weight * purity / 1000;
  const intrinsic = fine * gold18 / .75;
  return { fine, intrinsic, gap: price - intrinsic, percent: (price / intrinsic - 1) * 100 };
}

export function coinOutputs(operation: CoinOperation, coin: CoinId, v: Record<string, number>): CalculatorResult['outputs'] {
  const out = (label: string, value: number, unit = 'تومان') => ({ label, value, unit });
  if ('quantity' in v && !Number.isInteger(v.quantity)) throw new Error('تعداد سکه باید عدد صحیح باشد.');
  if (operation === 'coinCompare' || operation === 'coinRadar') {
    const rows = Object.entries(coinSpecs).filter(([id]) => id !== 'custom' && v[id === 'gram' ? 'coinGram' : id] > 0).map(([id, spec]) => ({ label: spec.label, ...coinValuation(spec.weight, spec.purity, v.gram, v[id === 'gram' ? 'coinGram' : id]) })).sort((a, b) => a.percent - b.percent);
    if (!rows.length) throw new Error('قیمت دست‌کم یک نوع سکه را وارد کنید.');
    return rows.flatMap(row => [out(`${row.label} · حباب`, row.percent, 'درصد'), out(`${row.label} · فاصله با ارزش فلزی`, row.gap), ...(operation === 'coinRadar' ? [out(`${row.label} · فاصله تا آستانه`, row.percent - v.threshold, 'واحد درصد')] : [])]);
  }
  if (operation === 'coinSwap') {
    const cash = v.price * v.quantity - v.cost;
    if (cash < 0) throw new Error('هزینه تبدیل از دریافتی فروش بیشتر است.');
    const units = cash / v.destination;
    return [out('دریافتی پس از هزینه', cash), out('معادل مقصد', units, 'سکه یا گرم ۱۸'), out('تعداد صحیح در صورت تبدیل به سکه', Math.floor(units), 'سکه'), out('مانده نقد در صورت تبدیل به سکه', cash - Math.floor(units) * v.destination)];
  }
  const spec = coinSpecs[coin];
  const gold18 = operation === 'coinScenario' ? v.xau * v.usd / 31.1034768 * .75 : v.gram;
  const result = coinValuation(coin === 'custom' ? v.weight : spec.weight, coin === 'custom' ? v.purity : spec.purity, gold18, v.price ?? 0);
  if (operation === 'coinIntrinsic') return [out('طلای خالص محصول', result.fine, 'گرم'), out('ارزش فلزی با مرجع طلای ۱۸', result.intrinsic)];
  if (operation === 'coinBudget') {
    const qty = Math.floor(v.capital / (v.price + v.fee));
    return [out('تعداد قابل تهیه', qty, 'سکه'), out('ارزش فلزی مجموع', qty * result.intrinsic), out('حباب پرداختی مجموع', qty * result.gap), out('هزینه مجموع', qty * v.fee), out('هزینه نهایی', qty * (v.price + v.fee)), out('مانده سرمایه', v.capital - qty * (v.price + v.fee))];
  }
  if (operation === 'coinTarget') {
    const invested = v.price * v.quantity + v.cost;
    const profit = v.target * v.quantity - invested;
    return [out('ارزش در هدف', v.target * v.quantity), out('سود/زیان پس از هزینه', profit), out('بازده سناریو', profit / invested * 100, 'درصد'), out('حباب هدف با طلای فعلی', (v.target / result.intrinsic - 1) * 100, 'درصد')];
  }
  if (operation === 'coinBubbleBreakEven') {
    const target = v.price + v.cost / v.quantity;
    return [out('قیمت سربه‌سر هر سکه', target), out('حباب سربه‌سر با طلای فعلی', (target / result.intrinsic - 1) * 100, 'درصد')];
  }
  if (operation === 'coinScenario') {
    const target = result.intrinsic * (1 + v.threshold / 100);
    return [out('ارزش فلزی سناریو · اونس و دلار', result.intrinsic), out('قیمت سکه در سناریو', target), out('تغییر نسبت به نرخ فعلی', target - v.price), out('تغییر نسبی سناریو', (target / v.price - 1) * 100, 'درصد')];
  }
  if (v.bid > 0 && v.ask > 0 && v.bid > v.ask) throw new Error('نرخ خرید فروشنده نباید از نرخ فروش بیشتر باشد.');
  return [out('ارزش فلزی با مرجع طلای ۱۸', result.intrinsic), out(result.gap < 0 ? 'قیمت زیر ارزش فلزی' : result.gap > 0 ? 'قیمت بالای ارزش فلزی' : 'برابر ارزش فلزی', result.gap), out('حباب نسبت به ارزش فلزی', result.percent, 'درصد'),
    ...(v.bid > 0 ? [out('حباب نرخ خرید فروشنده', (v.bid / result.intrinsic - 1) * 100, 'درصد')] : []),
    ...(v.ask > 0 ? [out('حباب نرخ فروش فروشنده', (v.ask / result.intrinsic - 1) * 100, 'درصد')] : []),
    ...(v.bid > 0 && v.ask > 0 ? [out('اسپرد خرید و فروش', v.ask - v.bid)] : []),
    ...(operation === 'coinAlert' ? [out('فاصله تا آستانه شخصی', result.percent - v.threshold, 'واحد درصد')] : [])];
}
