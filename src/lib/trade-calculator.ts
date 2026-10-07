import { calculatorCatalog, type CalculatorResult } from './calculator-catalog';
import { resolveCalculatorLiveValue } from './calculator-live';
import type { Snapshot } from './market';
export const tradeOperations = ['quickTrade', 'scaleIn', 'positionManager', 'scaleOut', 'tradeSimulator'] as const;
export type TradeOperation = typeof tradeOperations[number];
export const isTradeOperation = (value: string): value is TradeOperation => (tradeOperations as readonly string[]).includes(value);

type Step = { price: number; weight: number; percent?: number };
export type TradeInput = {
  direction: 'BUY' | 'SELL'; rows: Step[]; current: number; entry: number; weight: number;
  target: number; stop: number; buyCost: number; sellCost: number; spread: number;
  capital: number; desired: number; newPrice: number;
};
export function calculateTrade(body: unknown, snapshot: Snapshot): CalculatorResult {
  const req = body as { operation: TradeOperation; inputs?: { gram?: { provenance?: string; value?: number } }; trade?: TradeInput };
  if (!req || !isTradeOperation(req.operation) || !req.trade || typeof req.trade !== 'object') throw new Error('ورودی معامله معتبر نیست.');
  const t = req.trade;
  const checked = (value: unknown, label: string, zero = false) => {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < (zero ? 0 : Number.MIN_VALUE) || value > 1e15) throw new Error(`مقدار «${label}» معتبر نیست.`);
    return value;
  };
  const liveInput = req.inputs?.gram;
  if (!liveInput || !['LIVE', 'MANUAL'].includes(liveInput.provenance ?? '')) throw new Error('منبع قیمت فعلی را مشخص کنید.');
  const live = liveInput.provenance === 'LIVE' ? resolveCalculatorLiveValue(calculatorCatalog.quickTrade.fields[0], snapshot) : null;
  if (liveInput.provenance === 'LIVE' && !live) throw new Error('قیمت لحظه‌ای طلا موجود نیست؛ تازه‌سازی کنید یا دستی وارد کنید.');
  const current = live?.value ?? checked(liveInput.value, 'قیمت فعلی');
  if (!['BUY','SELL'].includes(t.direction)) throw new Error('جهت معامله معتبر نیست.');
  const buyCost = checked(t.buyCost,'کارمزد خرید',true), sellCost = checked(t.sellCost,'کارمزد فروش',true), spread = checked(t.spread,'اسپرد',true);
  const costs = buyCost + sellCost + spread;
  const rows: Step[] = [];
  const max = req.operation === 'positionManager' ? 5 : req.operation === 'quickTrade' ? 1 : 10;
  if (!Array.isArray(t.rows) || t.rows.length > max || (req.operation === 'quickTrade' && t.rows.length > 0)) throw new Error(`حداکثر ${max} پله مجاز است.`);
  for (const row of t.rows) {
    if (!row || typeof row !== 'object') throw new Error('پله نامعتبر است.');
    const price = req.operation === 'tradeSimulator' && row.percent != null
      ? current * (1 + checkedPercent(row.percent) / 100) : checked(row.price,'قیمت پله');
    rows.push({ price: checked(price,'قیمت اجرا'), weight: checked(row.weight,'وزن پله') });
  }
  let weight = 0, invested = 0;
  const outputs: CalculatorResult['outputs'] = [];
  const out = (label: string, value: number, unit = 'تومان') => { if (!Number.isFinite(value)) throw new Error('نتیجه خارج از محدوده است.'); outputs.push({label,value,unit}); };
  const audit: CalculatorResult['inputs'] = [{key:'gram',label:'قیمت فعلی گرم ۱۸',value:current,unit:'تومان / گرم',provenance:live ? 'LIVE':'MANUAL',observedAt:live?.observedAt ?? null,source:live?.source ?? 'ورودی شما'}];
  const addAudit = (key:string,label:string,value:number,unit='تومان') => audit.push({key,label,value,unit,provenance:'MANUAL',observedAt:null,source:'ورودی شما'});
  for (const [i,row] of rows.entries()) { addAudit(`price${i}`,`قیمت پله ${i+1}`,row.price,'تومان / گرم'); addAudit(`weight${i}`,`وزن پله ${i+1}`,row.weight,'گرم'); }
  addAudit('buyCost','کارمزد خرید',buyCost); addAudit('sellCost','کارمزد فروش',sellCost); addAudit('spread','هزینه اسپرد',spread);
  if (req.operation === 'scaleOut' || req.operation === 'positionManager') {
    weight = checked(t.weight,'وزن موجود'); invested = weight * checked(t.entry,'میانگین خرید');
    addAudit('weight','وزن موجود',weight,'گرم'); addAudit('entry','میانگین خرید',t.entry,'تومان / گرم');
  }
  if (req.operation === 'scaleOut') {
    if (!rows.length) throw new Error('حداقل یک پله فروش وارد کنید.');
    const sold = rows.reduce((a,r)=>a+r.weight,0), proceeds = rows.reduce((a,r)=>a+r.weight*r.price,0);
    if (sold > weight + 1e-9) throw new Error('مقدار فروش نمی‌تواند از موجودی بیشتر باشد.');
    const remaining = Math.max(0,weight-sold), buyAllocation = buyCost * sold/weight;
    const realized = proceeds - t.entry*sold - buyAllocation - sellCost - spread;
    const unrealized = (current-t.entry)*remaining - (buyCost-buyAllocation);
    out('فروخته‌شده',sold,'گرم'); out('باقی‌مانده',remaining,'گرم'); out('میانگین فروش',proceeds/sold,'تومان / گرم');
    out('مبلغ فروش',proceeds); out('دریافتی پس از هزینه فروش',proceeds-sellCost-spread); out('سود/زیان تحقق‌یافته',realized); out('بازده بخش فروخته‌شده',realized/(t.entry*sold+buyAllocation)*100,'درصد');
    out('ارزش باقی‌مانده',current*remaining); out('سود/زیان تحقق‌نیافته',unrealized); out('سود/زیان کل',realized+unrealized);
  } else {
    if (req.operation === 'quickTrade') { weight=checked(t.weight,'وزن معامله'); invested=checked(t.entry,'قیمت ورود')*weight; addAudit('entry','قیمت ورود',t.entry,'تومان / گرم'); addAudit('weight','وزن معامله',weight,'گرم'); }
    if (req.operation === 'positionManager') {
      out('وزن قبلی',weight,'گرم'); out('میانگین قبلی',t.entry,'تومان / گرم'); out('سربه‌سر قبلی',t.entry+costs/weight,'تومان / گرم'); out('سود/زیان قبلی',(current-t.entry)*weight-costs);
      if (t.desired > 0) {
        const desired=checked(t.desired,'میانگین هدف'), price=checked(t.newPrice,'قیمت خرید جدید');
        const required = desired === t.entry ? 0 : weight*(t.entry-desired)/(desired-price);
        if (!Number.isFinite(required) || required<0) throw new Error('میانگین هدف با قیمت خرید جدید دست‌یافتنی نیست.');
        out('خرید لازم برای میانگین هدف',required,'گرم');out('سرمایه لازم برای میانگین هدف',required*price);
        addAudit('desired','میانگین هدف',desired);addAudit('newPrice','قیمت خرید هدف',price);
      }
    }
    if (req.operation === 'scaleIn' || req.operation === 'tradeSimulator') { if (!rows.length) throw new Error('حداقل یک پله خرید وارد کنید.'); }
    let additional=0;
    for(const [i,row] of rows.entries()) {
      weight+=row.weight; invested+=row.price*row.weight; additional+=row.price*row.weight;
      if(req.operation === 'tradeSimulator') {
        out(`پله ${i+1} · قیمت اجرا`,row.price,'تومان / گرم'); out(`پله ${i+1} · وزن`,row.weight,'گرم'); out(`پله ${i+1} · سرمایه`,row.price*row.weight);
        out(`پله ${i+1} · سرمایه تجمعی`,invested);out(`پله ${i+1} · وزن تجمعی`,weight,'گرم');out(`پله ${i+1} · میانگین`,invested/weight,'تومان / گرم');out(`پله ${i+1} · فاصله تا میانگین`,(row.price/(invested/weight)-1)*100,'درصد');
      }
    }
    if(req.operation === 'tradeSimulator' && invested+buyCost > checked(t.capital,'سرمایه در دسترس')) throw new Error('سرمایه پله‌ها و کارمزد خرید از سرمایه در دسترس بیشتر است.');
    const average=invested/weight, sign=req.operation === 'quickTrade' && t.direction === 'SELL' ? -1:1;
    const pnl=(price:number)=>sign*(price-average)*weight-costs;
    const breakEven=average+sign*costs/weight;
    if(req.operation === 'tradeSimulator') out('سرمایه باقی‌مانده',t.capital-invested-buyCost);
    out('وزن کل',weight,'گرم'); out('سرمایه خرید',invested);out('سرمایه با کارمزد خرید',invested+buyCost);out('میانگین وزنی',average,'تومان / گرم');
    if(req.operation==='positionManager') out('سرمایه خریدهای جدید',additional);
    out('ارزش فعلی',current*weight);out('سود/زیان فعلی خالص',pnl(current));out('بازده فعلی',pnl(current)/(invested+buyCost)*100,'درصد');out('سربه‌سر با هزینه‌ها',breakEven,'تومان / گرم');out('فاصله قیمت فعلی تا سربه‌سر',(breakEven/current-1)*100,'درصد');
    if(req.operation !== 'positionManager' || t.target > 0 || t.stop > 0) {
    const target=checked(t.target,'قیمت هدف'), stop=checked(t.stop,'حد ضرر');
    if(sign*(target-average)<=0 || sign*(stop-average)>=0) throw new Error('هدف باید در جهت سود و حد ضرر در جهت زیان نسبت به میانگین ورود باشد.');
    const profit=pnl(target), loss=pnl(stop);
    out('ارزش دارایی در هدف',target*weight);out('سود/زیان خالص در هدف',profit);out('بازده در هدف',profit/(invested+buyCost)*100,'درصد');out('سود/زیان خالص در حد ضرر',loss);out('بازده در حد ضرر',loss/(invested+buyCost)*100,'درصد');out('نسبت فاصله هدف به حد ضرر',Math.abs((target-average)/(stop-average)),'برابر');out('نسبت سود به ریسک خالص',Math.max(0,profit)/Math.abs(loss),'برابر');
    addAudit('target','قیمت هدف',target);addAudit('stop','حد ضرر',stop);
    }
  }
  return {formulaId:req.operation,version:'1.0',calculatedAt:new Date().toISOString(),inputs:audit,outputs,constants:[]};
}
function checkedPercent(value: unknown) {
  if(typeof value !== 'number' || !Number.isFinite(value) || value<=-100 || value>10000) throw new Error('درصد پله معتبر نیست.');
  return value;
}
