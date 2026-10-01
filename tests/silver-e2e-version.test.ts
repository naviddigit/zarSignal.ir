import assert from 'node:assert/strict';
import test from 'node:test';
import { calculatorCatalog } from '../src/lib/calculator-catalog';
import { SILVER_FORMULA_VERSION, silverBubbleV54 } from '../src/server/bubble-formulas';
import { computeLiveBubbles } from '../src/server/live-bubbles';
import { calculateProfessional } from '../src/server/professional-calculator';
import type { Snapshot } from '../src/lib/market';

test('silver version is identical across catalog, live bubbles, and calculator', () => {
  assert.equal(calculatorCatalog.silverBubble.version, 'V5.4-SILVER.1');
  assert.equal(SILVER_FORMULA_VERSION, 'V5.4-SILVER.1');

  const now = new Date().toISOString();
  const snapshot: Snapshot = {
    mode: 'live',
    status: 'ok',
    pollSeconds: 60,
    quotes: [
      { symbol: 'GOLD_MELTED', currency: 'TMN', unit: 'مثقال', buy: '100000000', sell: '100000000', source: 't', sourceUrl: null, observedAt: now, fetchedAt: now },
      { symbol: 'XAU_USD', currency: 'USD', unit: 'اونس تروا', buy: '4000', sell: '4000', source: 't', sourceUrl: null, observedAt: now, fetchedAt: now },
      { symbol: 'USD', currency: 'TMN', unit: 'دلار', buy: '200000', sell: '200000', source: 't', sourceUrl: null, observedAt: now, fetchedAt: now },
      { symbol: 'XAG_USD', currency: 'USD', unit: 'اونس تروا', buy: '50', sell: '50', source: 't', sourceUrl: null, observedAt: now, fetchedAt: now },
      { symbol: 'SILVER_999', currency: 'TMN', unit: 'گرم', buy: '350000', sell: '350000', source: 't', sourceUrl: null, observedAt: now, fetchedAt: now },
      { symbol: 'AED', currency: 'TMN', unit: 'درهم', buy: '1', sell: '1', source: 't', sourceUrl: null, observedAt: now, fetchedAt: now },
      { symbol: 'GOLD_18K', currency: 'TMN', unit: 'گرم', buy: '1', sell: '1', source: 't', sourceUrl: null, observedAt: now, fetchedAt: now },
      { symbol: 'SEKE_CASH', currency: 'TMN', unit: 'عدد', buy: '1', sell: '1', source: 't', sourceUrl: null, observedAt: now, fetchedAt: now },
      { symbol: 'ROB_SEKE', currency: 'TMN', unit: 'عدد', buy: '1', sell: '1', source: 't', sourceUrl: null, observedAt: now, fetchedAt: now },
    ],
  };

  const live = computeLiveBubbles(snapshot).find(c => c.key === 'SILVER_BUBBLE')!;
  assert.equal(live.formulaVersion, 'V5.4-SILVER.1');
  assert.ok(live.percent != null);

  const direct = silverBubbleV54({ xagUsd: 50, usdIrt: 200000, silver999Market: 350000 });
  assert.ok(Math.abs(live.percent! - direct.silverPremiumPct) < 1e-9);

  const calc = calculateProfessional({
    operation: 'silverBubble',
    inputs: {
      xag: { provenance: 'MANUAL', value: 50 },
      usd: { provenance: 'MANUAL', value: 200000 },
      silver999: { provenance: 'MANUAL', value: 350000 },
    },
  }, snapshot);
  assert.equal(calc.version, 'V5.4-SILVER.1');
  const pct = calc.outputs.find(o => o.unit === 'درصد')?.value;
  assert.ok(pct != null);
  assert.ok(Math.abs(pct! - direct.silverPremiumPct) < 1e-9);
});
