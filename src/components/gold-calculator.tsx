'use client';

import { useMemo, useState } from 'react';
import { Calculator, DatabaseZap, RotateCcw } from 'lucide-react';
import { formatNumericInput, numericValue, sanitizeNumericInput } from '@/lib/numeric-input';
import { mazanehTo18k, market18kToMazaneh } from '@/lib/mazaneh-to-18k';
import type { Quote } from '@/lib/market';

type Mode = 'melted' | 'mazaneh';

type NumberFieldProps = {
  label: string;
  unit: string;
  value: string;
  placeholder: string;
  decimals?: number;
  onChange: (value: string) => void;
};

function NumberField({ label, unit, value, placeholder, decimals = 0, onChange }: NumberFieldProps) {
  return (
    <label className="calculator-field">
      <span>{label}</span>
      <div className="number-input" dir="ltr">
        <input
          aria-label={label}
          autoComplete="off"
          inputMode={decimals ? 'decimal' : 'numeric'}
          placeholder={placeholder}
          spellCheck={false}
          value={formatNumericInput(value)}
          onChange={event => onChange(sanitizeNumericInput(event.target.value, decimals))}
        />
        <b>{unit}</b>
      </div>
    </label>
  );
}

const money = (value: number, digits = 0) =>
  new Intl.NumberFormat('fa-IR', { maximumFractionDigits: digits }).format(value);

