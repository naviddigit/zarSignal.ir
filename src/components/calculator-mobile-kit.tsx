'use client';

import { useMemo, useState } from 'react';
import { ArrowLeftRight, Delete } from 'lucide-react';
import { convertWeight, weightUnits, type WeightUnit } from '@/lib/calculator-conversions';
import { formatNumericInput, sanitizeNumericInput } from '@/lib/numeric-input';
import { formatPrice, isStale, type Snapshot } from '@/lib/market';
import { RelativeTime } from '@/components/relative-time';
import { Select } from '@/components/ui/select';

const unitOptions = Object.entries(weightUnits).map(([value, unit]) => ({ value, label: unit.label }));

function fa(value: number, digits = 4) {
  return new Intl.NumberFormat('fa-IR', { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(value);
}

/** Compact live prices — Mojtaba mobile mock. */
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
        <strong>قیمت‌های لحظه‌ای</strong>
        <span>
          <i className={snapshot.status === 'ok' ? 'is-live' : ''} />
          {latest ? <RelativeTime value={latest} /> : '—'}
        </span>
      </header>
      <div className="calc-live-strip__grid">
        {cells.map(cell => {
          const quote = snapshot.quotes.find(item => item.symbol === cell.symbol);
          const stale = quote ? isStale(quote) : true;
          return (
            <article key={cell.symbol} className={stale ? 'is-stale' : ''}>
              <small>{cell.label}</small>
              <bdi>{quote ? formatPrice(quote.sell, quote.currency) : '—'}</bdi>
            </article>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Keypad matching Mojtaba mock:
 * 7 8 9 ÷
 * 4 5 6 ×
 * 1 2 3 −
 * . 0 ⌫ =
 * Only ONE equals. Ops are reserved (no-op for weight V1).
 */
export function CalculatorKeypad({ value, onChange }: { value: string; onChange: (next: string) => void }) {
  function press(key: string) {
    if (key === '÷' || key === '×' || key === '−' || key === '=') return;
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
          className={key === '=' ? 'is-accent' : key === '÷' || key === '×' || key === '−' ? 'is-op' : ''}
          aria-label={key === '⌫' ? 'پاک‌کردن آخرین رقم' : key === '=' ? 'تأیید' : key}
          onClick={() => press(key)}
        >
          {key === '⌫' ? <Delete size={16} strokeWidth={2.2} /> : key}
        </button>
      ))}
    </div>
  );
}

type WeightConvertWidgetProps = {
  amount: string;
  onAmountChange: (next: string) => void;
};

/** Weight convert card — keypad rendered separately below for one-screen fit. */
export function WeightConvertWidget({ amount, onAmountChange }: WeightConvertWidgetProps) {
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
        <div>
          <strong>تبدیل واحد وزن</strong>
          <small>پایهٔ محاسبه طلا</small>
        </div>
      </header>

      <div className="calc-weight-widget__pair">
        <div className="calc-weight-box is-in">
          <span>مقدار</span>
          <input
            dir="ltr"
            inputMode="decimal"
            aria-label="مقدار ورودی"
            value={formatNumericInput(amount)}
            onChange={event => onAmountChange(sanitizeNumericInput(event.target.value, 8))}
          />
          <Select
            aria-label="واحد مبدأ"
            className="calc-weight-box__select"
            value={from}
            onChange={value => setFrom(value as WeightUnit)}
            options={unitOptions}
          />
        </div>

        <button type="button" className="calc-weight-swap" aria-label="جابه‌جایی واحدها" onClick={swap}>
          <ArrowLeftRight size={16} />
        </button>

        <div className="calc-weight-box is-out" aria-live="polite">
          <span>نتیجه</span>
          <strong dir="ltr">{result == null ? '—' : fa(result)}</strong>
          <Select
            aria-label="واحد مقصد"
            className="calc-weight-box__select"
            value={to}
            onChange={value => setTo(value as WeightUnit)}
            options={unitOptions}
          />
        </div>
      </div>

      <p className="calc-weight-widget__factor">
        ۱ {weightUnits[from].label} = {fa(factor, 4)} {weightUnits[to].label}
        {result != null ? ` | ${fa(Number(amount), 2)} ${weightUnits[from].label} = ${fa(result)} ${weightUnits[to].label}` : null}
      </p>
    </section>
  );
}
