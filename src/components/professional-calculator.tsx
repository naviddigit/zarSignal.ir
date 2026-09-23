'use client';
import { useEffect, useRef, useState } from 'react';
import { Calculator, LockKeyhole, RefreshCw, ArrowUpLeft } from 'lucide-react';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/field';
import { RelativeTime } from '@/components/relative-time';
import { calculatorCatalog, type CalculatorOperation, type CalculatorResult } from '@/lib/calculator-catalog';
import { isStale, type Snapshot } from '@/lib/market';
import { formatNumericInput, sanitizeNumericInput } from '@/lib/numeric-input';
import { fetchJson } from '@/lib/fetch-json';

type Product = 'gold' | 'silver' | 'coin' | 'fx';
type Entry = { value: string; provenance: 'LIVE' | 'MANUAL'; observedAt?: string };
const products: [Product, string][] = [['gold', 'طلا'], ['silver', 'نقره'], ['coin', 'سکه'], ['fx', 'ارز']];
const toolsByProduct: Record<Product, CalculatorOperation[]> = { gold: ['mazanehTo18k', 'market18kToMazaneh', 'goldBubble'], silver: [], coin: [], fx: ['usdGap'] };
const locked: Record<Product, string[]> = {
  gold: ['تبدیل عمومی وزن و عیار: در انتظار تأیید نهایی نمونه‌ها و گردکردن', 'طلای زینتی، اجرت و مالیات', 'سود و زیان و مقایسه سرمایه‌گذاری'],
  silver: ['تبدیل عیارهای نقره و محاسبه ارزش نقره داخلی', 'حباب نقره و نسبت طلا به نقره'],
  coin: ['ارزش ذاتی تمام، نیم، ربع و سکه گرمی', 'حباب سکه و هزینه معامله'],
  fx: ['تبدیل عمومی ارز و قیمت', 'سود و زیان معامله ارز'],
};
const number = (value: number) => new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 4 }).format(value);

function prefill(operation: CalculatorOperation, snapshot: Snapshot): Record<string, Entry> {
  return Object.fromEntries(calculatorCatalog[operation].fields.map(field => {
    const quote = snapshot.quotes.find(q => q.symbol === field.symbol);
    const usable = snapshot.mode === 'live' && quote && !isStale(quote) && quote.currency === field.currency && quote.unit === field.quoteUnit;
    return [field.key, usable ? { value: String((Number(quote.buy) + Number(quote.sell)) / 2), provenance: 'LIVE', observedAt: quote.observedAt } : { value: '', provenance: 'MANUAL' }];
  }));
}

