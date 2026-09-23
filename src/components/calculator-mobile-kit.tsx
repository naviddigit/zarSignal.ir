'use client';

import { useMemo, useState } from 'react';
import {
  ArrowLeftRight, Banknote, ChartNoAxesColumn, CircleDollarSign, Coins, Delete,
  Gem, Grid2X2, Info, Menu, Percent, Scale, X,
} from 'lucide-react';
import { convertWeight, weightUnits, type WeightUnit } from '@/lib/calculator-conversions';
import { formatNumericInput, sanitizeNumericInput } from '@/lib/numeric-input';
import { isStale, type Snapshot } from '@/lib/market';
import { mazanehTo18k } from '@/lib/mazaneh-to-18k';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/field';

const unitOptions = Object.entries(weightUnits).map(([value, unit]) => ({ value, label: unit.label }));

function fa(value: number, digits = 4) {
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(value);
}

function money(value: string | number, currency: string) {
  const n = Number(value);
  if (!Number.isFinite(n)) return '—';
  const amount = new Intl.NumberFormat('en-US', { maximumFractionDigits: currency === 'USD' ? 2 : 0 }).format(n);
  return `${amount} ${currency === 'TMN' ? 'تومان' : 'دلار'}`;
}

function clock(value?: string) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Asia/Tehran' }).format(new Date(value));
}

export type CalcProduct = 'gold' | 'silver' | 'coin' | 'fx' | 'more';

const productMeta: { key: CalcProduct; label: string; Icon: typeof Gem }[] = [
  { key: 'gold', label: 'طلا', Icon: ChartNoAxesColumn },
  { key: 'silver', label: 'نقره', Icon: Gem },
  { key: 'coin', label: 'سکه', Icon: Coins },
  { key: 'fx', label: 'ارز', Icon: CircleDollarSign },
  { key: 'more', label: 'بیشتر', Icon: Grid2X2 },
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
          </button>
        );
      })}
    </div>
  );
}

/** Live prices as compact market cards. */
export function CalculatorLiveStrip({ snapshot }: { snapshot: Snapshot }) {
  const cells = [
    { symbol: 'XAU_USD' as const, label: 'اونس جهانی' },
    { symbol: 'USD' as const, label: 'دلار آزاد' },
    { symbol: 'GOLD_MELTED' as const, label: 'مظنه تهران' },
    { symbol: 'GOLD_18K' as const, label: 'گرم ۱۸ عیار' },
  ];
  const latest = snapshot.quotes.map(q => q.fetchedAt).sort().at(-1);
  return (
    <section className="calc-live-strip" aria-label="قیمت‌های لحظه‌ای بازار">
      <header>
        <strong><ChartNoAxesColumn size={12} aria-hidden="true" /> قیمت‌های لحظه‌ای بازار</strong>
        <span>
          <i className={snapshot.status === 'ok' ? 'is-live' : ''} />
          به‌روزرسانی: {clock(latest)}
        </span>
      </header>
      <div className="calc-live-strip__grid">
        {cells.map(cell => {
          const quote = snapshot.quotes.find(item => item.symbol === cell.symbol);
          const melted = snapshot.quotes.find(item => item.symbol === 'GOLD_MELTED');
          const derived18k = !quote && cell.symbol === 'GOLD_18K' && melted
            ? mazanehTo18k(Number(melted.sell)).market18k
            : null;
          const stale = quote ? isStale(quote) : melted && derived18k != null ? isStale(melted) : true;
          const display = quote
            ? money(quote.sell, quote.currency)
            : derived18k != null
              ? money(Math.round(derived18k), 'TMN')
              : '—';
          return (
            <article key={cell.symbol} className={stale ? 'is-stale' : ''}>
              <small>{cell.label}</small>
              <bdi>{display}</bdi>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/** Keypad: numbers + one equals (Mojtaba). */
export function CalculatorKeypad({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  function press(key: string) {
    if (key === '÷' || key === '×' || key === '−' || key === '=' || key === '+') return;
    if (key === '⌫') return onChange(value.slice(0, -1));
    if (key === '.') {
      if (value.includes('.')) return;
      return onChange(value ? `${value}.` : '0.');
    }
    onChange(sanitizeNumericInput(`${value === '0' ? '' : value}${key}`, 8));
  }

  const rows: string[][] = [
    ['7', '8', '9', '÷'],
    ['4', '5', '6', '×'],
    ['1', '2', '3', '−'],
    ['.', '0', '⌫', '='],
  ];

  return (
    <div className="calc-keypad" role="group" aria-label="صفحه‌کلید عددی">
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
    <section className="calc-popular" aria-label="محاسبات محبوب">
      <header>
        <strong>محاسبات محبوب</strong>
        <span>همه</span>
      </header>
      <div className="calc-popular__icons">
        {items.map(item => {
          const Icon = item.Icon;
          return (
            <button
              key={item.id}
              type="button"
              className={active === item.id ? 'is-on' : ''}
              disabled={item.locked}
              onClick={() => onPick(item.id)}
            >
              <span><Icon size={16} strokeWidth={1.9} /></span>
              <small>{item.label}</small>
            </button>
          );
        })}
      </div>
    </section>
  );
}

/** Main conversion card — Mojtaba layout. */
export function WeightConvertWidget({ amount, onAmountChange }: { amount: string; onAmountChange: (next: string) => void }) {
  const [from, setFrom] = useState<WeightUnit>('mesghal');
  const [to, setTo] = useState<WeightUnit>('gram');

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
        <strong>تبدیل واحد وزن</strong>
        <small>پایهٔ محاسبه طلا</small>
      </header>

      <div className="calc-weight-widget__pair">
        <div className="calc-weight-box is-in">
          <div className="calc-weight-box__value">
            <Input
              label="مقدار"
              dir="ltr"
              inputMode="decimal"
              autoComplete="off"
              placeholder="مثلاً 3.5"
              value={formatNumericInput(amount)}
              onChange={event => onAmountChange(sanitizeNumericInput(event.target.value, 8))}
            />
            {amount ? (
              <button type="button" className="calc-weight-box__clear" aria-label="پاک‌کردن" onClick={() => onAmountChange('')}>
                <X size={12} />
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

        <button type="button" className="calc-weight-swap" aria-label="جابه‌جایی واحدها" onClick={swap}>
          <ArrowLeftRight size={15} />
        </button>

        <div className="calc-weight-box is-out" aria-live="polite">
          <span className="ds-field__label">نتیجه</span>
          <strong className="calc-weight-box__result" dir="ltr">{result == null ? '—' : fa(result)}</strong>
          <Select
            label="واحد مقصد"
            className="calc-weight-box__select"
            value={to}
            onChange={value => setTo(value as WeightUnit)}
            options={unitOptions}
          />
        </div>
      </div>

      <p className="calc-weight-widget__factor">
        <Info size={12} aria-hidden="true" />
        <span>
          1 {weightUnits[from].label} = {fa(factor, 4)} {weightUnits[to].label}
          {result != null ? ` | ${fa(Number(amount), 2)} ${weightUnits[from].label} = ${fa(result)} ${weightUnits[to].label}` : null}
        </span>
      </p>
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
};
