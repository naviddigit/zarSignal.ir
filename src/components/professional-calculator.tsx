'use client';
import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { LockKeyhole, RefreshCw, ArrowUpLeft } from 'lucide-react';
import { calculatorCatalog, type CalculatorOperation, type CalculatorResult } from '@/lib/calculator-catalog';
import {
  decideCalculatorModuleAccess,
  type CalculatorAccessPolicy,
  type CalculatorModule,
} from '@/lib/calculator-access';
import type { AccessLevel } from '@/lib/capabilities';
import { isStale, type Quote, type Snapshot } from '@/lib/market';
import { formatNumericInput, sanitizeNumericInput } from '@/lib/numeric-input';
import { fetchJson } from '@/lib/fetch-json';
import { mazanehTo18k } from '@/lib/mazaneh-to-18k';
import { track } from '@/lib/analytics';
import { OverlaySheet } from '@/components/ui/overlay-sheet';
import {
  CalculatorKeypad,
  CalculatorLiveStrip,
  MarketMesghalEquivalentWidget,
  CalculatorPopularRow,
  CalculatorProductTiles,
  PurityConvertWidget,
  WeightConvertWidget,
  popularIcons,
  type CalcProduct,
} from '@/components/calculator-mobile-kit';

type Product = CalcProduct;
type LocalTool = 'marketWeight' | 'weight' | 'purity';
type Tool = LocalTool | CalculatorOperation;
type Entry = { value: string; provenance: 'LIVE' | 'MANUAL'; observedAt?: string };
type PopularPick = { id: string; label: string; Icon: typeof popularIcons.weight; locked?: boolean };

const products: [Product, string][] = [['gold', 'طلا'], ['silver', 'نقره'], ['fx', 'دلار'], ['coin', 'سکه']];
const toolsByProduct: Record<Product, Tool[]> = {
  gold: ['marketWeight', 'weight', 'purity', 'mazanehTo18k', 'market18kToMazaneh', 'fineGold', 'goldBubble', 'uaeGold', 'capitalGold', 'meltedPnl', 'meltedTarget', 'meltedNewBuy', 'meltedTargetAverage', 'meltedPartialSell', 'meltedBreakEven', 'goldSilverSwap', 'percentageChange'],
  silver: ['weight', 'purity', 'fineSilver', 'silverBarCost', 'silverMintPremium', 'capitalSilver', 'silverBubble', 'goldSilverSwap', 'percentageChange'],
  fx: ['usdGap', 'aedDerivedUsd', 'fxRateGap', 'rateCompare', 'percentageChange'],
  coin: ['coinBuy', 'coinSell', 'coinCapital', 'coinPnl', 'coinBreakEven', 'weight', 'purity', 'percentageChange'],
};
const toolLabel = (value: Tool) => value === 'marketWeight' ? 'گرم ۱۸ ↔ مثقال عرفی' : value === 'weight' ? 'تبدیل وزن فیزیکی' : value === 'purity' ? 'تبدیل عیار و وزن خالص' : calculatorCatalog[value].title;
const DEFAULT_TOOL: Tool = 'marketWeight';
const lockedProducts: Product[] = [];
const popularByProduct: Record<Product, PopularPick[]> = {
  gold: [
    { id: 'marketWeight', label: 'گرم ۱۸ ↔ مثقال عرفی', Icon: popularIcons.weight },
    { id: 'weight', label: 'تبدیل وزن فیزیکی', Icon: popularIcons.weight },
    { id: 'mazaneh', label: 'مظنه ↔ گرم ۱۸', Icon: popularIcons.mazanehTo18k },
    { id: 'goldBubble', label: 'حباب طلا', Icon: popularIcons.goldBubble },
    { id: 'fineGold', label: 'طلای خالص', Icon: popularIcons.purity },
    { id: 'meltedPnl', label: 'سود و زیان آب‌شده', Icon: popularIcons.goldBubble },
    { id: 'capitalGold', label: 'سرمایه به طلا', Icon: popularIcons.mazanehTo18k },
  ],
  silver: [
    { id: 'weight', label: 'تبدیل وزن', Icon: popularIcons.weight },
    { id: 'silverBubble', label: 'حباب نقره', Icon: popularIcons.silverBubble },
    { id: 'fineSilver', label: 'نقره خالص', Icon: popularIcons.purity },
    { id: 'silverBarCost', label: 'شمش نقره', Icon: popularIcons.silverBubble },
    { id: 'goldSilverSwap', label: 'تبدیل طلا به نقره', Icon: popularIcons.ratio },
    { id: 'capitalSilver', label: 'سرمایه به نقره', Icon: popularIcons.silverBubble },
  ],
  fx: [
    { id: 'usdGap', label: 'فاصله دلار', Icon: popularIcons.usdGap },
    { id: 'fxRateGap', label: 'مقایسه نرخ‌ها', Icon: popularIcons.ratio },
    { id: 'aedDerivedUsd', label: 'دلار درهمی', Icon: popularIcons.usdGap },
  ],
  coin: [
    { id: 'coinBuy', label: 'هزینه خرید', Icon: popularIcons.coin },
    { id: 'coinSell', label: 'خالص فروش', Icon: popularIcons.coin },
    { id: 'coinBreakEven', label: 'سربه‌سر', Icon: popularIcons.coin },
    { id: 'coinCapital', label: 'سرمایه به سکه', Icon: popularIcons.coin },
    { id: 'coinPnl', label: 'سود و زیان', Icon: popularIcons.goldBubble },
  ],
};
const number = (value: number) => new Intl.NumberFormat('en-US', { maximumFractionDigits: 4 }).format(value);
const isLocalTool = (tool: string): tool is LocalTool => tool === 'marketWeight' || tool === 'weight' || tool === 'purity';
const isOperation = (tool: string): tool is CalculatorOperation => !isLocalTool(tool) && tool in calculatorCatalog;
const isMazanehOperation = (tool: Tool) => tool === 'mazanehTo18k' || tool === 'market18kToMazaneh';

