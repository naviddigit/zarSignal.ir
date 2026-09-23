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
import {
  CalculatorAppHeader,
  CalculatorKeypad,
  CalculatorLiveStrip,
  CalculatorPopularRow,
  CalculatorProductTiles,
  WeightConvertWidget,
  popularIcons,
  type CalcProduct,
} from '@/components/calculator-mobile-kit';

type Product = CalcProduct;
type Tool = 'weight' | CalculatorOperation;
type Entry = { value: string; provenance: 'LIVE' | 'MANUAL'; observedAt?: string };
const products: [Product, string][] = [['gold', 'طلا'], ['silver', 'نقره'], ['coin', 'سکه'], ['fx', 'ارز'], ['more', 'بیشتر']];
const toolsByProduct: Record<Product, Tool[]> = {
  gold: ['weight', 'mazanehTo18k', 'market18kToMazaneh', 'goldBubble'],
  silver: [],
  coin: [],
  fx: ['usdGap'],
  more: [],
};
const toolLabel: Record<Tool, string> = {
  weight: 'تبدیل واحد وزن',
  mazanehTo18k: 'مظنه ↔ گرم ۱۸',
  market18kToMazaneh: 'گرم ۱۸ ↔ مظنه',
  goldBubble: 'حباب طلا',
  usdGap: 'فاصله دلار',
};
const popularForGold = [
  { id: 'weight', label: 'تبدیل وزن', Icon: popularIcons.weight },
  { id: 'purity', label: 'تبدیل عیار', Icon: popularIcons.purity, locked: true },
  { id: 'mazanehTo18k', label: 'مظنه ↔ ۱۸', Icon: popularIcons.mazanehTo18k },
  { id: 'goldBubble', label: 'سکه و حباب', Icon: popularIcons.goldBubble },
  { id: 'jewelry', label: 'طلای زینتی', Icon: popularIcons.jewelry, locked: true },
];
const locked: Record<Product, string[]> = {
  gold: ['تبدیل عیار عمومی: در انتظار fixture مصوب', 'طلای زینتی، اجرت و مالیات', 'سود و زیان و مقایسه سرمایه‌گذاری'],
  silver: ['تبدیل عیارهای نقره و محاسبه ارزش نقره داخلی', 'حباب نقره و نسبت طلا به نقره'],
  coin: ['ارزش ذاتی تمام، نیم، ربع و سکه گرمی', 'حباب سکه و هزینه معامله'],
  fx: ['تبدیل عمومی ارز و قیمت', 'سود و زیان معامله ارز'],
  more: ['ابزارهای پیشرفته و حسابداری معامله'],
};
const number = (value: number) => new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 4 }).format(value);

function liveEntry(field: (typeof calculatorCatalog)[CalculatorOperation]['fields'][number], snapshot: Snapshot): Entry {
  const quote = snapshot.quotes.find(q => q.symbol === field.symbol);
  const usable = snapshot.mode === 'live' && quote && !isStale(quote) && quote.currency === field.currency && quote.unit === field.quoteUnit;
  return usable
    ? { value: String((Number(quote.buy) + Number(quote.sell)) / 2), provenance: 'LIVE', observedAt: quote.observedAt }
    : { value: '', provenance: 'MANUAL' };
}

function prefill(operation: CalculatorOperation, snapshot: Snapshot): Record<string, Entry> {
  return Object.fromEntries(calculatorCatalog[operation].fields.map(field => [field.key, liveEntry(field, snapshot)]));
}

