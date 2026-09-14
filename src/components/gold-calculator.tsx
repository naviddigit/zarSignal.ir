'use client';
import { useMemo,useState } from 'react';
import { Calculator,RotateCcw } from 'lucide-react';
function readNumber(value:string){const normalized=value.replace(/[۰-۹]/g,char=>String('۰۱۲۳۴۵۶۷۸۹'.indexOf(char))).replace(/[٠-٩]/g,char=>String('٠١٢٣٤٥٦٧٨٩'.indexOf(char))).replace(/[٬,]/g,'').replace('٫','.').trim();if(!normalized)return 0;const number=Number(normalized);return Number.isFinite(number)&&number>=0?number:0}
const display=(value:number)=>new Intl.NumberFormat('fa-IR',{maximumFractionDigits:0}).format(value);
export function GoldCalculator(){const[weight,setWeight]=useState('');const[price,setPrice]=useState('');const[fee,setFee]=useState('');const total=useMemo(()=>readNumber(weight)*readNumber(price)+readNumber(fee),[weight,price,fee]);const hasInput=Boolean(weight||price||fee);function reset(){setWeight('');setPrice('');setFee('')}return <section className="calculator-card calculator-pro" aria-labelledby="calculator-title">
 <div className="calculator-copy"><span className="eyebrow"><Calculator size={15}/> QUICK CALCULATOR</span><h2 id="calculator-title">ماشین‌حساب آبشده</h2><p>وزن و قیمت هر گرم را خودتان وارد کنید. واحد همهٔ مبلغ‌ها تومان است.</p><div className="calculator-rule"><span>محاسبهٔ فعلی</span><code>وزن × قیمت هر گرم + هزینه</code></div><small>عیار، مالیات، اجرت و تبدیل واحد پس از تأیید فرمول‌های Product Spec اضافه می‌شوند.</small></div>
 <div className="calculator-machine"><div className="calculator-screen"><span>مبلغ نهایی</span><strong>{hasInput?display(total):'۰'} <small>تومان</small></strong><em>{hasInput?'براساس ورودی‌های شما':'برای شروع مقادیر را وارد کنید'}</em></div><div className="calculator-form">
  <label><span>وزن <b>گرم</b></span><input inputMode="decimal" placeholder="مثلاً ۱۰٫۵" value={weight} onChange={e=>setWeight(e.target.value)}/></label>
  <label><span>قیمت هر گرم <b>تومان</b></span><input inputMode="numeric" placeholder="مثلاً ۸٬۵۰۰٬۰۰۰" value={price} onChange={e=>setPrice(e.target.value)}/></label>
  <label><span>هزینه یا کارمزد <b>تومان</b></span><input inputMode="numeric" placeholder="اختیاری" value={fee} onChange={e=>setFee(e.target.value)}/></label>
 </div><button type="button" className="calculator-reset" onClick={reset} disabled={!hasInput}><RotateCcw size={14}/> پاک‌کردن</button></div>
 </section>}
