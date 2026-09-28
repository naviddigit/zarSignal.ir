import test from 'node:test';
import assert from 'node:assert/strict';
import { keypadMath } from '../src/lib/keypad-math';
test('keypad supports real arithmetic without dynamic execution', () => {
  assert.equal(keypadMath(12, 3, '×'), 36);
  assert.equal(keypadMath(12, 3, '÷'), 4);
  assert.equal(keypadMath(12, 3, '−'), 9);
  assert.equal(keypadMath(0.1, 0.2, '+'), 0.3);
  assert.throws(() => keypadMath(12, 0, '÷'));
  assert.throws(() => keypadMath(2, 3, '−'));
  assert.throws(() => keypadMath(Infinity, 2, '×'));
});
