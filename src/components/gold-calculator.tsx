'use client';

import { useEffect, useMemo, useState } from 'react';
import { Calculator, DatabaseZap, RotateCcw } from 'lucide-react';
import { formatNumericInput, numericValue, sanitizeNumericInput } from '@/lib/numeric-input';
import { convertPurityPrice, convertWeight, purityOptions, weightUnits, type Purity, type WeightUnit } from '@/lib/calculator-conversions';
import type { Quote } from '@/lib/market';

type Mode = 'melted' | 'mazaneh' | 'weight' | 'purity';

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
  const [conversionValue, setConversionValue] = useState('');
  const [fromWeight, setFromWeight] = useState<WeightUnit>('mesghal');
  const [toWeight, setToWeight] = useState<WeightUnit>('gram');
  const [fromPurity, setFromPurity] = useState<Purity>('18k');
  const [toPurity, setToPurity] = useState<Purity>('24k');
  const [derived18k, setDerived18k] = useState<{ market18k: number; formulaVersion: string; reverse: number } | null>(null);

  const meltedTotal = useMemo(
    () => numericValue(weight) * numericValue(gramPrice) + numericValue(fee),
    [weight, gramPrice, fee],
  );
  useEffect(() => {
    setDerived18k(null);
    const value = numericValue(mazaneh);
    if (!value) { setDerived18k(null); return; }
    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch('/api/public/calculator', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ operation: 'mazanehTo18k', value }), signal: controller.signal,
        });
        const result = await response.json() as { value?: number; version?: string; reverse?: number };
        setDerived18k(response.ok && result.value ? { market18k: result.value, formulaVersion: result.version ?? '', reverse: result.reverse ?? 0 } : null);
      } catch { if (!controller.signal.aborted) setDerived18k(null); }
    }, 180);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [mazaneh]);
  const reverseMazaneh = derived18k?.reverse ?? null;
  const converted = useMemo(() => mode === 'weight'
    ? convertWeight(numericValue(conversionValue), fromWeight, toWeight)
    : mode === 'purity'
      ? convertPurityPrice(numericValue(conversionValue), fromPurity, toPurity)
      : 0, [mode, conversionValue, fromWeight, toWeight, fromPurity, toPurity]);

  const hasMeltedInput = Boolean(weight || gramPrice || fee);
  const hasMazanehInput = Boolean(mazaneh);
  const hasConversionInput = Boolean(conversionValue);

  function loadMazaneh(side: 'buy' | 'sell') {
    if (!meltedQuote) return;
    setMazaneh(sanitizeNumericInput(meltedQuote[side], 4));
    setLoadedSide(side);
  }

  async function loadGramFromMazaneh(side: 'buy' | 'sell') {
    if (!meltedQuote) return;
    try {
      const response = await fetch('/api/public/calculator', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ operation: 'mazanehTo18k', value: meltedQuote[side] }) });
      const derived = await response.json() as { value?: number };
      if (!response.ok || !derived.value) return;
      setGramPrice(sanitizeNumericInput(String(Math.round(derived.value)), 0));
      setLoadedSide(side);
    } catch { /* ignore */ }
  }

  function reset() {
    setWeight('');
    setGramPrice('');
    setFee('');
    setMazaneh('');
    setConversionValue('');
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
          <button type="button" role="tab" aria-selected={mode === 'weight'} className={mode === 'weight' ? 'is-on' : ''} onClick={() => setMode('weight')}>تبدیل وزن</button>
          <button type="button" role="tab" aria-selected={mode === 'purity'} className={mode === 'purity' ? 'is-on' : ''} onClick={() => setMode('purity')}>تبدیل عیار</button>
        </div>
        <div className="calculator-rule">
          <span>روش محاسبه</span>
          <strong>{mode === 'melted' ? 'مبلغ ساده با ورودی‌های خودتان' : mode === 'mazaneh' ? 'تبدیل استاندارد مظنه ۷۰۵ و طلای ۱۸ عیار' : mode === 'weight' ? 'تبدیل با معادل گرمی واحدها' : 'تبدیل ارزش بر پایه خلوص'}</strong>
        </div>
        <small>
          {mode === 'melted'
            ? 'عیار، مالیات و اجرت تا تأیید Spec مجتبی اضافه نمی‌شود.'
            : mode === 'mazaneh' ? 'بر اساس سند مرجع ماشین‌حساب · خروجی مشتق است، نه فید مستقیم.' : 'ضرایب در موتور محاسبه نگهداری می‌شوند و در رابط عمومی نمایش داده نمی‌شوند.'}
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
        ) : mode === 'mazaneh' ? (
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
        ) : (
          <>
            <div className="calculator-screen" aria-live="polite">
              <span>{mode === 'weight' ? 'وزن تبدیل‌شده' : 'قیمت معادل عیار مقصد'}</span>
              <strong dir="rtl">{conversionValue ? money(converted, 4) : '—'} <small>{mode === 'weight' ? weightUnits[toWeight].label : 'تومان / گرم'}</small></strong>
              <em>{conversionValue ? 'نتیجه بر اساس ورودی شما' : 'عدد را وارد و واحدها را انتخاب کنید'}</em>
            </div>
            <div className="calculator-form calculator-form--conversion">
              <NumberField label={mode === 'weight' ? 'مقدار وزن' : 'قیمت هر گرم'} unit={mode === 'weight' ? weightUnits[fromWeight].label : 'تومان'} value={conversionValue} placeholder={mode === 'weight' ? 'مثلاً ۳٫۵' : 'مثلاً ۷۵۰۰۰۰۰'} decimals={mode === 'weight' ? 4 : 0} onChange={setConversionValue}/>
              <label className="calculator-field"><span>از</span><select value={mode === 'weight' ? fromWeight : fromPurity} onChange={event => mode === 'weight' ? setFromWeight(event.target.value as WeightUnit) : setFromPurity(event.target.value as Purity)}>{Object.entries(mode === 'weight' ? weightUnits : purityOptions).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select></label>
              <label className="calculator-field"><span>به</span><select value={mode === 'weight' ? toWeight : toPurity} onChange={event => mode === 'weight' ? setToWeight(event.target.value as WeightUnit) : setToPurity(event.target.value as Purity)}>{Object.entries(mode === 'weight' ? weightUnits : purityOptions).map(([key, item]) => <option key={key} value={key}>{item.label}</option>)}</select></label>
            </div>
          </>
        )}
        <button type="button" className="calculator-reset" onClick={reset} disabled={!(hasMeltedInput || hasMazanehInput || hasConversionInput)}>
          <RotateCcw size={14} /> پاک‌کردن
        </button>
      </div>
    </section>
  );
}
