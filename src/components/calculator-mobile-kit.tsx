'use client';

import { useMemo, useState } from 'react';
import {
  ArrowLeftRight, Banknote, ChartNoAxesColumn, CircleDollarSign, Coins, Delete,
  Gem, Info, Layers3, LockKeyhole, Menu, Percent, Scale, Target, TrendingDown, TrendingUp, Wallet, X,
} from 'lucide-react';
import { convertWeight, convertPurityWeight, weightUnits, purityOptions, type WeightUnit, type Purity } from '@/lib/calculator-conversions';
import { formatNumericInput, sanitizeNumericInput } from '@/lib/numeric-input';
import { isStale, type Snapshot, type Symbol } from '@/lib/market';
import { MAZANEH_TO_18K_DIVISOR, mazanehTo18k } from '@/lib/mazaneh-to-18k';
import { Select } from '@/components/ui/select';
import { HScrollRail } from '@/components/ui/h-scroll-rail';
import { keypadMath } from '@/lib/keypad-math';
import { sparkPriceTone, useMarketSparks } from '@/components/use-market-sparks';

const unitOptions = Object.entries(weightUnits).map(([value, unit]) => ({ value, label: unit.label }));
const puritySelectOptions = Object.entries(purityOptions).map(([value, unit]) => ({ value, label: unit.label }));
const silverPurityOptions = puritySelectOptions.filter(option => option.value.startsWith('silver'));
const goldPurityOptions = puritySelectOptions.filter(option => !option.value.startsWith('silver'));

function fa(value: number, digits = 4) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(value);
}

function money(value: string | number, currency: string) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const amount = new Intl.NumberFormat('en-US', { maximumFractionDigits: currency === 'USD' ? 2 : 0 }).format(n);
  return amount;
}

function clock(value?: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Tehran' }).format(new Date(value));
}

export type CalcProduct = 'gold' | 'silver' | 'fx' | 'coin';

const productMeta: { key: CalcProduct; label: string; Icon: typeof Gem }[] = [
  { key: 'gold', label: 'طلا', Icon: ChartNoAxesColumn },
  { key: 'silver', label: 'نقره', Icon: Gem },
  { key: 'fx', label: 'دلار', Icon: CircleDollarSign },
  { key: 'coin', label: 'سکه', Icon: Coins },
];

/** App header from Mojtaba mock. */
export function CalculatorAppHeader({ live }: { live: boolean }) {
  return (
    <header className="calc-app-head">
      <button type="button" className="calc-app-head__menu" aria-label="منو" onClick={() => document.querySelector<HTMLElement>('.mobile-tab-bar')?.focus()}>
        <Menu size={20} />
      </button>
      <div className="calc-app-head__brand">
        <strong>زرسیگنال <ChartNoAxesColumn size={14} /></strong>
        <small>ابزار حرفه‌ای بازار طلا، نقره و ارز</small>
      </div>
      <span className={`calc-app-head__live${live ? ' is-on' : ''}`}>
        <i /> قیمت لحظه‌ای
      </span>
    </header>
  );
}

/** Icon category row. */
export function CalculatorProductTiles({
  value,
  onChange,
  locked = [],
}: {
  value: CalcProduct;
  onChange: (next: CalcProduct) => void;
  locked?: CalcProduct[];
}) {
  return (
    <div className="calc-product-tiles" role="tablist" aria-label="نوع دارایی">
      {productMeta.map(item => {
        const Icon = item.Icon;
        const isLocked = locked.includes(item.key);
        return (
          <button
            key={item.key}
            type="button"
            role="tab"
            aria-selected={value === item.key}
            aria-disabled={isLocked || undefined}
            disabled={isLocked}
            className={value === item.key ? 'is-on' : isLocked ? 'is-locked' : ''}
            onClick={() => onChange(item.key)}
          >
            <span className="calc-product-tiles__icon"><Icon size={18} strokeWidth={1.8} /></span>
            <small>{item.label}</small>
            {isLocked ? <LockKeyhole className="calc-lock-badge" size={12} aria-hidden /> : null}
          </button>
        );
      })}
    </div>
  );
}

