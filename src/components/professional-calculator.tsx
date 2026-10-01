'use client';
import { useEffect, useRef, useState } from 'react';
import { LockKeyhole, RefreshCw, ArrowUpLeft } from 'lucide-react';
import { calculatorCatalog, type CalculatorOperation, type CalculatorResult } from '@/lib/calculator-catalog';
import { isStale, type Quote, type Snapshot } from '@/lib/market';
import { formatNumericInput, sanitizeNumericInput } from '@/lib/numeric-input';
import { fetchJson } from '@/lib/fetch-json';
import { mazanehTo18k } from '@/lib/mazaneh-to-18k';
import { track } from '@/lib/analytics';
import { OverlaySheet } from '@/components/ui/overlay-sheet';
import {
  CalculatorKeypad,
  CalculatorLiveStrip,
  CalculatorPopularRow,
  CalculatorProductTiles,
  PurityConvertWidget,
  WeightConvertWidget,
  popularIcons,
  type CalcProduct,
} from '@/components/calculator-mobile-kit';

type Product = CalcProduct;
type LocalTool = 'weight' | 'purity';
type Tool = LocalTool | CalculatorOperation;
type Entry = { value: string; provenance: 'LIVE' | 'MANUAL'; observedAt?: string };
type PopularPick = { id: string; label: string; Icon: typeof popularIcons.weight; locked?: boolean };

