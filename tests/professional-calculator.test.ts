import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateProfessional } from '../src/server/professional-calculator';
import { demoQuotes, type Snapshot } from '../src/lib/market';
const empty: Snapshot = { mode: 'live', status: 'unavailable', quotes: [] };
const manual = (value: number) => ({ provenance: 'MANUAL', value });
test('professional calculator runs approved gold and USD Golden Tests through the input engine', () => {
  const converted = calculateProfessional({ operation: 'mazanehTo18k', inputs: { melted: manual(100000000) } }, empty);
  assert.ok(Math.abs(converted.outputs[0].value - 23085091.65) < 0.01);
  const reverse = calculateProfessional({ operation: 'market18kToMazaneh', inputs: { gram: manual(19000000) } }, empty);
  const inputs = { melted: manual(reverse.outputs[0].value), xau: manual(4000), usd: manual(200000) };
  const gold = calculateProfessional({ operation: 'goldBubble', inputs }, empty);
  assert.ok(Math.abs(gold.outputs[0].value - 19290447.94) < 0.01);
  assert.ok(Math.abs(gold.outputs[2].value - -1.5057) < 0.0001);
  const usd = calculateProfessional({ operation: 'usdGap', inputs }, empty);
  assert.ok(Math.abs(usd.outputs[0].value - 196988.69) < 0.01);
  assert.equal(gold.inputs[0].provenance, 'MANUAL');
  assert.equal(gold.constants[0].provenance, 'CONSTANT');
  assert.equal(gold.version, '1.0');
});
test('LIVE ignores forged client values and fails closed on demo, stale or wrong-unit sources', () => {
  const quote = { ...demoQuotes[0], buy: '100000000', sell: '100000000', observedAt: new Date().toISOString() };
  const snapshot: Snapshot = { mode: 'live', status: 'ok', quotes: [quote] };
  const request = { operation: 'mazanehTo18k', inputs: { melted: { provenance: 'LIVE', value: 1 } } };
  assert.equal(calculateProfessional(request, snapshot).inputs[0].value, 100000000);
  assert.throws(() => calculateProfessional(request, { ...snapshot, mode: 'demo' }));
  assert.throws(() => calculateProfessional(request, { ...snapshot, quotes: [{ ...quote, currency: 'IRR' }] }));
  assert.throws(() => calculateProfessional(request, { ...snapshot, quotes: [{ ...quote, observedAt: '2020-01-01' }] }));
  assert.throws(() => calculateProfessional({ operation: 'unknownOp' as 'mazanehTo18k', inputs: {} }, snapshot));
  const silver = calculateProfessional({
    operation: 'silverBubble',
    inputs: { xag: manual(50), usd: manual(200000), silver999: manual(350000) },
  }, empty);
  assert.equal(silver.version, 'V5.4-SILVER.1');
  assert.ok(Math.abs(silver.outputs[0].value - 321185.9582205935) < 0.01);
  assert.ok(Math.abs(silver.outputs[2].value - 8.971139939939944) < 0.0001);
  assert.throws(() => calculateProfessional({ operation: 'mazanehTo18k', inputs: { melted: manual(-1) } }, snapshot));
  assert.throws(() => calculateProfessional({ operation: 'mazanehTo18k', inputs: { melted: { provenance: 'CONSTANT', value: 1 } } }, snapshot));
});
test('18k live price is derived only from a fresh 705 mazaneh quote', () => {
  const observedAt = new Date().toISOString();
  const direct18k = { ...demoQuotes[1], observedAt, buy: '1', sell: '1' };
  const request = { operation: 'market18kToMazaneh', inputs: { gram: { provenance: 'LIVE', value: 1 } } };
  assert.throws(() => calculateProfessional(request, { mode: 'live', status: 'ok', quotes: [direct18k] }), /داده تازه و هم‌واحد/);
  const melted = { ...demoQuotes[0], observedAt, buy: '43318000', sell: '43318000' };
  const result = calculateProfessional(request, { mode: 'live', status: 'ok', quotes: [direct18k, melted] });
  assert.equal(result.inputs[0].value, 10000000);
});
test('silver LIVE accepts a fresh one-sided watch price but rejects inverted bid and ask', () => {
  const observedAt = new Date().toISOString();
  const base = demoQuotes[0];
  const quotes = [
    { ...base, symbol: 'XAG_USD' as const, buy: '50', sell: '0', currency: 'USD' as const, unit: 'اونس تروا', observedAt },
    { ...base, symbol: 'USD' as const, buy: '0', sell: '200000', currency: 'TMN' as const, unit: 'دلار', observedAt },
    { ...base, symbol: 'SILVER_999' as const, buy: '350000', sell: '0', currency: 'TMN' as const, unit: 'گرم', observedAt },
  ];
  const snapshot: Snapshot = { mode: 'live', status: 'ok', quotes };
  const request = { operation: 'silverBubble', inputs: { xag: { provenance: 'LIVE' }, usd: { provenance: 'LIVE' }, silver999: { provenance: 'LIVE' } } };
  const result = calculateProfessional(request, snapshot);
  assert.equal(result.inputs[0].value, 50);
  assert.equal(result.inputs[1].value, 200000);
  assert.equal(result.inputs[2].value, 350000);
  assert.throws(() => calculateProfessional(request, { ...snapshot, quotes: [{ ...quotes[0], buy: '55', sell: '50' }, ...quotes.slice(1)] }));
});

