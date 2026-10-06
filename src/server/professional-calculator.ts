import { calculatorCatalog, type CalculatorOperation, type CalculatorResult } from '@/lib/calculator-catalog';
import { isStale, type Quote, type Snapshot } from '@/lib/market';
import { mazanehTo18k, market18kToMazaneh } from './mazaneh-to-18k';
import { goldBubble, silverBubbleV54, usdGap, usdFromAedGap, TROY_OZ_GRAMS } from './bubble-formulas';

function midQuote(quote: Quote) {
  const buy = Number(quote.buy);
  const sell = Number(quote.sell);
  if (buy > 0 && sell > 0) return buy <= sell ? (buy + sell) / 2 : null;
  return buy > 0 ? buy : sell > 0 ? sell : null;
}

function resolveLiveValue(field: (typeof calculatorCatalog)[CalculatorOperation]['fields'][number], snapshot: Snapshot) {
  if (snapshot.mode !== 'live' || !field.symbol) return null;

  // ۱۸ عیار برای حباب/تبدیل همیشه از مثقال زنده ÷ ۴٫۳۳۱۸ — نه قیمت جداگانهٔ دیده‌بان.
  if (field.symbol === 'GOLD_18K') {
    const melted = snapshot.quotes.find(q => q.symbol === 'GOLD_MELTED');
    if (melted && !isStale(melted) && melted.currency === 'TMN') {
      const mid = midQuote(melted);
      if (mid != null) {
        try {
          return {
            value: mazanehTo18k(mid).market18k,
            observedAt: melted.observedAt,
            source: 'زرسیگنال · مشتق از مثقال زنده با ÷ ۴٫۳۳۱۸',
          };
        } catch { /* fall through */ }
      }
    }
    return null;
  }

  const quote = snapshot.quotes.find(q => q.symbol === field.symbol);
  if (quote && !isStale(quote) && quote.currency === field.currency && quote.unit === field.quoteUnit) {
    const mid = midQuote(quote);
    if (mid != null) return { value: mid, observedAt: quote.observedAt, source: 'زرسیگنال · میانگین دو سمت یا قیمت دیده‌بان' };
  }
  return null;
}

