'use client';
import { useState, type ReactNode } from 'react';
import { Plus, Trash2, RefreshCw } from 'lucide-react';
import { calculatorCatalog, type CalculatorOperation, type CalculatorResult } from '@/lib/calculator-catalog';
import { resolveCalculatorLiveValue } from '@/lib/calculator-live';
import { isTradeOperation } from '@/lib/trade-calculator';
import type { Snapshot } from '@/lib/market';
import { fetchJson } from '@/lib/fetch-json';
import { Select } from '@/components/ui/select';
import { OverlaySheet } from '@/components/ui/overlay-sheet';
import { formatNumericInput, sanitizeNumericInput } from '@/lib/numeric-input';
const num = (value:number) => new Intl.NumberFormat('fa-IR',{maximumFractionDigits:4}).format(value);
export function TradeCalculator({operation,snapshot,favoriteSlot}:{operation:CalculatorOperation;snapshot:Snapshot;favoriteSlot?:ReactNode}) {
  const [market,setMarket]=useState(snapshot);
  const initial=resolveCalculatorLiveValue(calculatorCatalog.quickTrade.fields[0],snapshot);
  const [mode,setMode]=useState<'LIVE'|'MANUAL'>(initial?'LIVE':'MANUAL');
  const [current,setCurrent]=useState(initial?String(initial.value):'');
  const [direction,setDirection]=useState('BUY');
  const [fields,setFields]=useState<Record<string,string>>({entry:operation==='quickTrade' && initial?String(initial.value):'',weight:'',target:'',stop:'',buyCost:'0',sellCost:'0',spread:'0',capital:'',desired:'0',newPrice:'0'});
  const [rows,setRows]=useState(()=>Array.from({length:operation==='quickTrade'?0:operation==='positionManager'?1:2},()=>({price:'',weight:'',percent:'',trigger:'PRICE'})));
  const [pending,setPending]=useState(false),[error,setError]=useState('');
  const [result,setResult]=useState<CalculatorResult|null>(null);
  if(!isTradeOperation(operation)) return null;
  const sell=operation==='scaleOut',position=operation==='positionManager',quick=operation==='quickTrade',simulator=operation==='tradeSimulator';
  const live=resolveCalculatorLiveValue(calculatorCatalog.quickTrade.fields[0],market);
  const price=mode==='LIVE'?live?.value:Number(current);
  const update=(key:string,value:string)=>{setFields(f=>({...f,[key]:value}));setResult(null);};
  const input=(key:string,label:string,unit='تومان / گرم')=><label className="trade-field"><span>{label}</span><input className="ds-input" inputMode="decimal" dir="ltr" value={formatNumericInput(fields[key]??'')} onChange={e=>update(key,sanitizeNumericInput(e.target.value,6))} aria-label={label}/><small>{unit}</small></label>;
  async function refresh() {
    setPending(true);setError('');
    try { const next=await fetchJson<Snapshot>('/api/public/markets?fresh=1',new AbortController().signal,60000);setMarket(next);if(!resolveCalculatorLiveValue(calculatorCatalog.quickTrade.fields[0],next)) setError('قیمت تازه موجود نیست؛ ورود دستی در دسترس است.'); }
    catch {setError('دریافت قیمت ناموفق بود.');} finally {setPending(false);}
  }
  return <form className="calc-tool-panel trade-calculator" onSubmit={async e=>{
    e.preventDefault();setPending(true);setError('');
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),60000);
    try {
      const trade={...Object.fromEntries(Object.entries(fields).map(([k,v])=>[k,Number(v)])),direction,rows:rows.map(r=>({price:Number(r.price),weight:Number(r.weight),...(simulator&&r.trigger==='PERCENT'?{percent:Number(r.percent)}:{})}))};
      const response=await fetch('/api/public/calculator/professional',{method:'POST',headers:{'Content-Type':'application/json'},signal:controller.signal,body:JSON.stringify({operation,inputs:{gram:{provenance:mode,value:price}},trade})});
      const data=await response.json();if(!response.ok) throw new Error(data.error);setResult(data);
    }catch(e){setError(e instanceof Error?e.message:'محاسبه ناموفق بود.');}finally{clearTimeout(timer);setPending(false);}
  }}>
    <header className="calc-tool-panel__toolbar"><strong>{calculatorCatalog[operation].title}</strong>{favoriteSlot}</header>
    <section className="trade-price" aria-label="قیمت فعلی طلای آب‌شده">
      <div className="trade-price__head"><strong>آب‌شده · تومان / گرم ۱۸</strong><button type="button" className="calc-tool-panel__refresh" onClick={refresh} disabled={pending} aria-label="تازه‌سازی قیمت"><RefreshCw size={16}/></button></div>
      <div className="calc-mode" role="group" aria-label="منبع قیمت فعلی"><button type="button" aria-pressed={mode==='LIVE'} className={mode==='LIVE'?'is-on':''} onClick={()=>{setMode('LIVE');if(!live)void refresh();}}>لحظه‌ای</button><button type="button" aria-pressed={mode==='MANUAL'} className={mode==='MANUAL'?'is-on':''} onClick={()=>{setMode('MANUAL');if(live)setCurrent(String(live.value));}}>دستی</button></div>
      {mode==='LIVE'?<strong className="trade-price__number">{live?num(live.value):'در انتظار قیمت'}<small>{live?new Date(live.observedAt).toLocaleTimeString('fa-IR',{timeZone:'Asia/Tehran'}):''}</small></strong>:<input className="ds-input" aria-label="قیمت فعلی" inputMode="decimal" dir="ltr" value={formatNumericInput(current)} onChange={e=>setCurrent(sanitizeNumericInput(e.target.value,6))}/>}
    </section>
    {quick?<button type="button" className="chart-retry" disabled={!price} onClick={()=>update('entry',String(price))}>قیمت فعلی برای ورود</button>:null}
    {quick?<Select label="نوع معامله" value={direction} onChange={setDirection} options={[{value:'BUY',label:'خرید → فروش در هدف'},{value:'SELL',label:'فروش → بازخرید در هدف'}]}/>:null}
    {(quick||position||sell)?<div className="trade-fields">{input('entry',quick?'قیمت ورود':'میانگین خرید')}{input('weight',quick?'وزن معامله':'وزن موجود','گرم')}</div>:null}
    {simulator?input('capital','سرمایه در دسترس','تومان'):null}
    {!quick?<section className="trade-steps"><header><strong>{sell?'پله‌های فروش':position?'خریدهای جدید':'پله‌های خرید'}</strong><small>{rows.length} / {position?5:10}</small></header>
      {rows.map((row,i)=><div className="trade-step" key={i}>
        <header><b>پله {num(i+1)}</b><button type="button" className="calc-tool-panel__refresh" aria-label={`حذف پله ${i+1}`} onClick={()=>setRows(r=>r.filter((_,index)=>index!==i))}><Trash2 size={15}/></button></header>
        {simulator?<Select label="مبنای قیمت" value={row.trigger} onChange={value=>setRows(r=>r.map((x,index)=>index===i?{...x,trigger:value}:x))} options={[{value:'PRICE',label:'قیمت ثابت'},{value:'PERCENT',label:'درصد از قیمت پایه'}]}/>:null}
        <div className="trade-fields">{(['price','weight'] as const).map(key=>{const percent=key==='price'&&simulator&&row.trigger==='PERCENT';const k=percent?'percent':key;return <label className="trade-field" key={key}><span>{percent?'فاصله از قیمت پایه':key==='price'?'قیمت هر گرم':'وزن (گرم)'}</span><input className="ds-input" inputMode="decimal" dir="ltr" aria-label={`${percent?'درصد':key==='price'?'قیمت':'وزن'} پله ${i+1}`} value={formatNumericInput(row[k])} onChange={e=>setRows(r=>r.map((x,index)=>index===i?{...x,[k]:(percent && e.target.value.trim().startsWith('-') ? '-' : '') + sanitizeNumericInput(e.target.value,6)}:x))}/></label>;})}</div>
        <small className="trade-step__value">ارزش پله: {num((row.trigger==='PERCENT'?Number(price)*(1+Number(row.percent)/100):Number(row.price))*Number(row.weight))} تومان</small>
      </div>)}
      <button type="button" className="chart-retry" disabled={rows.length>=(position?5:10)} onClick={()=>setRows(r=>[...r,{price:'',weight:'',percent:'',trigger:'PRICE'}])}><Plus size={16}/> افزودن پله</button>
    </section>:null}
    {!sell ? position ? <details className="calc-result-details"><summary>هدف و حد ضرر (اختیاری)</summary><div className="trade-fields">{input('target','قیمت هدف')}{input('stop','حد ضرر')}</div></details> : <div className="trade-fields">{input('target','قیمت هدف')}{input('stop','حد ضرر')}</div> : null}
    {position?<details className="calc-result-details"><summary>خرید لازم برای رسیدن به میانگین هدف</summary><div className="trade-fields">{input('desired','میانگین هدف')}{input('newPrice','قیمت خرید جدید')}</div></details>:null}
    <details className="calc-result-details"><summary>کارمزد و هزینه‌ها</summary><div className="trade-fields">{input('buyCost','کارمزد خرید','تومان')}{input('sellCost','کارمزد فروش','تومان')}{input('spread','هزینه اسپرد','تومان')}</div></details>
    <button className="button calc-tool-panel__go" disabled={pending}>{pending?'در حال محاسبه…':'محاسبه'}</button>
    {error?<p className="calc-error" role="alert">{error}</p>:null}
    <OverlaySheet open={!!result} title="نتیجه سناریوی معامله" onClose={()=>setResult(null)}><div className="ds-overlay__result">{result?.outputs.map((o,i)=><div className="ds-overlay__result-row" key={i}><span>{o.label}</span><strong className={o.label.includes('سود')?(o.value<0?'is-down':'is-up'):''}>{num(o.value)} <small>{o.unit}</small></strong></div>)}<small>سناریوی محاسباتی بر اساس ورودی‌ها؛ قیمت هدف پیش‌بینی نشده است.</small></div></OverlaySheet>
  </form>;
}