test('LOCK-V3 manual metal, UAE, FX and coin calculations preserve units and signs', () => {
  const fineGold = calculateProfessional({ operation: 'fineGold', inputs: { weight: manual(10), purity: manual(750), gram: manual(10000000) } }, empty);
  assert.deepEqual(fineGold.outputs.map(o => o.value), [7.5, 10, 100000000]);
  const uae = calculateProfessional({ operation: 'uaeGold', inputs: { uae24: manual(300), aed: manual(30000), gram: manual(7000000) } }, empty);
  assert.equal(uae.outputs[0].value, 9000000);
  assert.ok(Math.abs(uae.outputs[1].value - 6756756.756756756) < 0.01);
  assert.ok(uae.outputs[2].value > 0);
  const gap = calculateProfessional({ operation: 'fxRateGap', inputs: { implied: manual(90000), derived: manual(100000) } }, empty);
  assert.deepEqual(gap.outputs.map(o => o.value), [-10000, -10]);
  const buy = calculateProfessional({ operation: 'coinBuy', inputs: { price: manual(100000000), quantity: manual(2), cost: manual(500000) } }, empty);
  assert.equal(buy.outputs[1].value, 200500000);
  const sell = calculateProfessional({ operation: 'coinSell', inputs: { price: manual(100000000), quantity: manual(2), cost: manual(500000) } }, empty);
  assert.equal(sell.outputs[1].value, 199500000);
  assert.throws(() => calculateProfessional({ operation: 'coinBuy', inputs: { price: manual(100), quantity: manual(1.5), cost: manual(0) } }, empty));
});

test('silver bar uses global metal value and explicit costs, not a fixed mint premium', () => {
  const result = calculateProfessional({ operation: 'silverBarCost', inputs: {
    weight: manual(1000), purity: manual(999), xag: manual(32), usd: manual(100000),
    mint: manual(500000), tax: manual(50000), spread: manual(100000), cost: manual(0),
  } }, empty);
  assert.equal(result.outputs[0].value, 999);
  const theoreticalMetal = 999 / 31.1034768 * 32 * 100000;
  assert.ok(Math.abs(result.outputs[1].value - theoreticalMetal) < 0.001);
  assert.ok(Math.abs(result.outputs[2].value - theoreticalMetal - 650000) < 0.001);
  assert.throws(() => calculateProfessional({ operation: 'fineSilver', inputs: { weight: manual(100), purity: manual(1001) } }, empty));
});

test('melted P&L is a theoretical preview with costs deducted once', () => {
  const result = calculateProfessional({ operation: 'meltedPnl', inputs: {
    average: manual(100000000), melted: manual(110000000), quantity: manual(2), cost: manual(1000000),
  } }, empty);
  assert.deepEqual(result.outputs.slice(0, 4).map(o => o.value), [220000000, 20000000, 1000000, 19000000]);
  assert.ok(Math.abs(result.outputs[4].value - 19 / 201 * 100) < 1e-10);
  assert.equal(calculateProfessional({ operation: 'percentageChange', inputs: { before: manual(100), after: manual(90) } }, empty).outputs[1].value, -10);
});