const products: [Product, string][] = [['gold', 'طلا'], ['silver', 'نقره'], ['fx', 'دلار'], ['coin', 'سکه']];
const toolsByProduct: Record<Product, Tool[]> = {
  gold: ['weight', 'mazanehTo18k', 'market18kToMazaneh', 'goldBubble', 'purity'],
  silver: ['weight', 'silverBubble', 'purity'],
  fx: ['usdGap'],
  coin: ['weight', 'purity'],
};
/** Default open tool — تبدیل وزن کاربردی‌ترین ورودی عمومی است. */
const DEFAULT_TOOL: Tool = 'weight';
const lockedProducts: Product[] = [];
const popularByProduct: Record<Product, PopularPick[]> = {
  gold: [
    { id: 'weight', label: 'تبدیل وزن', Icon: popularIcons.weight },
    { id: 'market18kToMazaneh', label: '۱۸ به مظنه', Icon: popularIcons.market18kToMazaneh },
    { id: 'mazanehTo18k', label: 'مظنه ÷ ۴٫۳۳۱۸', Icon: popularIcons.mazanehTo18k },
    { id: 'goldBubble', label: 'حباب طلا', Icon: popularIcons.goldBubble },
    { id: 'purity', label: 'تبدیل عیار', Icon: popularIcons.purity },
    { id: 'jewelry', label: 'طلای زینتی', Icon: popularIcons.jewelry, locked: true },
  ],
  silver: [
    { id: 'weight', label: 'تبدیل وزن', Icon: popularIcons.weight },
    { id: 'silverBubble', label: 'حباب نقره', Icon: popularIcons.silverBubble },
    { id: 'purity', label: 'عیار نقره', Icon: popularIcons.purity },
    { id: 'ratio', label: 'نسبت طلا/نقره', Icon: popularIcons.ratio, locked: true },
    { id: 'jewelry', label: 'زیور نقره', Icon: popularIcons.jewelry, locked: true },
  ],
  fx: [
    { id: 'usdGap', label: 'فاصله دلار', Icon: popularIcons.usdGap },
    { id: 'fxConvert', label: 'مبدل ارز', Icon: popularIcons.usdGap, locked: true },
  ],
  coin: [
    { id: 'weight', label: 'تبدیل وزن', Icon: popularIcons.weight },
    { id: 'purity', label: 'تبدیل عیار', Icon: popularIcons.purity },
    { id: 'sekeBubble', label: 'حباب سکه', Icon: popularIcons.coin, locked: true },
    { id: 'robSeke', label: 'ربع سکه', Icon: popularIcons.coin, locked: true },
    { id: 'nimSeke', label: 'نیم سکه', Icon: popularIcons.coin, locked: true },
  ],
};
const number = (value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(value);
const isLocalTool = (tool: Tool): tool is LocalTool => tool === 'weight' || tool === 'purity';
const isOperation = (tool: Tool): tool is CalculatorOperation => !isLocalTool(tool) && tool in calculatorCatalog;

function midQuote(quote: Quote) {
  const mid = (Number(quote.buy) + Number(quote.sell)) / 2;
  return Number.isFinite(mid) && mid > 0 ? mid : null;
}

/** Resolve a live calculator field from market quotes. ۱۸ عیار همیشه از مظنه ÷ ۴٫۳۳۱۸. */
function liveEntry(field: (typeof calculatorCatalog)[CalculatorOperation]['fields'][number], snapshot: Snapshot, allowStale = true): Entry {
  if (snapshot.mode !== 'live') return { value: '', provenance: 'MANUAL' };

  if (field.symbol === 'GOLD_18K') {
    const melted = snapshot.quotes.find(q => q.symbol === 'GOLD_MELTED');
    if (melted && (allowStale || !isStale(melted)) && melted.currency === 'TMN') {
      const mid = midQuote(melted);
      if (mid != null) {
        try {
          const derived = mazanehTo18k(mid).market18k;
          return { value: String(Math.round(derived * 100) / 100), provenance: 'LIVE', observedAt: melted.observedAt };
        } catch { /* fall through */ }
      }
    }
  }

  const quote = snapshot.quotes.find(q => q.symbol === field.symbol);
  if (quote && (allowStale || !isStale(quote)) && quote.currency === field.currency && quote.unit === field.quoteUnit) {
    const mid = midQuote(quote);
    if (mid != null) return { value: String(mid), provenance: 'LIVE', observedAt: quote.observedAt };
  }

  return { value: '', provenance: 'MANUAL' };
}

function prefill(operation: CalculatorOperation, snapshot: Snapshot): Record<string, Entry> {
  return Object.fromEntries(calculatorCatalog[operation].fields.map(field => [field.key, liveEntry(field, snapshot)]));
}

export function ProfessionalCalculator({ snapshot }: { snapshot: Snapshot }) {
  const [product, setProduct] = useState<Product>('gold');
  const [tool, setTool] = useState<Tool>(DEFAULT_TOOL);
  const [weightAmount, setWeightAmount] = useState('3.5');
  const [purityAmount, setPurityAmount] = useState('');
  const [market, setMarket] = useState(snapshot);
  const [inputs, setInputs] = useState<Record<string, Entry>>(() => prefill('mazanehTo18k', snapshot));
  const [result, setResult] = useState<CalculatorResult | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [activeField, setActiveField] = useState('');
  const [keypadCue, setKeypadCue] = useState(false);
  const request = useRef<AbortController | null>(null);
  const cueTimer = useRef<number | null>(null);
  useEffect(() => () => {
    request.current?.abort();
    if (cueTimer.current) window.clearTimeout(cueTimer.current);
  }, []);

  function flashKeypadCue() {
    setKeypadCue(false);
    requestAnimationFrame(() => {
      setKeypadCue(true);
      if (cueTimer.current) window.clearTimeout(cueTimer.current);
      cueTimer.current = window.setTimeout(() => setKeypadCue(false), 4100);
    });
  }

  const available = toolsByProduct[product];
  const operation = isOperation(tool) ? tool : null;
  const spec = operation ? calculatorCatalog[operation] : null;
  const popular = popularByProduct[product];

  function invalidate() {
    request.current?.abort();
    request.current = null;
    setResult(null);
    setResultOpen(false);
    setError('');
    setPending(false);
  }

  function choose(next: Tool, forProduct: Product = product) {
    const allowed = toolsByProduct[forProduct];
    if (!allowed.includes(next)) return;
    invalidate();
    setTool(next);
    if (isLocalTool(next)) {
      setActiveField('');
      return;
    }
    setActiveField(calculatorCatalog[next].fields[0].key);
    setInputs(prefill(next, market));
  }

  function chooseProduct(next: Product) {
    if (lockedProducts.includes(next)) return;
    invalidate();
    setProduct(next);
    const first = toolsByProduct[next][0];
    if (first) choose(first, next);
  }

  function pickPopular(id: string) {
    const item = popular.find(entry => entry.id === id);
    if (!item || item.locked) return;
    if (available.includes(id as Tool)) choose(id as Tool);
  }

  function setMode(key: string, mode: 'LIVE' | 'MANUAL') {
    if (!spec) return;
    invalidate();
    setActiveField(key);
    setInputs(current => {
      const field = spec.fields.find(item => item.key === key);
      if (!field) return current;
      if (mode === 'LIVE') return { ...current, [key]: liveEntry(field, market) };
      // Manual: reset to 0; thin cue on keypad tells user where to type.
      return { ...current, [key]: { value: '0', provenance: 'MANUAL' } };
    });
    if (mode === 'MANUAL') flashKeypadCue();
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
    } catch {
      if (!controller.signal.aborted) setError('دریافت بازار ممکن نشد؛ ورود دستی در دسترس است.');
    } finally {
      if (request.current === controller) setPending(false);
    }
  }

  async function calculate(event: React.FormEvent) {
    event.preventDefault();
    if (!operation) return;
    // Do not wipe inputs / live availability — only cancel prior request.
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    setError('');
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
      if (request.current === controller && !controller.signal.aborted) {
        setResult(data);
        setResultOpen(true);
        track('calculator_complete', { operation: tool });
      }
    } catch (e) {
      if (request.current === controller) {
        setError(controller.signal.aborted ? 'پاسخ دیر رسید؛ دوباره تلاش کنید.' : e instanceof Error ? e.message : 'محاسبه ممکن نشد.');
      }
    } finally {
      window.clearTimeout(timeout);
      if (request.current === controller) setPending(false);
    }
  }

  const keypadValue = tool === 'weight' ? weightAmount : tool === 'purity' ? purityAmount : inputs[activeField]?.value ?? '';
  const keypadTarget = tool === 'weight'
    ? 'مقدار وزن'
    : tool === 'purity'
      ? 'قیمت عیار'
      : spec?.fields.find(field => field.key === activeField)?.label ?? 'ورودی را انتخاب کنید';

  return (
    <section className={`professional-calculator${isLocalTool(tool) ? ' is-weight' : ''}`} aria-label="ماشین‌حساب حرفه‌ای">
      <div className="calc-products" role="group" aria-label="نوع دارایی">
        {products.map(([key, label]) => (
          <button
            type="button"
            key={key}
            aria-pressed={product === key}
            disabled={lockedProducts.includes(key)}
            onClick={() => chooseProduct(key)}
          >
            {label}
          </button>
        ))}
      </div>
      <CalculatorProductTiles value={product} onChange={chooseProduct} locked={lockedProducts} />

      <CalculatorPopularRow items={popular} active={tool} onPick={pickPopular} />

      <div className="calc-stage__main">
        {tool === 'weight' ? (
          <WeightConvertWidget amount={weightAmount} onAmountChange={setWeightAmount} />
        ) : tool === 'purity' ? (
          <PurityConvertWidget amount={purityAmount} onAmountChange={setPurityAmount} />
        ) : spec ? (
          <form className="calc-tool-panel" onSubmit={calculate}>
            <div className="calc-tool-panel__toolbar">
              <strong className="calc-tool-panel__title">{spec.title}</strong>
              <button type="button" className="calc-tool-panel__refresh" onClick={refresh} disabled={pending} aria-label="تازه‌سازی قیمت‌ها">
                <RefreshCw size={15} />
              </button>
            </div>
            {spec.fields.map(field => {
              const input = inputs[field.key] ?? { value: '', provenance: 'MANUAL' as const };
              // Keep «لحظه‌ای» clickable whenever market feed is live — stale quotes still fill.
              const liveAvailable = market.mode === 'live' && liveEntry(field, market, true).provenance === 'LIVE';
              return (
                <div className={`calc-tool-panel__field${input.provenance === 'LIVE' ? ' is-live' : ' is-manual'}`} key={field.key}>
                  <div className="calc-tool-panel__head">
                    <span className="calc-tool-panel__label">{field.label}</span>
                    <div className="calc-mode" role="radiogroup" aria-label={`منبع ${field.label}`}>
                      <button type="button" role="radio" aria-checked={input.provenance === 'LIVE'} className={input.provenance === 'LIVE' ? 'is-on' : ''} disabled={!liveAvailable} onClick={() => setMode(field.key, 'LIVE')}>
                        لحظه‌ای
                      </button>
                      <button type="button" role="radio" aria-checked={input.provenance === 'MANUAL'} className={input.provenance === 'MANUAL' ? 'is-on' : ''} onClick={() => setMode(field.key, 'MANUAL')}>
                        دستی
                      </button>
                    </div>
                  </div>
                  <div className="calc-tool-panel__control">
                    <input
                      className="ds-input"
                      inputMode="none"
                      onFocus={() => setActiveField(field.key)}
                      data-active={activeField === field.key}
                      autoComplete="off"
                      dir="ltr"
                      required
                      aria-label={field.label}
                      value={formatNumericInput(input.value)}
                      placeholder="0"
                      onChange={event => {
                        invalidate();
                        setInputs(current => ({
                          ...current,
                          [field.key]: { value: sanitizeNumericInput(event.target.value, 6), provenance: 'MANUAL' },
                        }));
                      }}
                    />
                    <span className="calc-tool-panel__unit">{field.unit}</span>
                  </div>
                </div>
              );
            })}
            <button className="button calc-tool-panel__go" type="submit" disabled={pending}>
              {pending ? 'در حال محاسبه…' : 'محاسبه'}
              <ArrowUpLeft size={15} />
            </button>
            {error ? <p className="calc-error" role="alert">{error}</p> : null}
            {result ? (
              <div className="calc-result-panel calc-result-panel--desktop" aria-live="polite">
                <strong>نتیجه</strong>
                {result.outputs.map(output => (
                  <div className="calc-result-panel__row" key={output.label}>
                    <span>{output.label}</span>
                    <bdi dir="ltr">{number(output.value)} <small>{output.unit}</small></bdi>
                  </div>
                ))}
                <small className="calc-result-panel__ver">{result.formulaId} · {result.version}</small>
              </div>
            ) : null}
          </form>
        ) : (
          <div className="calc-tool-panel calc-tool-panel--locked">
            <LockKeyhole size={22} />
            <strong>هنوز فعال نیست</strong>
            <p>این ابزار بعد از تأیید فرمول و منبع منتشر می‌شود.</p>
          </div>
        )}
        <CalculatorLiveStrip snapshot={market} />
      </div>

      <div className="calc-stage__side">
        <div className={`calc-keypad-wrap${keypadCue ? ' is-keypad-cue' : ''}`}>
          <span className="calc-entry-target">{keypadTarget}</span>
          <CalculatorKeypad key={`${tool}-${activeField}`} value={keypadValue} onChange={value => {
            if (tool === 'weight') { setWeightAmount(value); return; }
            if (tool === 'purity') { setPurityAmount(value); return; }
            if (!activeField) return;
            invalidate();
            setInputs(current => ({ ...current, [activeField]: { value, provenance: 'MANUAL' } }));
          }} />
        </div>
      </div>

      <OverlaySheet
        open={resultOpen && !!result}
        title="نتیجه محاسبه"
        onClose={() => setResultOpen(false)}
      >
        {result ? (
          <div className="ds-overlay__result" aria-live="polite">
            {result.outputs.map(output => (
              <div className="ds-overlay__result-row" key={output.label}>
                <span>{output.label}</span>
                <strong dir="ltr">
                  <bdi>{number(output.value)}</bdi>
                  <small>{output.unit}</small>
                </strong>
              </div>
            ))}
          </div>
        ) : null}
      </OverlaySheet>
    </section>
  );
}