export function GoldCalculator({ quotes }: { quotes: Quote[] }) {
  const [mode, setMode] = useState<Mode>('melted');
  const meltedQuote = quotes.find(item => item.symbol === 'GOLD_MELTED');

  const [weight, setWeight] = useState('');
  const [gramPrice, setGramPrice] = useState('');
  const [fee, setFee] = useState('');
  const [mazaneh, setMazaneh] = useState('');
  const [loadedSide, setLoadedSide] = useState<'buy' | 'sell' | null>(null);

  const meltedTotal = useMemo(
    () => numericValue(weight) * numericValue(gramPrice) + numericValue(fee),
    [weight, gramPrice, fee],
  );
  const derived18k = useMemo(() => {
    const value = numericValue(mazaneh);
    if (!value) return null;
    try { return mazanehTo18k(value); } catch { return null; }
  }, [mazaneh]);
  const reverseMazaneh = useMemo(() => {
    if (!derived18k) return null;
    try { return market18kToMazaneh(derived18k.market18k); } catch { return null; }
  }, [derived18k]);

  const hasMeltedInput = Boolean(weight || gramPrice || fee);
  const hasMazanehInput = Boolean(mazaneh);

  function loadMazaneh(side: 'buy' | 'sell') {
    if (!meltedQuote) return;
    setMazaneh(sanitizeNumericInput(meltedQuote[side], 4));
    setLoadedSide(side);
  }

  function loadGramFromMazaneh(side: 'buy' | 'sell') {
    if (!meltedQuote) return;
    try {
      const derived = mazanehTo18k(Number(meltedQuote[side]));
      setGramPrice(sanitizeNumericInput(String(Math.round(derived.market18k)), 0));
      setLoadedSide(side);
    } catch { /* ignore */ }
  }

  function reset() {
    setWeight('');
    setGramPrice('');
    setFee('');
    setMazaneh('');
    setLoadedSide(null);
  }

  return (
    <section id="calculator" className="calculator-card calculator-pro" aria-labelledby="calculator-title">
      <div className="calculator-copy">
        <span className="eyebrow"><Calculator size={15} /> QUICK CALCULATOR</span>
        <h2 id="calculator-title">ماشین‌حساب آب‌شده</h2>
        <p>حداکثر سه لمس تا نتیجه: نوع محاسبه را انتخاب کنید، عدد را بزنید، نتیجه را ببینید.</p>
        <div className="calculator-modes" role="tablist" aria-label="نوع محاسبه">
          <button type="button" role="tab" aria-selected={mode === 'melted'} className={mode === 'melted' ? 'is-on' : ''} onClick={() => setMode('melted')}>مبلغ آب‌شده</button>
          <button type="button" role="tab" aria-selected={mode === 'mazaneh'} className={mode === 'mazaneh' ? 'is-on' : ''} onClick={() => setMode('mazaneh')}>مظنه → ۱۸عیار</button>
        </div>
        <div className="calculator-rule">
          <span>محاسبهٔ فعلی</span>
          <code>{mode === 'melted' ? 'وزن(گرم) × قیمت هر گرم + هزینه' : 'MARKET_18K = مظنه × 750 / (705 × 4.608)'}</code>
        </div>
        <small>
          {mode === 'melted'
            ? 'عیار، مالیات و اجرت تا تأیید Spec مجتبی اضافه نمی‌شود.'
            : 'فرمول تأییدشدهٔ MAZANEH_TO_18K · خروجی مشتق است، نه فید مستقیم.'}
        </small>
      </div>

      <div className="calculator-machine">
        {mode === 'melted' ? (
          <>
            <div className="calculator-source">
              <div>
                <button type="button" onClick={() => loadGramFromMazaneh('sell')} disabled={!meltedQuote}><DatabaseZap size={14} /> گرم از فروش مظنه</button>
                <button type="button" onClick={() => loadGramFromMazaneh('buy')} disabled={!meltedQuote}><DatabaseZap size={14} /> گرم از خرید مظنه</button>
              </div>
              <small>{meltedQuote ? (loadedSide ? `۱۸عیار مشتق از قیمت ${loadedSide === 'sell' ? 'فروش' : 'خرید'} مظنه` : 'می‌توانید قیمت گرم را دستی هم بزنید') : 'ورود دستی فعال است'}</small>
            </div>
            <div className="calculator-screen" aria-live="polite">
              <span>مبلغ نهایی</span>
              <strong dir="rtl">{hasMeltedInput ? money(meltedTotal) : '۰'} <small>تومان</small></strong>
              <em>{hasMeltedInput ? `${money(numericValue(weight), 4)} گرم` : 'برای شروع وزن و قیمت هر گرم را وارد کنید'}</em>
            </div>
            <div className="calculator-form">
              <NumberField label="وزن" unit="گرم" value={weight} placeholder="مثلاً ۱۰٫۵" decimals={4} onChange={setWeight} />
              <NumberField label="قیمت هر گرم" unit="تومان" value={gramPrice} placeholder="مثلاً ۸۵۰۰۰۰۰" decimals={0} onChange={value => { setGramPrice(value); setLoadedSide(null); }} />
              <NumberField label="هزینه یا کارمزد" unit="تومان" value={fee} placeholder="اختیاری" decimals={0} onChange={setFee} />
            </div>
          </>
        ) : (
          <>
            <div className="calculator-source">
              <div>
                <button type="button" onClick={() => loadMazaneh('sell')} disabled={!meltedQuote}><DatabaseZap size={14} /> مظنه فروش</button>
                <button type="button" onClick={() => loadMazaneh('buy')} disabled={!meltedQuote}><DatabaseZap size={14} /> مظنه خرید</button>
              </div>
              <small>{meltedQuote ? (loadedSide ? `مظنه ${loadedSide === 'sell' ? 'فروش' : 'خرید'} بارگذاری شد` : 'مظنه مثقال ۷۰۵ را وارد یا بارگذاری کنید') : 'ورود دستی مظنه'}</small>
            </div>
            <div className="calculator-screen" aria-live="polite">
              <span>قیمت مشتق ۱۸عیار</span>
              <strong dir="rtl">{derived18k ? money(derived18k.market18k) : '—'} <small>تومان / گرم</small></strong>
              <em>{derived18k ? `نسخه ${derived18k.formulaVersion} · DERIVED` : 'مظنه مثقال را وارد کنید'}</em>
            </div>
            <div className="calculator-form calculator-form--two">
              <NumberField label="مظنه (مثقال ۷۰۵)" unit="تومان" value={mazaneh} placeholder="مثلاً ۱۰۳۴۵۰۰۰۰" decimals={0} onChange={value => { setMazaneh(value); setLoadedSide(null); }} />
              <label className="calculator-field">
                <span>بازگشت به مظنه (کنترل)</span>
                <div className="number-input is-readonly" dir="ltr">
                  <input readOnly value={reverseMazaneh ? formatNumericInput(String(Math.round(reverseMazaneh))) : ''} placeholder="—" />
                  <b>تومان</b>
                </div>
              </label>
            </div>
          </>
        )}
        <button type="button" className="calculator-reset" onClick={reset} disabled={!(hasMeltedInput || hasMazanehInput)}>
          <RotateCcw size={14} /> پاک‌کردن
        </button>
      </div>
    </section>
  );
}