/** Live prices as compact market cards — ۱۸ عیار همیشه از مظنه ÷ ۴٫۳۳۱۸. */
export function CalculatorLiveStrip({ snapshot }: { snapshot: Snapshot }) {
  const cells = [
    { symbol: 'XAU_USD' as const, label: 'اونس طلا', unit: 'دلار' },
    { symbol: 'USD' as const, label: 'دلار آزاد', unit: 'تومان' },
    { symbol: 'GOLD_MELTED' as const, label: 'مظنه تهران', unit: 'تومان' },
    { symbol: 'GOLD_18K' as const, label: 'گرم ۱۸ عیار', unit: 'تومان' },
    { symbol: 'SILVER_999' as const, label: 'نقره ۹۹۹', unit: 'تومان' },
    { symbol: 'SEKE_CASH' as const, label: 'سکه نقدی', unit: 'تومان' },
  ];
  const symbols = cells.map(c => c.symbol) as Symbol[];
  const sparks = useMarketSparks(symbols);
  const latest = snapshot.quotes.map(q => q.fetchedAt).sort().at(-1);
  return (
    <section className="calc-live-strip" aria-label="نرخ‌های تابلو">
      <header>
        <strong><ChartNoAxesColumn size={12} aria-hidden="true" /> نرخ‌های تابلو</strong>
        <span>
          <i className={snapshot.status === 'ok' ? 'is-live' : ''} />
          {snapshot.status === 'ok' ? `دریافت: ${clock(latest)}` : 'داده قدیمی / نامعتبر'}
        </span>
      </header>
      <HScrollRail className="calc-live-strip__rail" trackClassName="calc-live-strip__grid" label="نرخ‌های تابلو" step={140}>
        {cells.map(cell => {
          const quote = snapshot.quotes.find(item => item.symbol === cell.symbol);
          const melted = snapshot.quotes.find(item => item.symbol === 'GOLD_MELTED');
          const meltedMid = melted ? (Number(melted.sell) || Number(melted.buy)) : NaN;
          const derived18k = cell.symbol === 'GOLD_18K' && Number.isFinite(meltedMid) && meltedMid > 0
            ? mazanehTo18k(meltedMid).market18k
            : null;
          const useDerived = cell.symbol === 'GOLD_18K' && derived18k != null;
          const stale = useDerived && melted
            ? isStale(melted)
            : quote
              ? isStale(quote)
              : true;
          const display = useDerived
            ? money(Math.round(derived18k!), 'TMN')
            : quote
              ? money(quote.sell, quote.currency)
              : '—';
          const tone = sparkPriceTone(sparks[cell.symbol]);
          return (
            <article key={cell.symbol} className={`${stale || display === '—' ? 'is-stale' : ''}${tone ? ` is-${tone}` : ''}`}>
              <small>{cell.label} · {cell.unit}{useDerived ? ' · ÷۴٫۳۳۱۸' : ''}</small>
              <bdi className={tone ? `is-${tone}` : undefined}>{display}</bdi>
            </article>
          );
        })}
      </HScrollRail>
    </section>
  );
}

