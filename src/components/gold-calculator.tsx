'use client';

import { useMemo, useState } from 'react';
import { Calculator, DatabaseZap, RotateCcw } from 'lucide-react';
import { formatNumericInput, numericValue, sanitizeNumericInput } from '@/lib/numeric-input';
import { instruments, type Quote, type Symbol } from '@/lib/market';

type NumberFieldProps = { label: string; unit: string; value: string; placeholder: string; decimals?: number; onChange: (value: string) => void };

function NumberField({ label, unit, value, placeholder, decimals = 0, onChange }: NumberFieldProps) {
  return <label className="calculator-field"><span>{label}</span><div className="number-input" dir="ltr"><input aria-label={label} autoComplete="off" inputMode={decimals ? 'decimal' : 'numeric'} placeholder={placeholder} spellCheck={false} value={formatNumericInput(value)} onChange={event => onChange(sanitizeNumericInput(event.target.value, decimals))}/><b>{unit}</b></div></label>;
}

const currencyName = (currency: string) => currency === 'TMN' ? 'تومان' : currency === 'USD' ? 'دلار' : currency;
const money = (value: number) => new Intl.NumberFormat('fa-IR', { maximumFractionDigits: 4 }).format(value);

export function GoldCalculator({ quotes }: { quotes: Quote[] }) {
  const [symbol, setSymbol] = useState<Symbol>(quotes[0]?.symbol ?? 'GOLD_MELTED');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [fee, setFee] = useState('');
  const [loadedSide, setLoadedSide] = useState<'buy' | 'sell' | null>(null);
  const quote = quotes.find(item => item.symbol === symbol);
  const instrument = instruments.find(item => item.symbol === symbol) ?? instruments[0];
  const total = useMemo(() => numericValue(quantity) * numericValue(price) + numericValue(fee), [quantity, price, fee]);
  const hasInput = Boolean(quantity || price || fee);
  function load(side: 'buy' | 'sell') { if (!quote) return; setPrice(sanitizeNumericInput(quote[side], 8)); setLoadedSide(side); }
  function reset() { setQuantity(''); setPrice(''); setFee(''); setLoadedSide(null); }

  return <section id="calculator" className="calculator-card calculator-pro" aria-labelledby="calculator-title">
    <div className="calculator-copy"><span className="eyebrow"><Calculator size={15}/> QUICK CALCULATOR</span><h2 id="calculator-title">ماشین‌حساب سریع بازار</h2><p>نماد و سمت قیمت را انتخاب کنید تا آخرین دادهٔ بازار وارد شود؛ سپس می‌توانید همان عدد را دستی تغییر دهید.</p><div className="calculator-rule"><span>محاسبهٔ فعلی</span><code>تعداد × قیمت واحد + هزینه</code></div><small>این ابزار تبدیل واحد، عیار، مالیات و اجرت انجام نمی‌دهد؛ این موارد تا تأیید Product Spec اضافه نمی‌شوند.</small></div>
    <div className="calculator-machine">
      <div className="calculator-source"><label>نماد<select value={symbol} onChange={event => { setSymbol(event.target.value as Symbol); setPrice(''); setLoadedSide(null); }}>{instruments.map(item => <option key={item.symbol} value={item.symbol}>{item.name} · {item.unit}</option>)}</select></label><div><button type="button" onClick={() => load('sell')} disabled={!quote}><DatabaseZap size={14}/> قیمت فروش</button><button type="button" onClick={() => load('buy')} disabled={!quote}><DatabaseZap size={14}/> قیمت خرید</button></div>{quote ? <small>{loadedSide ? `قیمت ${loadedSide === 'sell' ? 'فروش' : 'خرید'} بارگذاری شد` : 'یک سمت قیمت را انتخاب کنید'} · {quote.source}</small> : <small className="form-error">برای این نماد داده‌ای دریافت نشده است؛ ورود دستی فعال است.</small>}</div>
      <div className="calculator-screen" aria-live="polite"><span>مبلغ نهایی</span><strong dir="rtl">{hasInput ? money(total) : '۰'} <small>{currencyName(instrument.currency)}</small></strong><em>{hasInput ? `${money(numericValue(quantity))} ${instrument.unit}` : 'برای شروع تعداد و قیمت را وارد کنید'}</em></div>
      <div className="calculator-form"><NumberField label="تعداد / مقدار" unit={instrument.unit} value={quantity} placeholder="10.5" decimals={4} onChange={setQuantity}/><NumberField label="قیمت هر واحد" unit={currencyName(instrument.currency)} value={price} placeholder="قیمت دستی" decimals={4} onChange={value => { setPrice(value); setLoadedSide(null); }}/><NumberField label="هزینه یا کارمزد" unit={currencyName(instrument.currency)} value={fee} placeholder="اختیاری" decimals={4} onChange={setFee}/></div>
      <button type="button" className="calculator-reset" onClick={reset} disabled={!hasInput}><RotateCcw size={14}/> پاک‌کردن</button>
    </div>
  </section>;
}