test('M12 gold/silver swap keeps USD out of ounce ratio and purity scaling does not invent an edge', () => {
  const run = (purity: number, usd: number) => calculateProfessional({ operation: 'goldSilverSwap', inputs: {
    weight: manual(10), purity: manual(purity), xau: manual(3000), xag: manual(30), usd: manual(usd),
    gram: manual(8000000), silver999: manual(100000),
  } }, empty);
  const pure = run(999, 100000);
  const lowerPurity = run(925, 200000);
  assert.equal(pure.outputs[0].value, 100);
  assert.equal(lowerPurity.outputs[0].value, 100);
  assert.ok(lowerPurity.outputs[1].value > pure.outputs[1].value);
  assert.ok(Math.abs(lowerPurity.outputs[7].value - pure.outputs[7].value) < 1e-10);
  assert.ok(Math.abs(pure.outputs[7].value - ((pure.outputs[4].value / pure.outputs[1].value - 1) * 100)) < 1e-10);
});

test('capital, coin P&L, mint premium and AED peg use explicit costs and existing registry', () => {
  const gold = calculateProfessional({ operation: 'capitalGold', inputs: { capital: manual(100000000), gram: manual(10000000), cost: manual(0) } }, empty);
  assert.equal(gold.outputs[0].value, 10);
  const coins = calculateProfessional({ operation: 'coinCapital', inputs: { capital: manual(250000000), price: manual(100000000), cost: manual(1000000) } }, empty);
  assert.deepEqual(coins.outputs.map(o => o.value), [2, 202000000, 48000000]);
  const pnl = calculateProfessional({ operation: 'coinPnl', inputs: { buyPrice: manual(100000000), sellPrice: manual(90000000), quantity: manual(2), cost: manual(1000000) } }, empty);
  assert.equal(pnl.outputs[2].value, -21000000);
  const mint = calculateProfessional({ operation: 'silverMintPremium', inputs: { barPrice: manual(105000000), metalValue: manual(100000000) } }, empty);
  assert.deepEqual(mint.outputs.map(o => o.value), [5000000, 5]);
  const aed = calculateProfessional({ operation: 'aedDerivedUsd', inputs: { aed: manual(30000), usd: manual(110000) } }, empty);
  assert.equal(aed.outputs[0].value, 110175);
  assert.throws(() => calculateProfessional({ operation: 'capitalSilver', inputs: { capital: manual(100), silver999: manual(50), cost: manual(100) } }, empty));
});

test('melted-gold target, averaging, partial sale and break-even keep cost basis explicit', () => {
  const target = calculateProfessional({ operation: 'meltedTarget', inputs: {
    average: manual(100), quantity: manual(10), melted: manual(110), target: manual(120), cost: manual(5),
  } }, empty);
  assert.equal(target.outputs[1].value, 1200);
  assert.equal(target.outputs[2].value, 195);
  const buy = calculateProfessional({ operation: 'meltedNewBuy', inputs: {
    average: manual(100), quantity: manual(10), buyPrice: manual(80), added: manual(10), cost: manual(20),
  } }, empty);
  assert.equal(buy.outputs[0].value, 91);
  assert.equal(buy.outputs[3].value, 20);
  const average = calculateProfessional({ operation: 'meltedTargetAverage', inputs: {
    average: manual(100), quantity: manual(10), buyPrice: manual(80), target: manual(90),
  } }, empty);
  assert.equal(average.outputs[0].value, 10);
  assert.throws(() => calculateProfessional({ operation: 'meltedTargetAverage', inputs: {
    average: manual(100), quantity: manual(10), buyPrice: manual(95), target: manual(90),
  } }, empty), /دست‌یافتنی/);
  const sold = calculateProfessional({ operation: 'meltedPartialSell', inputs: {
    average: manual(100), quantity: manual(10), sellPrice: manual(120), sold: manual(4), cost: manual(5),
  } }, empty);
  assert.deepEqual(sold.outputs.filter((_, i) => [0, 1, 2, 3].includes(i)).map(o => o.value), [480, 75, 6, 600]);
  assert.throws(() => calculateProfessional({ operation: 'meltedPartialSell', inputs: {
    average: manual(100), quantity: manual(10), sellPrice: manual(120), sold: manual(11), cost: manual(0),
  } }, empty));
  const breakEven = calculateProfessional({ operation: 'meltedBreakEven', inputs: {
    average: manual(100), quantity: manual(10), melted: manual(110), cost: manual(50),
  } }, empty);
  assert.equal(breakEven.outputs[0].value, 105);
});