/** Keypad: numbers + one equals (Mojtaba). */
export function CalculatorKeypad({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  const [left, setLeft] = useState<number | null>(null);
  const [operator, setOperator] = useState('');
  const [replace, setReplace] = useState(false);
  const [error, setError] = useState('');
  function press(key: string) {
    setError('');
    if (key === 'C') { setLeft(null); setOperator(''); setReplace(true); return onChange('0'); }
    if ('÷×−+'.includes(key) || key === '=') {
      try {
        const current = left !== null && operator && !replace ? keypadMath(left, Number(value || 0), operator) : Number(value || 0);
        if (left !== null && operator && !replace) onChange(String(current));
        setLeft(key === '=' ? null : current); setOperator(key === '=' ? '' : key); setReplace(true);
      } catch (e) { setError(e instanceof Error ? e.message : 'محاسبه ممکن نشد.'); }
      return;
    }
    const entry = replace ? '' : value;
    setReplace(false);
    if (key === '⌫') return onChange(entry.slice(0, -1));
    if (key === '.') {
      if (entry.includes('.')) return;
      return onChange(entry ? `${entry}.` : '0.');
    }
    onChange(sanitizeNumericInput(`${entry === '0' ? '' : entry}${key}`, 6));
  }

  const rows: string[][] = [
    ['7', '8', '9', '÷'],
    ['4', '5', '6', '×'],
    ['1', '2', '3', '+'],
    ['.', '0', '⌫', '='],
  ];

  return (
    <div className="calc-keypad" role="group" aria-label="صفحه‌کلید عددی" dir="ltr">
      <button type="button" onClick={() => press('C')} aria-label="پاک‌کردن همه">C</button>
      <output className="calc-keypad-status" aria-live="polite">{error || (operator ? `${left} ${operator}` : 'ورود عدد')}</output>
      <button type="button" onClick={() => press('−')} aria-label="تفریق">−</button>
      {rows.flat().map(key => (
        <button
          key={key}
          type="button"
          className={key === '=' ? 'is-accent' : '÷×−+'.includes(key) ? 'is-op' : ''}
          aria-label={key === '⌫' ? 'پاک‌کردن' : key}
          onClick={() => press(key)}
        >
          {key === '⌫' ? <Delete size={15} strokeWidth={2.2} /> : key}
        </button>
      ))}
    </div>
  );
}

type PopularItem = { id: string; label: string; Icon: typeof Scale; locked?: boolean };

export function CalculatorPopularRow({
  items,
  active,
  onPick,
}: {
  items: PopularItem[];
  active: string;
  onPick: (id: string) => void;
}) {
  return (
    <section className="calc-popular" aria-label="ابزار انتخابی">
      <header>
        <strong>ابزار انتخابی</strong><small className="calc-currency-note">محاسبات قیمت: تومانی</small>
      </header>
      <HScrollRail className="calc-popular__rail" trackClassName="calc-popular__icons" label="ابزار انتخابی" step={120}>
        {items.map(item => {
          const Icon = item.Icon;
          return (
            <button
              key={item.id}
              type="button"
              className={`${active === item.id ? 'is-on' : ''}${item.locked ? ' is-locked' : ''}`.trim()}
              title={item.locked ? 'مشاهده وضعیت دسترسی' : undefined}
              aria-label={item.locked ? `${item.label} · قفل` : item.label}
              onClick={() => onPick(item.id)}
            >
              <span className="calc-popular__icon">
                <Icon size={16} strokeWidth={1.9} />
                {item.locked ? <LockKeyhole className="calc-lock-badge" size={11} aria-hidden /> : null}
              </span>
              <small>{item.label}</small>
            </button>
          );
        })}
      </HScrollRail>
    </section>
  );
}

/** 18k fine-metal equivalent used by the market quote, separate from physical mass. */
export function MarketMesghalEquivalentWidget({ amount, onAmountChange, onPriceConversionClick }: { amount: string; onAmountChange: (next: string) => void; onPriceConversionClick: () => void }) {
  const [reverse, setReverse] = useState(false);
  const n = Number(amount);
  const result = amount !== '' && Number.isFinite(n) && n >= 0
    ? reverse ? n * MAZANEH_TO_18K_DIVISOR : n / MAZANEH_TO_18K_DIVISOR
    : null;
  const from = reverse ? 'مثقال عرفی مظنهٔ ۷۰۵' : 'گرم طلای ۱۸ عیار';
  const to = reverse ? 'گرم طلای ۱۸ عیار' : 'مثقال عرفی مظنهٔ ۷۰۵';
  return (
    <section className="calc-weight-widget" aria-label="تبدیل معادل عرفی ۱۸ عیار">
      <header className="calc-weight-widget__head">
        <strong>تبدیل معادل عرفی ۱۸ عیار</strong>
        <small>ضریب ثابت بازار: ۴٫۳۳۱۸</small>
      </header>
      <div className="calc-weight-widget__pair">
        <div className="calc-weight-box is-out" aria-live="polite">
          <span className="ds-field__label">{to}</span>
          <strong className="calc-weight-box__result" dir="ltr">{result == null ? '—' : fa(result, 6)}</strong>
        </div>
        <button type="button" className="calc-weight-swap" aria-label="جابه‌جایی جهت تبدیل عرفی" onClick={() => {
          setReverse(current => !current);
          if (result != null) onAmountChange(String(Number(result.toFixed(8))));
        }}><ArrowLeftRight size={15} /></button>
        <div className="calc-weight-box is-in">
          <span className="ds-field__label">{from}</span>
          <div className="calc-weight-box__input-wrap">
            <input className="ds-input calc-weight-box__input" dir="ltr" inputMode="decimal" autoComplete="off"
              aria-label={`مقدار ${from}`} value={formatNumericInput(amount)}
              onChange={event => onAmountChange(sanitizeNumericInput(event.target.value, 8))} />
          </div>
        </div>
      </div>
      <p className="calc-weight-widget__factor"><Info size={12} aria-hidden="true" /><span>۱ مثقال عرفی مظنهٔ ۷۰۵ از نظر مقدار طلا معادل ۴٫۳۳۱۸ گرم ۱۸ عیار است. وزن فیزیکی مثقال جداگانه محاسبه می‌شود.</span></p>
      <button type="button" className="calc-weight-widget__price-link" onClick={onPriceConversionClick}>تبدیل قیمت مظنه و گرم ۱۸ عیار ←</button>
    </section>
  );
}

/** Main physical weight conversion card. */
export function WeightConvertWidget({ amount, onAmountChange, onMarketEquivalentClick }: { amount: string; onAmountChange: (next: string) => void; onMarketEquivalentClick?: () => void }) {
  const [from, setFrom] = useState<WeightUnit>('gram');
  const [to, setTo] = useState<WeightUnit>('mesghal');

  const result = useMemo(() => {
    const n = Number(amount);
    if (!Number.isFinite(n) || amount === '') return null;
    try { return convertWeight(n, from, to); } catch { return null; }
  }, [amount, from, to]);

  const factor = weightUnits[from].grams / weightUnits[to].grams;

  function swap() {
    setFrom(to);
    setTo(from);
    if (result != null) onAmountChange(String(Number(result.toFixed(8))));
  }

  return (
    <section className="calc-weight-widget" aria-label="تبدیل واحد وزن">
      <header className="calc-weight-widget__head">
        <strong>تبدیل وزن فیزیکی <small>(۱ مثقال = ۴٫۶۰۸ گرم)</small></strong>
      </header>

      <div className="calc-weight-widget__pair">
        <div className="calc-weight-box is-out" aria-live="polite">
          <span className="ds-field__label">وزن فیزیکی مقصد</span>
          <strong className="calc-weight-box__result" dir="ltr">{result == null ? '—' : fa(result, 6)}</strong>
          <Select
            label="واحد مقصد"
            className="calc-weight-box__select"
            value={to}
            onChange={value => setTo(value as WeightUnit)}
            options={unitOptions}
          />
        </div>

        <button type="button" className="calc-weight-swap" aria-label="جابه‌جایی واحدها" onClick={swap}>
          <ArrowLeftRight size={15} />
        </button>

        <div className="calc-weight-box is-in">
          <span className="ds-field__label">مقدار</span>
          <div className="calc-weight-box__input-wrap">
            <input
              className="ds-input calc-weight-box__input"
              dir="ltr"
              inputMode="none"
              autoComplete="off"
              aria-label="مقدار"
              placeholder="مثلاً 3.5"
              value={formatNumericInput(amount)}
              onChange={event => onAmountChange(sanitizeNumericInput(event.target.value, 8))}
            />
            {amount ? (
              <button
                type="button"
                className="calc-weight-box__clear"
                aria-label="پاک‌کردن"
                tabIndex={-1}
                onMouseDown={event => event.preventDefault()}
                onClick={() => onAmountChange('')}
              >
                <X size={10} strokeWidth={2.4} />
              </button>
            ) : null}
          </div>
          <Select
            label="واحد مبدأ"
            className="calc-weight-box__select"
            value={from}
            onChange={value => setFrom(value as WeightUnit)}
            options={unitOptions}
          />
        </div>
      </div>

      <p className="calc-weight-widget__factor">
        <Info size={12} aria-hidden="true" />
        <span>
          1 {weightUnits[from].label} = {fa(factor, 6)} {weightUnits[to].label}
          {result != null ? ` | ${fa(Number(amount), 2)} ${weightUnits[from].label} = ${fa(result)} ${weightUnits[to].label}` : null}
        </span>
      </p>
      {onMarketEquivalentClick ? <button type="button" className="calc-weight-widget__price-link" onClick={onMarketEquivalentClick}>محاسبهٔ عرفی ۱۸ عیار با ضریب ۴٫۳۳۱۸ ←</button> : null}
    </section>
  );
}

/** G02/S02: preserve fine-metal mass while converting gross weight between fineness grades. */
export function PurityConvertWidget({ amount, onAmountChange, product = 'gold' }: { amount: string; onAmountChange: (next: string) => void; product?: CalcProduct }) {
  const silver = product === 'silver';
  const options = silver ? silverPurityOptions : goldPurityOptions;
  const [from, setFrom] = useState<Purity>(silver ? 'silver999' : '18k');
  const [to, setTo] = useState<Purity>(silver ? 'silver925' : '17k');

  const result = useMemo(() => {
    const n = Number(amount);
    if (!Number.isFinite(n) || amount === '') return null;
    try { return convertPurityWeight(n, from, to); } catch { return null; }
  }, [amount, from, to]);

  function swap() {
    setFrom(to);
    setTo(from);
    if (result != null) onAmountChange(String(Number(result.targetWeight.toFixed(8))));
  }

  return (
    <section className="calc-weight-widget" aria-label="تبدیل عیار">
      <header className="calc-weight-widget__head">
        <strong>تبدیل عیار</strong>
        <small>وزن معادل با حفظ مقدار فلز خالص؛ بدون قیمت بازار</small>
      </header>
      <div className="calc-weight-widget__pair">
        <div className="calc-weight-box is-out" aria-live="polite">
          <span className="ds-field__label">وزن معادل مقصد · گرم</span>
          <strong className="calc-weight-box__result" dir="ltr">{result == null ? '—' : fa(result.targetWeight, 6)}</strong>
          <Select label="عیار مقصد" className="calc-weight-box__select" value={to} onChange={value => setTo(value as Purity)} options={options} />
        </div>
        <button type="button" className="calc-weight-swap" aria-label="جابه‌جایی عیارها" onClick={swap}>
          <ArrowLeftRight size={15} />
        </button>
        <div className="calc-weight-box is-in">
          <span className="ds-field__label">وزن مبدأ · گرم</span>
          <div className="calc-weight-box__input-wrap">
            <input
              className="ds-input calc-weight-box__input"
              dir="ltr"
              inputMode="none"
              autoComplete="off"
              aria-label="وزن مبدأ به گرم"
              placeholder="0"
              value={formatNumericInput(amount)}
              onChange={event => onAmountChange(sanitizeNumericInput(event.target.value, 6))}
            />
          </div>
          <Select label="عیار مبدأ" className="calc-weight-box__select" value={from} onChange={value => setFrom(value as Purity)} options={options} />
        </div>
      </div>
      <p className="calc-weight-widget__factor"><Info size={12} aria-hidden="true" /><span>فلز خالص: {result == null ? '—' : fa(result.fineWeight, 6)} گرم · این تبدیل وزن است، نه قیمت قابل معامله.</span></p>
      {!silver ? <p className="calc-weight-widget__factor"><Info size={12} aria-hidden="true" /><span>یک مثقال طلای ۷۰۵ از نظر مقدار طلای خالص تقریباً معادل ۴٫۳۳۱۸ گرم طلای ۱۸ عیار است. این رابطهٔ عیار و قیمت است؛ وزن یک مثقال حدود ۴٫۶۰۸ گرم است.</span></p> : null}
    </section>
  );
}

export const popularIcons = {
  weight: Scale,
  mazanehTo18k: ChartNoAxesColumn,
  market18kToMazaneh: Banknote,
  goldBubble: Percent,
  purity: Percent,
  coin: Coins,
  jewelry: Gem,
  usdGap: CircleDollarSign,
  silverBubble: Gem,
  ratio: ArrowLeftRight,
  target: Target,
  stack: Layers3,
  sell: TrendingDown,
  trend: TrendingUp,
  wallet: Wallet,
};
