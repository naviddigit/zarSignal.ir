import { calculatorCatalog, type CalculatorOperation, type CalculatorResult } from '@/lib/calculator-catalog';
import { isStale, type Snapshot } from '@/lib/market';
import { mazanehTo18k, market18kToMazaneh } from './mazaneh-to-18k';
import { goldBubble, usdGap } from './bubble-formulas';

export function calculateProfessional(body: unknown, snapshot: Snapshot): CalculatorResult {
  if (!body || typeof body !== 'object') throw new Error('ورودی معتبر نیست.');
  const request = body as { operation: CalculatorOperation; inputs: Record<string, { provenance: string; value?: unknown }> };
  if (!Object.hasOwn(calculatorCatalog, request.operation) || !request.inputs || typeof request.inputs !== 'object') throw new Error('این محاسبه فعال نیست.');
  const spec = calculatorCatalog[request.operation];
  const inputs: CalculatorResult['inputs'] = spec.fields.map(field => {
    const input = request.inputs[field.key];
    if (!input || !['LIVE', 'MANUAL'].includes(input.provenance)) throw new Error('منبع هر ورودی را مشخص کنید.');
    if (input.provenance === 'LIVE') {
      const quote = snapshot.quotes.find(q => q.symbol === field.symbol);
      if (snapshot.mode !== 'live' || !quote || isStale(quote) || quote.currency !== field.currency || quote.unit !== field.quoteUnit) throw new Error('داده تازه و هم‌واحد در دسترس نیست؛ مقدار دستی وارد کنید.');
      const bid = Number(quote.buy), ask = Number(quote.sell);
      if (![bid, ask].every(n => Number.isFinite(n) && n > 0) || bid > ask) throw new Error('قیمت منبع معتبر نیست.');
      return { key: field.key, label: field.label, value: (bid + ask) / 2, unit: field.unit, provenance: 'LIVE', observedAt: quote.observedAt, source: 'زرسیگنال · میانگین دو سمت یا قیمت دیده‌بان' };
    }
    if (typeof input.value !== 'number' || !Number.isFinite(input.value) || input.value <= 0 || input.value > 1e15) throw new Error('برای هر ورودی عدد مثبت و معتبر وارد کنید.');
    return { key: field.key, label: field.label, value: input.value, unit: field.unit, provenance: 'MANUAL', observedAt: null, source: 'ورودی شما' };
  });
  const liveTimes = inputs.filter(i => i.observedAt).map(i => Date.parse(i.observedAt!));
  if (liveTimes.length > 1 && Math.max(...liveTimes) - Math.min(...liveTimes) > 15 * 60_000) throw new Error('زمان ورودی‌های زنده هم‌خوان نیست.');
  const v = Object.fromEntries(inputs.map(i => [i.key, i.value]));
  let outputs: CalculatorResult['outputs'];
  if (request.operation === 'mazanehTo18k') outputs = [{ label: 'قیمت مشتق گرم ۱۸ عیار', value: mazanehTo18k(v.melted).market18k, unit: 'تومان / گرم' }];
  else if (request.operation === 'market18kToMazaneh') outputs = [{ label: 'مظنه محاسبه‌شده', value: market18kToMazaneh(v.gram), unit: 'تومان / مثقال' }];
  else {
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

