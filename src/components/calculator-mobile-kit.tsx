'use client';

import { useMemo, useState } from 'react';
import { ArrowLeftRight, Delete } from 'lucide-react';
import { convertWeight, weightUnits, type WeightUnit } from '@/lib/calculator-conversions';
import { formatNumericInput, sanitizeNumericInput } from '@/lib/numeric-input';
import { formatPrice, isStale, type Snapshot } from '@/lib/market';
import { RelativeTime } from '@/components/relative-time';

const popularUnits: WeightUnit[] = ['gram', 'mesghal', 'seer', 'kilogram', 'tola', 'troyOunce'];

function fa(value: number, digits = 4) {
  return new Intl.NumberFormat('fa-IR', { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(value);
}

/** Live 4-cell strip — mock mobile market row. */
export function CalculatorLiveStrip({ snapshot }: { snapshot: Snapshot }) {
  const cells = [
    { symbol: 'GOLD_MELTED' as const, label: 'مظنه تهران' },
    { symbol: 'GOLD_18K' as const, label: 'گرم ۱۸ عیار' },
    { symbol: 'XAU_USD' as const, label: 'اونس جهانی' },
    { symbol: 'USD' as const, label: 'دلار آزاد' },
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

/** Thumb keypad — appends into active numeric buffer. */
export function CalculatorKeypad({ value, onChange, onSubmit }: { value: string; onChange: (next: string) => void; onSubmit?: () => void }) {
  function press(key: string) {
    if (key === 'C') return onChange('');
    if (key === '⌫') return onChange(value.slice(0, -1));
    if (key === '.') {
      if (value.includes('.')) return;
      return onChange(value ? `${value}.` : '0.');
    }
    if (key === '=') return onSubmit?.();
    const next = sanitizeNumericInput(`${value === '0' ? '' : value}${key}`, 8);
    onChange(next);
  }
  const keys = ['7', '8', '9', '⌫', '4', '5', '6', 'C', '1', '2', '3', '=', '0', '00', '.', '⏎'];
  return (
    <div className="calc-keypad" role="group" aria-label="صفحه‌کلید عددی">
      {keys.map(key => (
        <button
          key={key}
          type="button"
          className={key === '=' || key === '⏎' ? 'is-accent' : key === 'C' ? 'is-danger' : ''}
          onClick={() => press(key === '⏎' ? '=' : key)}
        >
          {key === '⌫' ? <Delete size={18} /> : key === '⏎' ? '=' : key}
        </button>
      ))}
    </div>
  );
}

/** Default V1 mobile widget — weight conversion (M01 PASS). */
export function WeightConvertWidget() {
  const [amount, setAmount] = useState('3.5');
  const [from, setFrom] = useState<WeightUnit>('mesghal');
  const [to, setTo] = useState<WeightUnit>('gram');
  const [focus, setFocus] = useState<'amount' | null>('amount');

  const result = useMemo(() => {
    const n = Number(amount);
    if (!Number.isFinite(n) || amount === '') return null;
    try { return convertWeight(n, from, to); } catch { return null; }
  }, [amount, from, to]);

  const factor = weightUnits[from].grams / weightUnits[to].grams;

  function swap() {
    setFrom(to);
    setTo(from);
    if (result != null) setAmount(String(Number(result.toFixed(8))));
  }

  return (
    <section className="calc-weight-widget" aria-label="تبدیل واحد وزن">
      <header>
        <div>
          <strong>تبدیل واحد وزن</strong>
          <small>پایهٔ همه محاسبات طلا</small>
        </div>
      </header>
      <div className="calc-weight-widget__pair">
        <label className={`calc-weight-box${focus === 'amount' ? ' is-on' : ''}`}>
          <span>ورودی</span>
          <input
            dir="ltr"
            inputMode="decimal"
            value={formatNumericInput(amount)}
            onFocus={() => setFocus('amount')}
            onChange={event => setAmount(sanitizeNumericInput(event.target.value, 8))}
          />
          <select value={from} onChange={event => setFrom(event.target.value as WeightUnit)} aria-label="واحد مبدأ">
            {Object.entries(weightUnits).map(([key, unit]) => (
              <option key={key} value={key}>{unit.label}</option>
            ))}
          </select>
        </label>
        <button type="button" className="calc-weight-swap" aria-label="جابه‌جایی واحدها" onClick={swap}>
          <ArrowLeftRight size={18} />
        </button>
        <div className="calc-weight-box is-out" aria-live="polite">
          <span>خروجی</span>
          <strong dir="ltr">{result == null ? '—' : fa(result)}</strong>
          <select value={to} onChange={event => setTo(event.target.value as WeightUnit)} aria-label="واحد مقصد">
            {Object.entries(weightUnits).map(([key, unit]) => (
              <option key={key} value={key}>{unit.label}</option>
            ))}
          </select>
        </div>
      </div>
      <p className="calc-weight-widget__factor" dir="rtl">
        ۱ {weightUnits[from].label} = {fa(factor, 6)} {weightUnits[to].label}
        {result != null ? ` · ${fa(Number(amount), 4)} ${weightUnits[from].label} = ${fa(result)} ${weightUnits[to].label}` : null}
      </p>
      <div className="calc-unit-chips" role="group" aria-label="واحدهای پرکاربرد">
        {popularUnits.map(unit => (
          <button
            key={unit}
            type="button"
            className={to === unit ? 'is-on' : ''}
            onClick={() => setTo(unit)}
          >
            {weightUnits[unit].label}
          </button>
        ))}
      </div>
      <div className="calc-weight-widget__pad">
        <CalculatorKeypad value={amount} onChange={setAmount} />
      </div>
    </section>
  );
}