export function ProfessionalCalculator({ snapshot }: { snapshot: Snapshot }) {
  const [product, setProduct] = useState<Product>('gold');
  const [operation, setOperation] = useState<CalculatorOperation>('mazanehTo18k');
  const [market, setMarket] = useState(snapshot);
  const [inputs, setInputs] = useState<Record<string, Entry>>(() => prefill('mazanehTo18k', snapshot));
  const [result, setResult] = useState<CalculatorResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const spec = calculatorCatalog[operation];
  const available = toolsByProduct[product];
  function invalidate() { request.current?.abort(); request.current = null; setResult(null); setError(''); setPending(false); }
  function choose(next: CalculatorOperation) { invalidate(); setOperation(next); setInputs(prefill(next, market)); }
  function chooseProduct(next: Product) { invalidate(); setProduct(next); if (toolsByProduct[next][0]) choose(toolsByProduct[next][0]); }
  async function refresh() {
    invalidate(); const controller = new AbortController(); request.current = controller; setPending(true);
    try {
      const next = await fetchJson<Snapshot>('/api/public/markets', controller.signal, 12000);
      if (controller.signal.aborted) return;
      setMarket(next); setInputs(prefill(operation, next));
    } catch { if (!controller.signal.aborted) setError('دریافت بازار ممکن نشد؛ ورود دستی در دسترس است.'); }
    finally { if (request.current === controller) setPending(false); }
  }
  async function calculate(event: React.FormEvent) {
    event.preventDefault(); invalidate(); const controller = new AbortController(); request.current = controller; setPending(true);
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('/api/public/calculator/professional', { method: 'POST', headers: { 'Content-Type': 'application/json' }, signal: controller.signal,
        body: JSON.stringify({ operation, inputs: Object.fromEntries(Object.entries(inputs).map(([key, input]) => [key, { provenance: input.provenance, value: Number(input.value) }])) }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'محاسبه ممکن نشد.');
      if (request.current === controller && !controller.signal.aborted) setResult(data);
    } catch (e) { if (request.current === controller) setError(controller.signal.aborted ? 'پاسخ دیر رسید؛ دوباره تلاش کنید.' : e instanceof Error ? e.message : 'محاسبه ممکن نشد.'); }
    finally { window.clearTimeout(timeout); if (request.current === controller) setPending(false); }
  }
  return <section className="professional-calculator" aria-label="ماشین‌حساب حرفه‌ای">
    <div className="calc-products" role="group" aria-label="نوع دارایی">{products.map(([key, label]) => <button type="button" key={key} aria-pressed={product === key} onClick={() => chooseProduct(key)}>{label}</button>)}</div>
    {available.length ? <div className="panel calc-workspace">
      <form onSubmit={calculate} className="calc-inputs">
        <Select label="نوع محاسبه" value={operation} onChange={value => choose(value as CalculatorOperation)} options={available.map(key => ({ value: key, label: calculatorCatalog[key].title }))}/>
        <div className="calc-source-heading"><span>ورودی‌ها</span><button type="button" className="text-link" onClick={refresh} disabled={pending}><RefreshCw size={15}/> دریافت قیمت‌های بازار</button></div>
        {spec.fields.map(field => {
          const input = inputs[field.key] ?? { value: '', provenance: 'MANUAL' };
          return <div className="calc-entry" key={field.key}>
            <Input label={field.label} aria-label={field.label} inputMode="decimal" autoComplete="off" dir="ltr" required value={formatNumericInput(input.value)} placeholder="0.00" onChange={event => { invalidate(); setInputs(current => ({ ...current, [field.key]: { value: sanitizeNumericInput(event.target.value, 6), provenance: 'MANUAL' } })); }}/>
            <div className="calc-input-meta"><span>{field.unit}</span><span>{input.provenance === 'LIVE' ? 'زنده · LIVE' : 'دستی · MANUAL'} {input.observedAt && <RelativeTime value={input.observedAt}/>}</span></div>
          </div>;
        })}
        <button className="button" type="submit" disabled={pending}>{pending ? 'در حال دریافت نتیجه…' : 'محاسبه'}<ArrowUpLeft size={16}/></button>
        {error && <p className="calc-error" role="alert">{error}</p>}
      </form>
      <div className="calc-results" aria-live="polite" aria-busy={pending}>
        <span className="eyebrow"><Calculator size={18}/> نتیجه محاسبه</span>
        {result ? <>{result.outputs.map(output => <div className="calc-output" key={output.label}><span>{output.label}</span><strong><bdi>{number(output.value)}</bdi><small>{output.unit}</small></strong></div>)}
          <p>خروجی مشتق‌شده از ورودی‌های شما؛ بدون توصیه خرید یا فروش.</p>
          <details className="calc-details"><summary>جزئیات منبع و محاسبه</summary><p>نسخه {result.version} · <bdi>{result.formulaId}</bdi></p><p>زمان محاسبه: <RelativeTime value={result.calculatedAt}/></p>
            {result.inputs.map(input => <div key={input.key}><strong>{input.label}</strong><p><bdi>{number(input.value)}</bdi> {input.unit} · {input.provenance} · {input.source}</p>{input.observedAt ? <time dateTime={input.observedAt}>{new Date(input.observedAt).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' })}</time> : <small>زمان بازار ندارد؛ مقدار دستی است.</small>}</div>)}
            {result.constants.map(constant => <p key={constant.label}>{constant.provenance} · {constant.label} · نسخه {constant.version}</p>)}
          </details></> : <div className="calc-result-empty"><Calculator size={38}/><h2>{pending ? 'در حال محاسبه' : 'نتیجه، همین‌جا'}</h2><p>ورودی‌ها را بررسی کنید و محاسبه را بزنید. قیمت دستی همیشه در اختیار شماست.</p></div>}
      </div>
    </div> : <div className="panel calc-locked"><LockKeyhole size={28}/><h2>در حال تکمیل داده/فرمول</h2><p>ابزارهای این بخش پس از تأیید مدل و آزمون عددی فعال می‌شوند.</p></div>}
    <aside className="calc-coming"><h2>ابزارهای در حال تکمیل</h2>{locked[product].map(label => <div key={label}><LockKeyhole size={15}/><span>{label}</span><small>در حال تکمیل داده/فرمول</small></div>)}</aside>
  </section>;
}
