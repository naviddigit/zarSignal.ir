import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateTrade, type TradeInput } from '../src/lib/trade-calculator';
import { resolveCalculatorLiveValue } from '../src/lib/calculator-live';
import { calculatorCatalog } from '../src/lib/calculator-catalog';
import type { Snapshot } from '../src/lib/market';
const empty: Snapshot={mode:'live',status:'unavailable',quotes:[]};
const base:TradeInput={direction:'BUY',rows:[],current:100,entry:100,weight:10,target:120,stop:90,buyCost:5,sellCost:3,spread:2,capital:10000,desired:0,newPrice:0};
const run=(operation:string,trade:Partial<TradeInput>)=>calculateTrade({operation,inputs:{gram:{provenance:'MANUAL',value:100}},trade:{...base,...trade}},empty);
const values=(result:ReturnType<typeof run>)=>Object.fromEntries(result.outputs.map(o=>[o.label,o.value]));
test('quick-trade weighted entries, cost accounting, sell direction and partial exits',()=>{
  const quick=values(run('quickTrade',{}));assert.equal(quick['سود/زیان خالص در هدف'],190);assert.equal(quick['سربه‌سر با هزینه‌ها'],101);
  const sale=values(run('quickTrade',{direction:'SELL',target:80,stop:110}));assert.equal(sale['سود/زیان خالص در هدف'],190);assert.equal(sale['سربه‌سر با هزینه‌ها'],99);
  const scaled=values(run('scaleIn',{rows:[{price:100,weight:10},{price:80,weight:30}],target:120,stop:70}));assert.equal(scaled['میانگین وزنی'],85);assert.equal(scaled['وزن کل'],40);
  const exit=values(run('scaleOut',{rows:[{price:120,weight:4}]}));assert.equal(exit['باقی‌مانده'],6);assert.equal(exit['سود/زیان تحقق‌یافته'],73);assert.equal(exit['سود/زیان تحقق‌نیافته'],-3);assert.equal(exit['سود/زیان کل'],70);
  assert.throws(()=>run('scaleOut',{rows:[{price:120,weight:11}]}),/موجودی/);
  const position=values(run('positionManager',{rows:[{price:80,weight:10}],desired:90,newPrice:80,stop:70}));assert.equal(position['میانگین وزنی'],90);assert.equal(position['خرید لازم برای میانگین هدف'],10);
  const sim=values(run('tradeSimulator',{rows:[{price:0,percent:-10,weight:10}],stop:70}));assert.equal(sim['میانگین وزنی'],90);
  assert.throws(()=>run('tradeSimulator',{capital:800,rows:[{price:90,weight:10}],stop:70}),/سرمایه/);
  assert.throws(()=>run('scaleIn',{rows:Array.from({length:11},()=>({price:100,weight:1}))}),/حداکثر/);
});
test('UAE shared live input derives 18k from ounces and rejects stale/wrong units',()=>{
  const at=new Date().toISOString();const quote={symbol:'XAU_USD' as const,buy:'4000',sell:'4000',unit:'اونس تروا',currency:'USD',source:'test',sourceUrl:null,observedAt:at,fetchedAt:at};
  const snapshot:Snapshot={mode:'live',status:'ok',quotes:[quote]};const field=calculatorCatalog.uaeGold.fields[0];
  const live=resolveCalculatorLiveValue(field,snapshot);assert.ok(live);assert.ok(Math.abs(live.value - 4000*3.6725/31.1034768*.75)<1e-9);
  assert.equal(resolveCalculatorLiveValue(field,{...snapshot,quotes:[{...quote,unit:'گرم'}]}),null);
  assert.equal(resolveCalculatorLiveValue(field,{...snapshot,quotes:[{...quote,observedAt:'2020-01-01'}]}),null);
});
