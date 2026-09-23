'use client';

import { useMemo, useState } from 'react';
import { ArrowLeftRight, Delete } from 'lucide-react';
import { convertWeight, weightUnits, type WeightUnit } from '@/lib/calculator-conversions';
import { formatNumericInput, sanitizeNumericInput } from '@/lib/numeric-input';
import { formatPrice, isStale, type Snapshot } from '@/lib/market';
import { RelativeTime } from '@/components/relative-time';
import { Select } from '@/components/ui/select';

const popularUnits: WeightUnit[] = ['gram', 'mesghal', 'seer', 'kilogram', 'tola', 'troyOunce'];
const unitOptions = Object.entries(weightUnits).map(([value, unit]) => ({ value, label: unit.label }));

function fa(value: number, digits = 4) {
  return new Intl.NumberFormat('fa-IR', { maximumFractionDigits: digits, minimumFractionDigits: 0 }).format(value);
}

/** Compact live strip — 2×2 on mobile, 4-up on desktop. */
export function CalculatorLiveStrip({ snapshot }: { snapshot: Snapshot }) {
  const cells = [
    { symbol: 'GOLD_MELTED' as const, label: 'مظنه تهران' },
    { symbol: 'GOLD_18K' as const, label: 'گرم ۱۸' },
    { symbol: 'XAU_USD' as const, label: 'اونس' },
    { symbol: 'USD' as const, label: 'دلار' },
  ];
  const latest = snapshot.quotes.map(q => q.fetchedAt).sort().at(-1);
  return (
    <section className="calc-live-strip" aria-label="قیمت‌های لحظه‌ای بازار">
      <header>
        <strong>قیمت لحظه‌ای</strong>
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

export function CalculatorKeypad({ value, onChange, onSubmit }: { value: string; onChange: (next: string) => void; onSubmit?: () => void }) {
  function press(key: string) {
    if (key === 'C') return onChange('');
    if (key === '⌫') return onChange(value.slice(0, -1));
    if (key === '.') {
      if (value.includes('.')) return;
      return onChange(value ? `${value}.` : '0.');
    }
    if (key === '=') return onSubmit?.();
    onChange(sanitizeNumericInput(`${value === '0' ? '' : value}${key}`, 8));
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
          {key === '⌫' ? <Delete size={16} /> : key === '⏎' ? '=' : key}
        </button>
      ))}
    </div>
  );
}

/** Weight convert — DS Select only, compact mobile layout. */
export function WeightConvertWidget() {
  const [amount, setAmount] = useState('3.5');
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
    if (result != null) setAmount(String(Number(result.toFixed(8))));
  }

  return (
    <section className="calc-weight-widget" aria-label="تبدیل واحد وزن">
      <header className="calc-weight-widget__head">
        <strong>تبدیل واحد وزن</strong>
        <small>مثقال · گرم · اونس</small>
      </header>

      <div className="calc-weight-widget__pair">
        <div className="calc-weight-box is-in">
          <span>ورودی</span>
          <input
            dir="ltr"
            inputMode="decimal"
            aria-label="مقدار ورودی"
            value={formatNumericInput(amount)}
            onChange={event => setAmount(sanitizeNumericInput(event.target.value, 8))}
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
          <span>خروجی</span>
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
        {result != null ? `  ·  ${fa(Number(amount), 2)} → ${fa(result)}` : null}
      </p>

      <div className="calc-unit-chips" role="group" aria-label="میان‌بر واحد مقصد">
        {popularUnits.map(unit => (
          <button key={unit} type="button" className={to === unit ? 'is-on' : ''} onClick={() => setTo(unit)}>
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
