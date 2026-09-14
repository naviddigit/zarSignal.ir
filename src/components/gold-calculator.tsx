'use client';

import { useMemo, useState } from 'react';
import { Calculator, RotateCcw } from 'lucide-react';
import { formatNumericInput, numericValue, sanitizeNumericInput } from '@/lib/numeric-input';

const money = new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 0 });

type NumberFieldProps = {
  label: string; unit: string; value: string; placeholder: string;
  decimals?: number; onChange: (value: string) => void;
};

function NumberField({ label, unit, value, placeholder, decimals = 0, onChange }: NumberFieldProps) {
  return <label className="calculator-field">
    <span>{label}</span>
    <div className="number-input" dir="ltr">
      <input aria-label={label} autoComplete="off" inputMode={decimals ? 'decimal' : 'numeric'}
        placeholder={placeholder} spellCheck={false} value={formatNumericInput(value)}
        onChange={event => onChange(sanitizeNumericInput(event.target.value, decimals))}/>
      <b>{unit}</b>
    </div>
  </label>;
}

export function GoldCalculator() {
  const [weight, setWeight] = useState('');
  const [price, setPrice] = useState('');
  const [fee, setFee] = useState('');
  const total = useMemo(() => numericValue(weight) * numericValue(price) + numericValue(fee), [weight, price, fee]);
  const hasInput = Boolean(weight || price || fee);
  function reset() { setWeight(''); setPrice(''); setFee(''); }

  return <section id="calculator" className="calculator-card calculator-pro" aria-labelledby="calculator-title">
    <div className="calculator-copy">
      <span className="eyebrow"><Calculator size={15}/> QUICK CALCULATOR</span>
      <h2 id="calculator-title">ماشین‌حساب آب‌شده</h2>
      <p>وزن و قیمت هر گرم را وارد کنید. مبلغ‌ها به تومان و وزن به گرم نمایش داده می‌شوند.</p>
      <div className="calculator-rule"><span>محاسبه فعلی</span><code>وزن × قیمت هر گرم + هزینه</code></div>
      <small>عیار، مالیات، اجرت و تبدیل واحد پس از تأیید فرمول‌های Product Spec اضافه می‌شوند.</small>
    </div>
    <div className="calculator-machine">
      <div className="calculator-screen" aria-live="polite">
        <span>مبلغ نهایی</span>
        <strong dir="rtl">{hasInput ? money.format(total) : '۰'} <small>تومان</small></strong>
        <em>{hasInput ? 'براساس ورودی‌های شما' : 'برای شروع مقادیر را وارد کنید'}</em>
      </div>
      <div className="calculator-form">
        <NumberField label="وزن" unit="گرم" value={weight} placeholder="10.5" decimals={4} onChange={setWeight}/>
        <NumberField label="قیمت هر گرم" unit="تومان" value={price} placeholder="8,500,000" onChange={setPrice}/>
        <NumberField label="هزینه یا کارمزد" unit="تومان" value={fee} placeholder="اختیاری" onChange={setFee}/>
      </div>
      <button type="button" className="calculator-reset" onClick={reset} disabled={!hasInput}><RotateCcw size={14}/> پاک‌کردن</button>
    </div>
  </section>;
}
