import assert from 'node:assert/strict';
import test from 'node:test';
import { formulaInput } from '../src/server/formula-input';

const base = {
  key: 'GOLD_BUBBLE', version: 1, title: 'حباب طلا', description: 'فرمول مرجع برای محاسبه حباب بازار طلا', expression: '(market - theoretical) / theoretical * 100',
  inputs: ['GOLD_MELTED.sell', 'XAU_USD.sell'], units: ['TMN/مثقال:sell', 'USD/اونس تروا:sell'], constants: [], rounding: 'دو رقم اعشار، نیم به بالا',
  edgeCases: ['theoretical must be greater than zero'], fixtures: [], status: 'DRAFT',
};

test('formula drafts require explicit inputs, units, rounding and edge cases', () => {
  assert.equal(formulaInput.safeParse(base).success, true);
  assert.equal(formulaInput.safeParse({ ...base, inputs: [] }).success, false);
  assert.equal(formulaInput.safeParse({ ...base, units: [] }).success, false);
  assert.equal(formulaInput.safeParse({ ...base, inputs: ['unknown.sell'] }).success, false);
});

test('approved formulas require a reference fixture and effective date', () => {
  assert.equal(formulaInput.safeParse({ ...base, status: 'APPROVED' }).success, false);
  assert.equal(formulaInput.safeParse({ ...base, status: 'APPROVED', fixtures: ['market=110, theoretical=100 => 10%'], effectiveAt: '2026-09-15T12:00:00.000Z' }).success, true);
});