export function calculateProfessional(body: unknown, snapshot: Snapshot): CalculatorResult {
  if (!body || typeof body !== 'object') throw new Error('ورودی معتبر نیست.');
  const request = body as { operation: CalculatorOperation; inputs: Record<string, { provenance: string; value?: unknown }> };
  if (!Object.hasOwn(calculatorCatalog, request.operation) || !request.inputs || typeof request.inputs !== 'object') throw new Error('این محاسبه فعال نیست.');
  const spec = calculatorCatalog[request.operation];
  const inputs: CalculatorResult['inputs'] = spec.fields.map(field => {
    const input = request.inputs[field.key];
    if (!input || !['LIVE', 'MANUAL'].includes(input.provenance)) throw new Error('منبع هر ورودی را مشخص کنید.');
    if (input.provenance === 'LIVE') {
      const live = resolveLiveValue(field, snapshot);
      if (!live) throw new Error('داده تازه و هم‌واحد در دسترس نیست؛ مقدار دستی وارد کنید.');
      return { key: field.key, label: field.label, value: live.value, unit: field.unit, provenance: 'LIVE', observedAt: live.observedAt, source: live.source };
    }
    if (typeof input.value !== 'number' || !Number.isFinite(input.value) || input.value < (field.allowZero ? 0 : Number.MIN_VALUE) || input.value > (field.max ?? 1e15)) throw new Error(`مقدار «${field.label}» معتبر نیست.`);
    return { key: field.key, label: field.label, value: input.value, unit: field.unit, provenance: 'MANUAL', observedAt: null, source: 'ورودی شما' };
  });
  const liveTimes = inputs.filter(i => i.observedAt).map(i => Date.parse(i.observedAt!));
  if (liveTimes.length > 1 && Math.max(...liveTimes) - Math.min(...liveTimes) > 15 * 60_000) throw new Error('زمان ورودی‌های زنده هم‌خوان نیست.');
  const v = Object.fromEntries(inputs.map(i => [i.key, i.value]));
  let outputs: CalculatorResult['outputs'];
  const output = (label: string, value: number, unit: string) => ({ label, value, unit });
  if (request.operation === 'fineGold') {
    const fine = v.weight * v.purity / 1000;
    const equivalent18 = fine / .75;
    outputs = [output('طلای خالص', fine, 'گرم'), output('معادل ۱۸ عیار', equivalent18, 'گرم'), output('ارزش محاسباتی فلز', equivalent18 * v.gram, 'تومان')];
  } else if (request.operation === 'uaeGold') {
    const uae24Irt = v.uae24 * v.aed;
    const uae18Irt = uae24Irt * 750 / 999;
    const gap = v.gram - uae18Irt;
    outputs = [output('۲۴ عیار امارات', uae24Irt, 'تومان / گرم'), output('معادل ۱۸ عیار امارات', uae18Irt, 'تومان / گرم'), output('فاصله ایران و امارات', gap, 'تومان / گرم'), output('فاصله نسبی', gap / uae18Irt * 100, 'درصد')];
  } else if (request.operation === 'fxRateGap' || request.operation === 'rateCompare') {
    const first = request.operation === 'fxRateGap' ? v.implied : v.rateA;
    const second = request.operation === 'fxRateGap' ? v.derived : v.rateB;
    outputs = [output('اختلاف نرخ', first - second, 'تومان'), output('اختلاف نسبت به نرخ دوم', (first - second) / second * 100, 'درصد')];
  } else if (request.operation === 'coinBuy' || request.operation === 'coinSell') {
    if (!Number.isInteger(v.quantity)) throw new Error('تعداد سکه باید عدد صحیح باشد.');
    const gross = v.price * v.quantity;
    const total = request.operation === 'coinBuy' ? gross + v.cost : gross - v.cost;
    outputs = [output('ارزش ناخالص', gross, 'تومان'), output(request.operation === 'coinBuy' ? 'هزینه نهایی خرید' : 'دریافتی خالص فروش', total, 'تومان'), output('ارزش هر سکه پس از هزینه', total / v.quantity, 'تومان')];
  } else if (request.operation === 'coinBreakEven') {
    if (!Number.isInteger(v.quantity)) throw new Error('تعداد سکه باید عدد صحیح باشد.');
    outputs = [output('قیمت سربه‌سر فروش هر سکه', v.buyPrice + v.cost / v.quantity, 'تومان')];
  } else if (request.operation === 'fineSilver') {
    outputs = [output('نقره خالص', v.weight * v.purity / 1000, 'گرم')];
  } else if (request.operation === 'silverBarCost') {
    const fine = v.weight * v.purity / 1000;
    const metal = fine / TROY_OZ_GRAMS * v.xag * v.usd;
    outputs = [output('نقره خالص شمش', fine, 'گرم'), output('ارزش محاسباتی فلز', metal, 'تومان'), output('بهای تمام‌شده با هزینه‌های واردشده', metal + v.mint + v.tax + v.spread + v.cost, 'تومان')];
  } else if (request.operation === 'meltedPnl') {
    const position = v.melted * v.quantity;
    const invested = v.average * v.quantity;
    const gross = position - invested;
    outputs = [output('ارزش نظری موقعیت', position, 'تومان'), output('سود/زیان ناخالص', gross, 'تومان'), output('هزینه‌های واردشده', v.cost, 'تومان'), output('سود/زیان خالص نظری', gross - v.cost, 'تومان'), output('بازده خالص', (gross - v.cost) / (invested + v.cost) * 100, 'درصد')];
  } else if (request.operation === 'percentageChange') {
    outputs = [output('تغییر مقدار', v.after - v.before, 'تومان'), output('تغییر درصدی', (v.after - v.before) / v.before * 100, 'درصد')];
  } else if (request.operation === 'goldSilverSwap') {
    const silverPurity = v.purity / 1000;
    const theoreticalPerGram = v.xau * .75 / (v.xag * silverPurity);
    // Other purities are metal-value equivalents from the 999 quote, not executable market quotes.
    const silverSelected = v.silver999 * v.purity / 999;
    const marketPerGram = v.gram / silverSelected;
    const goldTheoretical = v.xau / TROY_OZ_GRAMS * v.usd * .75;
    const silverTheoretical = v.xag / TROY_OZ_GRAMS * v.usd * silverPurity;
    outputs = [
      output('نسبت جهانی اونس طلا به نقره', v.xau / v.xag, 'برابر'),
      output('نقره نظری به ازای هر گرم طلای ۱۸', theoreticalPerGram, 'گرم'),
      output('نقره نظری کل', theoreticalPerGram * v.weight, 'گرم'),
      output(v.purity === 999 ? 'قیمت بازار نقره ۹۹۹' : 'ارزش محاسباتی نقره با عیار انتخابی', silverSelected, 'تومان / گرم'),
      output('نقره معادل بازار به ازای هر گرم طلای ۱۸', marketPerGram, 'گرم'),
      output('نقره معادل بازار کل', marketPerGram * v.weight, 'گرم'),
      output('تفاوت وزن بازار و نظری', (marketPerGram - theoreticalPerGram) * v.weight, 'گرم'),
      output('اختلاف نسبی تبدیل', (marketPerGram / theoreticalPerGram - 1) * 100, 'درصد'),
      output('فاصله طلای ۱۸ با ارزش جهانی', (v.gram / goldTheoretical - 1) * 100, 'درصد'),
      output('فاصله نقره با ارزش جهانی', (silverSelected / silverTheoretical - 1) * 100, 'درصد'),
    ];
  } else if (request.operation === 'capitalGold' || request.operation === 'capitalSilver') {
    if (v.cost >= v.capital) throw new Error('هزینه‌ها باید کمتر از سرمایه باشند.');
    const gold = request.operation === 'capitalGold';
    const price = gold ? v.gram : v.silver999;
    outputs = [output('وزن نظری قابل تهیه', (v.capital - v.cost) / price, 'گرم'), output('سرمایه به‌کاررفته در فلز', v.capital - v.cost, 'تومان'), output('هزینه‌های واردشده', v.cost, 'تومان')];
  } else if (request.operation === 'coinCapital') {
    const quantity = Math.floor(v.capital / (v.price + v.cost));
    const used = quantity * (v.price + v.cost);
    outputs = [output('تعداد کامل قابل تهیه', quantity, 'سکه'), output('سرمایه مصرف‌شده', used, 'تومان'), output('مانده نقد', v.capital - used, 'تومان')];
  } else if (request.operation === 'coinPnl') {
    if (!Number.isInteger(v.quantity)) throw new Error('تعداد سکه باید عدد صحیح باشد.');
    const invested = v.buyPrice * v.quantity;
    const gross = (v.sellPrice - v.buyPrice) * v.quantity;
    outputs = [output('سود/زیان ناخالص', gross, 'تومان'), output('کل هزینه‌ها', v.cost, 'تومان'), output('سود/زیان خالص', gross - v.cost, 'تومان'), output('بازده خالص', (gross - v.cost) / (invested + v.cost) * 100, 'درصد')];
  } else if (request.operation === 'silverMintPremium') {
    const difference = v.barPrice - v.metalValue;
    outputs = [output('اختلاف قیمت شمش با ارزش فلز', difference, 'تومان'), output('اختلاف نسبی', difference / v.metalValue * 100, 'درصد')];
  } else if (request.operation === 'aedDerivedUsd') {
    const result = usdFromAedGap({ aedToman: v.aed, usdMarket: v.usd });
    outputs = [output('دلار مشتق از درهم', result.usdFromAed, 'تومان / دلار'), output('اختلاف دلار بازار', result.gap, 'تومان / دلار'), output('اختلاف نسبی', result.percent, 'درصد')];
  } else if (request.operation === 'meltedTarget') {
    const invested = v.average * v.quantity;
    const targetValue = v.target * v.quantity;
    const profit = targetValue - invested - v.cost;
    outputs = [output('قیمت هدف معادل گرم ۱۸ عیار', mazanehTo18k(v.target).market18k, 'تومان / گرم'), output('ارزش موقعیت در هدف', targetValue, 'تومان'), output('سود/زیان تخمینی پس از هزینه', profit, 'تومان'), output('سود/زیان هر مثقال', profit / v.quantity, 'تومان / مثقال'), output('بازده تخمینی', profit / invested * 100, 'درصد'), output('فاصله هدف از قیمت فعلی', (v.target / v.melted - 1) * 100, 'درصد')];
  } else if (request.operation === 'meltedNewBuy') {
    const oldInvestment = v.average * v.quantity;
    const addedInvestment = v.buyPrice * v.added + v.cost;
    const finalQuantity = v.quantity + v.added;
    const newAverage = (oldInvestment + addedInvestment) / finalQuantity;
    outputs = [output('میانگین جدید هر مثقال', newAverage, 'تومان / مثقال'), output('میانگین جدید معادل گرم ۱۸', mazanehTo18k(newAverage).market18k, 'تومان / گرم'), output('تغییر میانگین', newAverage - v.average, 'تومان / مثقال'), output('موقعیت نهایی', finalQuantity, 'مثقال'), output('سرمایه خرید جدید با هزینه', addedInvestment, 'تومان')];
  } else if (request.operation === 'meltedTargetAverage') {
    const required = v.target === v.average ? 0 : v.quantity * (v.average - v.target) / (v.target - v.buyPrice);
    if (!Number.isFinite(required) || required < 0 || (required === 0 && v.target !== v.average)) throw new Error('میانگین هدف با این قیمت خرید دست‌یافتنی نیست.');
    outputs = [output('مقدار خرید لازم', required, 'مثقال'), output('معادل قیمت خرید هر گرم ۱۸', mazanehTo18k(v.buyPrice).market18k, 'تومان / گرم'), output('سرمایه لازم بدون کارمزد', required * v.buyPrice, 'تومان'), output('موقعیت پس از خرید', v.quantity + required, 'مثقال')];
  } else if (request.operation === 'meltedPartialSell') {
    if (v.sold > v.quantity) throw new Error('مقدار فروش نمی‌تواند از موقعیت فعلی بیشتر باشد.');
    const remaining = v.quantity - v.sold;
    outputs = [output('فروش ناخالص', v.sellPrice * v.sold, 'تومان'), output('سود/زیان محقق‌شده پس از هزینه', (v.sellPrice - v.average) * v.sold - v.cost, 'تومان'), output('موقعیت باقی‌مانده', remaining, 'مثقال'), output('بهای تمام‌شده باقی‌مانده', remaining * v.average, 'تومان'), output('ارزش نظری باقی‌مانده با قیمت واردشده', remaining * v.sellPrice, 'تومان')];
  } else if (request.operation === 'meltedBreakEven') {
    const price = v.average + v.cost / v.quantity;
    outputs = [output('قیمت سربه‌سر هر مثقال', price, 'تومان / مثقال'), output('معادل گرم ۱۸ عیار', mazanehTo18k(price).market18k, 'تومان / گرم'), output('فاصله سربه‌سر از قیمت فعلی', (price / v.melted - 1) * 100, 'درصد')];
  } else if (request.operation === 'mazanehTo18k') outputs = [{ label: 'قیمت مشتق گرم ۱۸ عیار', value: mazanehTo18k(v.melted).market18k, unit: 'تومان / گرم' }];
  else if (request.operation === 'market18kToMazaneh') outputs = [{ label: 'مثقال محاسبه‌شده', value: market18kToMazaneh(v.gram), unit: 'تومان / مثقال' }];
  else if (request.operation === 'silverBubble') {
    const result = silverBubbleV54({ xagUsd: v.xag, usdIrt: v.usd, silver999Market: v.silver999 });
    outputs = [
      { label: 'قیمت نظری نقره ۹۹۹', value: result.silverTheo999, unit: 'تومان / گرم' },
      { label: 'اختلاف قیمت', value: result.silverGap, unit: 'تومان / گرم' },
      { label: 'حباب نقره', value: result.silverPremiumPct, unit: 'درصد' },
    ];
  } else {
    const market18k = mazanehTo18k(v.melted).market18k;
    const gold = request.operation === 'goldBubble';
    const result = gold ? goldBubble({ market18k, xauUsd: v.xau, usdIrt: v.usd }) : usdGap({ market18k, xauUsd: v.xau, actualUsd: v.usd });
    outputs = [
      { label: gold ? 'ارزش محاسباتی طلای ۱۸ عیار' : 'دلار ضمنی طلا', value: result.theoretical, unit: gold ? 'تومان / گرم' : 'تومان / دلار' },
      { label: gold ? 'فاصله قیمت با ارزش محاسباتی' : 'فاصله نرخ دلار', value: result.gap, unit: gold ? 'تومان / گرم' : 'تومان / دلار' },
      { label: gold ? 'حباب طلا' : 'فاصله نسبی دلار', value: result.percent, unit: 'درصد' },
    ];
  }
  if (outputs.some(o => !Number.isFinite(o.value))) throw new Error('نتیجه خارج از محدوده است.');
  return { formulaId: spec.formulaId, version: spec.version, calculatedAt: new Date().toISOString(), outputs, inputs,
    constants: [{ label: 'ثابت‌های واحد و خلوص تأییدشده؛ فقط در موتور سرور', provenance: 'CONSTANT', version: spec.version }] };
}