function ResultDetails({ result }: { result: CalculatorResult }) {
  return <details className="calc-result-details">
    <summary>ورودی‌ها و منبع محاسبه</summary>
    <div>
      {result.inputs.map(input => <p key={input.key}>
        <span>{input.label}</span>
        <bdi dir="ltr">{number(input.value)} {input.unit}</bdi>
        <small>{input.provenance === 'LIVE' ? `داده بازار · ${input.observedAt ? new Date(input.observedAt).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' }) : ''}` : 'ورودی دستی'}</small>
      </p>)}
      <small>فرمول {result.formulaId} · نسخه {result.version} · زمان محاسبه {new Date(result.calculatedAt).toLocaleString('fa-IR', { timeZone: 'Asia/Tehran' })}</small>
    </div>
  </details>;
}

function midQuote(quote: Quote) {
  const buy = Number(quote.buy);
  const sell = Number(quote.sell);
  if (buy > 0 && sell > 0) return buy <= sell ? (buy + sell) / 2 : null;
  return buy > 0 ? buy : sell > 0 ? sell : null;
}

/** Resolve a live calculator field from market quotes. ۱۸ عیار همیشه از مظنه ÷ ۴٫۳۳۱۸. */
function liveEntry(field: (typeof calculatorCatalog)[CalculatorOperation]['fields'][number], snapshot: Snapshot): Entry {
  if (snapshot.mode !== 'live' || !field.symbol) return { value: field.allowZero ? '0' : '', provenance: 'MANUAL' };

  if (field.symbol === 'GOLD_18K') {
    const melted = snapshot.quotes.find(q => q.symbol === 'GOLD_MELTED');
    if (melted && !isStale(melted) && melted.currency === 'TMN') {
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
  if (quote && !isStale(quote) && quote.currency === field.currency && quote.unit === field.quoteUnit) {
    const mid = midQuote(quote);
    if (mid != null) return { value: String(mid), provenance: 'LIVE', observedAt: quote.observedAt };
  }

  return { value: field.allowZero ? '0' : '', provenance: 'MANUAL' };
}

function prefill(operation: CalculatorOperation, snapshot: Snapshot): Record<string, Entry> {
  return Object.fromEntries(calculatorCatalog[operation].fields.map(field => [field.key, liveEntry(field, snapshot)]));
}

export function ProfessionalCalculator({
  snapshot,
  accessPolicy,
  accessAvailable = true,
  accessLevel = 'FREE',
  statusLabel = 'رایگان',
}: {
  snapshot: Snapshot;
  accessPolicy: CalculatorAccessPolicy;
  accessAvailable?: boolean;
  accessLevel?: AccessLevel;
  statusLabel?: string | null;
}) {
  const [product, setProduct] = useState<Product>('gold');
  const [tool, setTool] = useState<Tool>(DEFAULT_TOOL);
  const [weightAmount, setWeightAmount] = useState('1');
  const [purityAmount, setPurityAmount] = useState('');
  const [market, setMarket] = useState(snapshot);
  const [inputs, setInputs] = useState<Record<string, Entry>>(() => prefill('mazanehTo18k', snapshot));
  const [result, setResult] = useState<CalculatorResult | null>(null);
  const [resultOpen, setResultOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const [activeField, setActiveField] = useState('');
  const [keypadCue, setKeypadCue] = useState(false);
  const [lockedNotice, setLockedNotice] = useState<{ title: string; message: string; upgrade: boolean } | null>(null);
  const request = useRef<AbortController | null>(null);
  const cueTimer = useRef<number | null>(null);
  useEffect(() => () => {
    request.current?.abort();
    if (cueTimer.current) window.clearTimeout(cueTimer.current);
  }, []);

  function moduleAccess(op: CalculatorModule) {
    return decideCalculatorModuleAccess(op, accessPolicy, accessLevel, {
      statusLabel,
      settingsAvailable: accessAvailable,
    });
  }

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
  const toolGate = moduleAccess(tool);
  const operationAllowed = toolGate.ok;
  const spec = operation && operationAllowed ? calculatorCatalog[operation] : null;
  const featured = popularByProduct[product];
  const featuredIds = new Set(featured.map(item => item.id));
  const moreTools: PopularPick[] = available.filter(value =>
    !(isMazanehOperation(value) ? featuredIds.has('mazaneh') : featuredIds.has(value)),
  ).map(value => ({
    id: value,
    label: toolLabel(value),
    Icon: value === 'purity' ? popularIcons.purity
      : value === 'meltedTarget' || value === 'meltedTargetAverage' ? popularIcons.target
        : value === 'meltedNewBuy' ? popularIcons.stack
          : value === 'meltedPartialSell' ? popularIcons.sell
            : value === 'meltedBreakEven' || value === 'coinBreakEven' ? popularIcons.wallet
              : value === 'percentageChange' || value === 'rateCompare' ? popularIcons.trend
                : value === 'goldSilverSwap' ? popularIcons.ratio
                  : value === 'uaeGold' || value === 'aedDerivedUsd' ? popularIcons.usdGap
                    : value === 'weight' ? popularIcons.weight
                      : value.toLowerCase().includes('silver') ? popularIcons.silverBubble
                        : value.toLowerCase().includes('coin') ? popularIcons.coin
                          : popularIcons.goldBubble,
  }));
  const popular = [...featured, ...moreTools].map(item => {
    if (item.id === 'mazaneh') {
      return { ...item, locked: !moduleAccess('market18kToMazaneh').ok && !moduleAccess('mazanehTo18k').ok };
    }
    if (!available.includes(item.id as Tool)) return item;
    const decision = moduleAccess(item.id as CalculatorModule);
    return { ...item, locked: item.locked || !decision.ok };
  });

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
    const gate = moduleAccess(next);
    if (!gate.ok) {
      setLockedNotice({ title: popularByProduct[forProduct].find(item => item.id === next)?.label ?? 'ماشین‌حساب', message: gate.message, upgrade: gate.code === 'forbidden' || gate.code === 'trial_expired' });
      setTool(next);
      setActiveField('');
      setResult(null);
      setResultOpen(false);
      return;
    }
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
    if (!item) return;
    if (id === 'mazaneh') {
      const next = moduleAccess('market18kToMazaneh').ok ? 'market18kToMazaneh' : moduleAccess('mazanehTo18k').ok ? 'mazanehTo18k' : 'market18kToMazaneh';
      choose(next);
      return;
    }
    if (available.includes(id as Tool)) choose(id as Tool);
    else setLockedNotice({ title: item.label, message: 'این ابزار هنوز فرمول و دادهٔ تأییدشده برای انتشار ندارد. خرید اشتراک هم فعلاً آن را فعال نمی‌کند.', upgrade: false });
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
    const gate = moduleAccess(operation);
    if (!gate.ok) {
      setError(gate.message);
      return;
    }
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
        credentials: 'same-origin',
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

  const keypadValue = tool === 'marketWeight' || tool === 'weight' ? weightAmount : tool === 'purity' ? purityAmount : inputs[activeField]?.value ?? '';
  const keypadTarget = tool === 'marketWeight'
    ? 'مقدار معادل عرفی'
    : tool === 'weight'
      ? 'مقدار وزن'
    : tool === 'purity'
      ? 'وزن مبدأ به گرم'
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
            className={lockedProducts.includes(key) ? 'is-locked' : undefined}
            onClick={() => chooseProduct(key)}
          >
            {label}
            {lockedProducts.includes(key) ? <LockKeyhole size={12} aria-hidden /> : null}
          </button>
        ))}
      </div>
      <CalculatorProductTiles value={product} onChange={chooseProduct} locked={lockedProducts} />

      <CalculatorPopularRow items={popular} active={isMazanehOperation(tool) ? 'mazaneh' : tool} onPick={pickPopular} />

      <div className="calc-stage__main">
        {!operationAllowed ? (
          <div className="calc-tool-panel calc-tool-panel--locked">
            <LockKeyhole size={22} />
            <strong>دسترسی لازم است</strong>
            <p>{!toolGate.ok ? toolGate.message : ''}</p>
            {!toolGate.ok && (toolGate.code === 'forbidden' || toolGate.code === 'trial_expired') ? <Link href="/pricing">ارتقای حساب</Link> : null}
          </div>
        ) : tool === 'marketWeight' ? (
          <MarketMesghalEquivalentWidget amount={weightAmount} onAmountChange={setWeightAmount} onPriceConversionClick={() => choose('market18kToMazaneh')} />
        ) : tool === 'weight' ? (
          <WeightConvertWidget amount={weightAmount} onAmountChange={setWeightAmount} onPriceConversionClick={product === 'gold' ? () => choose('market18kToMazaneh') : undefined} />
        ) : tool === 'purity' ? (
          <PurityConvertWidget key={product} product={product} amount={purityAmount} onAmountChange={setPurityAmount} />
        ) : spec ? (
          <form className="calc-tool-panel" onSubmit={calculate}>
            {isMazanehOperation(tool) ? (
              <div className="calc-conversion-direction" role="group" aria-label="جهت تبدیل قیمت مظنه و گرم ۱۸ عیار">
                <button type="button" className={tool === 'market18kToMazaneh' ? 'is-on' : ''} aria-pressed={tool === 'market18kToMazaneh'} onClick={() => choose('market18kToMazaneh')}>گرم ۱۸ به مظنه</button>
                <button type="button" className={tool === 'mazanehTo18k' ? 'is-on' : ''} aria-pressed={tool === 'mazanehTo18k'} onClick={() => choose('mazanehTo18k')}>مظنه به گرم ۱۸</button>
              </div>
            ) : null}
            <div className="calc-tool-panel__toolbar">
              <strong className="calc-tool-panel__title">{spec.title}</strong>
              <button type="button" className="calc-tool-panel__refresh" onClick={refresh} disabled={pending} aria-label="تازه‌سازی قیمت‌ها">
                <RefreshCw size={15} />
              </button>
            </div>
            {isMazanehOperation(tool) ? <p className="calc-conversion-note">این تبدیلِ قیمت با ضریب ۴٫۳۳۱۸ انجام می‌شود؛ وزن فیزیکی یک مثقال ۴٫۶۰۸ گرم است.</p> : null}
            {spec.note ? <p className="calc-conversion-note">{spec.note}</p> : null}
            {spec.fields.map(field => {
              const input = inputs[field.key] ?? { value: '', provenance: 'MANUAL' as const };
              const liveAvailable = Boolean(field.symbol) && market.mode === 'live' && liveEntry(field, market).provenance === 'LIVE';
              return (
                <div className={`calc-tool-panel__field${input.provenance === 'LIVE' ? ' is-live' : ' is-manual'}`} key={field.key}>
                  <div className="calc-tool-panel__head">
                    <span className="calc-tool-panel__label">{field.label}</span>
                    {field.symbol ? <div className="calc-mode" role="radiogroup" aria-label={`منبع ${field.label}`}>
                      <button type="button" role="radio" aria-checked={input.provenance === 'LIVE'} className={input.provenance === 'LIVE' ? 'is-on' : ''} disabled={!liveAvailable} onClick={() => setMode(field.key, 'LIVE')}>
                        لحظه‌ای
                      </button>
                      <button type="button" role="radio" aria-checked={input.provenance === 'MANUAL'} className={input.provenance === 'MANUAL' ? 'is-on' : ''} onClick={() => setMode(field.key, 'MANUAL')}>
                        دستی
                      </button>
                    </div> : <small className="calc-manual-source">ورودی شما</small>}
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
                <ResultDetails result={result} />
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
            if (tool === 'marketWeight' || tool === 'weight') { setWeightAmount(value); return; }
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
            {spec?.note ? <p className="calc-result-note">{spec.note}</p> : null}
            {result.outputs.map(output => (
              <div className="ds-overlay__result-row" key={output.label}>
                <span>{output.label}</span>
                <strong dir="ltr">
                  <bdi>{number(output.value)}</bdi>
                  <small>{output.unit}</small>
                </strong>
              </div>
            ))}
            <ResultDetails result={result} />
          </div>
        ) : null}
      </OverlaySheet>
      <OverlaySheet open={Boolean(lockedNotice)} title={lockedNotice?.title ?? 'دسترسی ماشین‌حساب'} onClose={() => setLockedNotice(null)}>
        <div className="calc-access-notice">
          <LockKeyhole size={24} aria-hidden="true" />
          <p>{lockedNotice?.message}</p>
          {lockedNotice?.upgrade ? <Link className="button" href="/pricing">حساب خود را ارتقا دهید</Link> : null}
        </div>
      </OverlaySheet>
    </section>
  );
}