export function ProfessionalCalculator({ snapshot }: { snapshot: Snapshot }) {
  const [product, setProduct] = useState<Product>('gold');
  const [tool, setTool] = useState<Tool>('weight');
  const [weightAmount, setWeightAmount] = useState('3.5');
  const [market, setMarket] = useState(snapshot);
  const [inputs, setInputs] = useState<Record<string, Entry>>(() => prefill('mazanehTo18k', snapshot));
  const [result, setResult] = useState<CalculatorResult | null>(null);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const request = useRef<AbortController | null>(null);
  useEffect(() => () => request.current?.abort(), []);
  const available = toolsByProduct[product];
  const operation = tool === 'weight' ? null : tool;
  const spec = operation ? calculatorCatalog[operation] : null;

  function invalidate() { request.current?.abort(); request.current = null; setResult(null); setError(''); setPending(false); }
  function choose(next: Tool) {
    invalidate();
    setTool(next);
    if (next !== 'weight') setInputs(prefill(next, market));
  }
  function chooseProduct(next: Product) {
    invalidate();
    setProduct(next);
    const first = toolsByProduct[next][0];
    if (first) choose(first);
  }

  function setMode(key: string, mode: 'LIVE' | 'MANUAL') {
    if (!spec) return;
    invalidate();
    setInputs(current => {
      const field = spec.fields.find(item => item.key === key);
      if (!field) return current;
      if (mode === 'LIVE') return { ...current, [key]: liveEntry(field, market) };
      return { ...current, [key]: { value: current[key]?.value ?? '', provenance: 'MANUAL' } };
    });
  }

  async function refresh() {
    invalidate();
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    try {
      const next = await fetchJson<Snapshot>('/api/public/markets', controller.signal, 12000);
      if (controller.signal.aborted) return;
      setMarket(next);
      if (spec) {
        setInputs(current => Object.fromEntries(spec.fields.map(field => {
          const existing = current[field.key];
          if (existing?.provenance === 'MANUAL' && existing.value) return [field.key, existing];
          return [field.key, liveEntry(field, next)];
        })));
      }
    } catch { if (!controller.signal.aborted) setError('دریافت بازار ممکن نشد؛ ورود دستی در دسترس است.'); }
    finally { if (request.current === controller) setPending(false); }
  }

  async function calculate(event: React.FormEvent) {
    event.preventDefault();
    if (!operation) return;
    invalidate();
    const controller = new AbortController();
    request.current = controller;
    setPending(true);
    const timeout = window.setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch('/api/public/calculator/professional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          operation,
          inputs: Object.fromEntries(Object.entries(inputs).map(([key, input]) => [key, { provenance: input.provenance, value: Number(input.value) }])),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'محاسبه ممکن نشد.');
      if (request.current === controller && !controller.signal.aborted) setResult(data);
    } catch (e) {
      if (request.current === controller) setError(controller.signal.aborted ? 'پاسخ دیر رسید؛ دوباره تلاش کنید.' : e instanceof Error ? e.message : 'محاسبه ممکن نشد.');
    } finally {
      window.clearTimeout(timeout);
      if (request.current === controller) setPending(false);
    }
  }

  return (
    <section className={`professional-calculator${tool === 'weight' ? ' is-app-screen' : ''}`} aria-label="ماشین‌حساب حرفه‌ای">
      <CalculatorAppHeader live={market.status === 'ok' || market.status === 'stale'} />

      <div className="calc-products calc-products--desktop" role="group" aria-label="نوع دارایی">
        {products.map(([key, label]) => (
          <button type="button" key={key} aria-pressed={product === key} onClick={() => chooseProduct(key)}>{label}</button>
        ))}
      </div>
      <CalculatorProductTiles value={product} onChange={chooseProduct} />

      {available.length ? (
        <>
          {tool === 'weight' ? (
            <WeightConvertWidget amount={weightAmount} onAmountChange={setWeightAmount} />
          ) : (
            <div className="panel calc-workspace">
              <form onSubmit={calculate} className="calc-inputs">
                <Select
                  label="نوع محاسبه"
                  value={operation!}
                  onChange={value => choose(value as CalculatorOperation)}
                  options={available.filter((key): key is CalculatorOperation => key !== 'weight').map(key => ({ value: key, label: calculatorCatalog[key].title }))}
                />
                <div className="calc-source-heading">
                  <span>ورودی‌ها</span>
                  <button type="button" className="text-link" onClick={refresh} disabled={pending}>
                    <RefreshCw size={15} /> تازه‌سازی قیمت بازار
                  </button>
                </div>
                {spec!.fields.map(field => {
                  const input = inputs[field.key] ?? { value: '', provenance: 'MANUAL' as const };
                  const liveAvailable = liveEntry(field, market).provenance === 'LIVE';
                  return (
                    <div className={`calc-entry${input.provenance === 'LIVE' ? ' is-live' : ' is-manual'}`} key={field.key}>
                      <div className="calc-mode" role="radiogroup" aria-label={`منبع ${field.label}`}>
                        <button type="button" role="radio" aria-checked={input.provenance === 'LIVE'} className={input.provenance === 'LIVE' ? 'is-on' : ''} disabled={!liveAvailable} onClick={() => setMode(field.key, 'LIVE')}>
                          ● لحظه‌ای
                        </button>
                        <button type="button" role="radio" aria-checked={input.provenance === 'MANUAL'} className={input.provenance === 'MANUAL' ? 'is-on' : ''} onClick={() => setMode(field.key, 'MANUAL')}>
                          ○ دستی
                        </button>
                      </div>
                      <Input
                        label={field.label}
                        aria-label={field.label}
                        inputMode="decimal"
                        autoComplete="off"
                        dir="ltr"
                        required
                        value={formatNumericInput(input.value)}
                        placeholder="0.00"
                        onChange={event => {
                          invalidate();
                          setInputs(current => ({
                            ...current,
                            [field.key]: { value: sanitizeNumericInput(event.target.value, 6), provenance: 'MANUAL' },
                          }));
                        }}
                      />
                      <div className="calc-input-meta">
                        <span>{field.unit}</span>
                        <span className={`calc-provenance is-${input.provenance.toLowerCase()}`}>
                          {input.provenance === 'LIVE' ? 'LIVE' : 'MANUAL'}
                          {input.provenance === 'LIVE' && input.observedAt ? <> · <RelativeTime value={input.observedAt} /></> : null}
                          {!liveAvailable && input.provenance === 'MANUAL' ? ' · قیمت زنده در دسترس نیست' : null}
                        </span>
                      </div>
                    </div>
                  );
                })}
                <button className="button" type="submit" disabled={pending}>
                  {pending ? 'در حال دریافت نتیجه…' : 'محاسبه'}
                  <ArrowUpLeft size={16} />
                </button>
                {error && <p className="calc-error" role="alert">{error}</p>}
              </form>

              <div className="calc-results" aria-live="polite" aria-busy={pending}>
                <span className="eyebrow"><Calculator size={18} /> نتیجه محاسبه</span>
                {result ? (
                  <>
                    {result.outputs.map(output => (
                      <div className="calc-output" key={output.label}>
                        <span>{output.label}</span>
                        <strong><bdi>{number(output.value)}</bdi><small>{output.unit}</small></strong>
                      </div>
                    ))}
                    <p>خروجی مشتق‌شده از ورودی‌های شما؛ بدون توصیه خرید یا فروش.</p>
                    <details className="calc-details">
                      <summary>جزئیات منبع و محاسبه</summary>
                      <p>نسخه {result.version} · <bdi>{result.formulaId}</bdi></p>
                      <p>زمان محاسبه: <RelativeTime value={result.calculatedAt} /></p>
                      {result.inputs.map(input => (
                        <div key={input.key}>
                          <strong>{input.label}</strong>
                          <p><bdi>{number(input.value)}</bdi> {input.unit} · {input.provenance} · {input.source}</p>
                          {input.observedAt
                            ? <time dateTime={input.observedAt}>{new Date(input.observedAt).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' })}</time>
                            : <small>زمان بازار ندارد؛ مقدار دستی است.</small>}
                        </div>
                      ))}
                      {result.constants.map(constant => (
                        <p key={constant.label}>{constant.provenance} · {constant.label} · نسخه {constant.version}</p>
                      ))}
                    </details>
                  </>
                ) : (
                  <div className="calc-result-empty">
                    <Calculator size={38} />
                    <h2>{pending ? 'در حال محاسبه' : 'نتیجه، همین‌جا'}</h2>
                    <p>منبع را لحظه‌ای یا دستی انتخاب کنید، سپس محاسبه را بزنید.</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {product === 'gold' ? (
            <CalculatorPopularRow
              items={popularForGold}
              active={tool}
              onPick={id => {
                if (id === 'purity' || id === 'jewelry') return;
                choose(id as Tool);
              }}
            />
          ) : (
            <div className="calc-popular calc-popular--chips" aria-label="محاسبات محبوب">
              <div className="calc-popular__chips">
                {available.map(key => (
                  <button type="button" key={key} className={tool === key ? 'is-on' : ''} onClick={() => choose(key)}>
                    {toolLabel[key]}
                  </button>
                ))}
              </div>
            </div>
          )}

          <CalculatorLiveStrip snapshot={market} />

          {tool === 'weight' ? (
            <div className="calc-keypad-wrap">
              <CalculatorKeypad value={weightAmount} onChange={setWeightAmount} />
            </div>
          ) : null}
        </>
      ) : (
        <div className="panel calc-locked">
          <LockKeyhole size={28} />
          <h2>در حال تکمیل داده/فرمول</h2>
          <p>ابزارهای این بخش پس از تأیید مدل و آزمون عددی فعال می‌شوند.</p>
          <CalculatorLiveStrip snapshot={market} />
        </div>
      )}

      <aside className="calc-coming">
        <h2>ابزارهای در حال تکمیل</h2>
        {locked[product].map(label => (
          <div key={label}><LockKeyhole size={15} /><span>{label}</span><small>در حال تکمیل داده/فرمول</small></div>
        ))}
      </aside>
    </section>
  );
}
