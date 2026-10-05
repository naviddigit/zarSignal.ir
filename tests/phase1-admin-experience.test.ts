import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decideCalculatorModuleAccess,
  defaultCalculatorAccessPolicy,
  normalizeCalculatorAccessPolicy,
} from '../src/lib/calculator-access';
import {
  defaultAnalysisReadingSettings,
  effectiveTypingCps,
  normalizeAnalysisReadingSettings,
  readingSpeedLabel,
} from '../src/lib/analysis-reading-settings';
import { explainEvidenceStatus, USD_GAP_PUBLIC_LABEL } from '../src/lib/evidence-status-reason';
import { typingCharsPerSecond, graphemesForElapsed } from '../src/lib/market-view-typing';

test('reading settings clamp base CPS and fast multiplier', () => {
  const low = normalizeAnalysisReadingSettings({ baseCps: 5, fastMultiplier: 0.2, sectionAppearMs: 10 });
  assert.equal(low.baseCps, 15);
  assert.equal(low.fastMultiplier, 1);
  assert.equal(low.sectionAppearMs, 80);
  const high = normalizeAnalysisReadingSettings({ baseCps: 200, fastMultiplier: 5, sectionAppearMs: 99999 });
  assert.equal(high.baseCps, 80);
  assert.equal(high.fastMultiplier, 2);
  assert.equal(high.sectionAppearMs, 2000);
});

test('effective typing CPS has no hidden length acceleration', () => {
  assert.equal(typingCharsPerSecond(50, 12_000, 45), 45);
  assert.equal(typingCharsPerSecond(5000, 12_000, 45), 45);
  const at1 = graphemesForElapsed(2000, 400, 1, 12_000, 45);
  const at2 = graphemesForElapsed(2000, 400, 2, 12_000, 45);
  assert.equal(at1, 90);
  assert.equal(at2, 180);
  assert.match(readingSpeedLabel(defaultAnalysisReadingSettings, 1), /نویسه در ثانیه/);
  assert.equal(Math.round(effectiveTypingCps(defaultAnalysisReadingSettings, 2)), 90);
});

test('evidence reasons stay specific — coin with price is reference inactive', () => {
  assert.equal(
    explainEvidenceStatus({ id: 'coin', status: 'blocked', rawReason: 'x', hasMarketPrice: true }),
    'مرجع محاسباتی سکه فعلاً فعال نیست',
  );
  assert.equal(
    explainEvidenceStatus({ id: 'coin', status: 'blocked', rawReason: 'x', hasMarketPrice: false }),
    'قیمت موجود نیست',
  );
  assert.equal(
    explainEvidenceStatus({ id: 'gold', status: 'unavailable', rawReason: 'missing_GOLD_MELTED', hasMarketPrice: false }),
    'قیمت مظنه آب‌شده موجود نیست',
  );
  assert.equal(
    explainEvidenceStatus({ id: 'usd', status: 'stale', rawReason: 'محاسبه از داده قدیمی', hasMarketPrice: true }),
    'ورودی قدیمی است',
  );
  assert.equal(
    explainEvidenceStatus({ id: 'silver', status: 'unavailable', rawReason: 'rial_toman_mismatch', hasMarketPrice: false }),
    'واحد نامعتبر است',
  );
  assert.match(USD_GAP_PUBLIC_LABEL, /فاصلهٔ دلار بازار با دلار ضمنی طلا/);
  assert.doesNotMatch(USD_GAP_PUBLIC_LABEL, /ارزش بنیادی|حباب مستقل/);
});

test('calculator module access: free / plans / disabled with trial and pending', () => {
  const policy = normalizeCalculatorAccessPolicy({
    goldBubble: { mode: 'plans', allowedLevels: ['PROFESSIONAL', 'ADVANCED_PROFESSIONAL'] },
    usdGap: { mode: 'disabled', allowedLevels: [] },
  });
  assert.equal(decideCalculatorModuleAccess('mazanehTo18k', policy, 'FREE').ok, true);
  assert.equal(decideCalculatorModuleAccess('goldBubble', policy, 'FREE').ok, false);
  assert.equal(decideCalculatorModuleAccess('goldBubble', policy, 'PROFESSIONAL').ok, true);
  assert.equal(decideCalculatorModuleAccess('goldBubble', policy, 'HOME', { statusLabel: 'آزمایشی' }).ok, false);
  const trialHome = normalizeCalculatorAccessPolicy({
    goldBubble: { mode: 'plans', allowedLevels: ['HOME', 'PROFESSIONAL'] },
  });
  assert.equal(decideCalculatorModuleAccess('goldBubble', trialHome, 'HOME', { statusLabel: 'آزمایشی' }).ok, true);
  const denied = decideCalculatorModuleAccess('usdGap', policy, 'ADVANCED_PROFESSIONAL');
  assert.equal(denied.ok, false);
  if (!denied.ok) assert.equal(denied.code, 'disabled');
  const pending = decideCalculatorModuleAccess('goldBubble', policy, 'FREE', {
    statusLabel: 'در انتظار پرداخت',
  });
  assert.equal(pending.ok, false);
  if (!pending.ok) assert.equal(pending.code, 'forbidden');
  assert.equal(
    decideCalculatorModuleAccess('mazanehTo18k', defaultCalculatorAccessPolicy, 'FREE', {
      statusLabel: 'در انتظار پرداخت',
    }).ok,
    true,
  );
  // True absence of settings still errors — but callers that fall back to defaults must not pass false.
  const settingsDown = decideCalculatorModuleAccess('mazanehTo18k', defaultCalculatorAccessPolicy, 'FREE', {
    settingsAvailable: false,
  });
  assert.equal(settingsDown.ok, false);
  if (!settingsDown.ok) assert.equal(settingsDown.code, 'settings_error');
  // Defaults with available omitted/true stay usable (DB-down fail-open path).
  assert.equal(
    decideCalculatorModuleAccess('mazanehTo18k', defaultCalculatorAccessPolicy, 'FREE').ok,
    true,
  );
  const paidDenied = decideCalculatorModuleAccess('goldBubble', policy, 'FREE');
  assert.equal(paidDenied.ok, false);
  if (!paidDenied.ok) {
    assert.equal(paidDenied.code, 'forbidden');
    assert.match(paidDenied.message, /ارتقاء|ارتقا/);
  }
});

test('local market-equivalent, physical-weight and purity tools use the admin plan policy', () => {
  const policy = normalizeCalculatorAccessPolicy({
    marketWeight: { mode: 'plans', allowedLevels: ['HOME', 'PROFESSIONAL'] },
    weight: { mode: 'plans', allowedLevels: ['HOME', 'PROFESSIONAL'] },
    purity: { mode: 'disabled', allowedLevels: [] },
  });
  assert.equal(decideCalculatorModuleAccess('marketWeight', policy, 'FREE').ok, false);
  assert.equal(decideCalculatorModuleAccess('marketWeight', policy, 'HOME', { statusLabel: 'آزمایشی' }).ok, true);
  assert.equal(decideCalculatorModuleAccess('weight', policy, 'FREE').ok, false);
  assert.equal(decideCalculatorModuleAccess('weight', policy, 'HOME', { statusLabel: 'آزمایشی' }).ok, true);
  assert.equal(decideCalculatorModuleAccess('purity', policy, 'PROFESSIONAL').ok, false);
  assert.equal(decideCalculatorModuleAccess('purity', defaultCalculatorAccessPolicy, 'FREE').ok, true);
});
