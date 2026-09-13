'use client';
import { useMemo, useState } from 'react';
import { Calculator } from 'lucide-react';

function readNumber(value: string) { const normalized = value.replace(/[۰-۹]/g, char => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(char))).replaceAll(',',''); const number = Number(normalized); return Number.isFinite(number) && number >= 0 ? number : 0; }
const display = (value: number) => new Intl.NumberFormat('fa-IR',{maximumFractionDigits:0}).format(value);
export function GoldCalculator() {
  const [weight, setWeight] = useState('10'); const [price, setPrice] = useState('0'); const [fee, setFee] = useState('0');
  const total = useMemo(() => readNumber(weight) * readNumber(price) + readNumber(fee), [weight, price, fee]);
  return <section className="calculator-card" aria-labelledby="calculator-title"><div><span className="eyebrow"><Calculator size={14}/> GOLD CALCULATOR</span><h2 id="calculator-title">ماشین‌حساب سادهٔ آبشده</h2><p>وزن و قیمت هر گرم را خودت وارد کن؛ نتیجه بدون فرض پنهان محاسبه می‌شود.</p></div><div className="calculator-form"><label>وزن (گرم)<input inputMode="decimal" value={weight} onChange={event => setWeight(event.target.value)} /></label><label>قیمت هر گرم (تومان)<input inputMode="decimal" placeholder="مثلاً ۸٬۰۰۰٬۰۰۰" value={price} onChange={event => setPrice(event.target.value)} /></label><label>کارمزد / هزینه (تومان)<input inputMode="decimal" value={fee} onChange={event => setFee(event.target.value)} /></label><output><span>برآورد جمع</span><strong>{display(total)} تومان</strong></output></div><small>این ابزار فقط محاسبهٔ ورودی‌های شماست؛ عیار، مالیات، اجرت و قواعد معامله باید جداگانه مشخص شوند.</small></section>;
}
