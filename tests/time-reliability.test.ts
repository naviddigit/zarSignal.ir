import test from 'node:test';
import assert from 'node:assert/strict';
import { defaultWarningPolicy, validWarningWindow, timeReliability } from '../src/lib/time-reliability';
for (const [clock, expected] of [['20:59','STANDARD'],['21:00','WARNING'],['23:59','WARNING'],['00:00','WARNING'],['09:59','WARNING'],['10:00','STANDARD'],['10:01','STANDARD']]) {
  test(`Tehran boundary ${clock} = ${expected}`, () => assert.equal(timeReliability(defaultWarningPolicy, new Date(`2026-09-28T${clock}:00+03:30`)), expected));
}
test('validates exact HH:mm, rejects equal/invalid ranges and supports both window directions', () => {
  for (const [a,b] of [['21:00','21:00'],['24:00','10:00'],['9:00','10:00'],['10:60','10:00'],['','10:00']]) assert.equal(validWarningWindow(a,b),false);
  assert.equal(validWarningWindow('21:00','10:00'),true);
  const daytime = {...defaultWarningPolicy,warningStart:'12:00',warningEnd:'14:00'};
  assert.equal(timeReliability(daytime,new Date('2026-09-28T12:00:00+03:30')),'WARNING');
  assert.equal(timeReliability(daytime,new Date('2026-09-28T14:00:00+03:30')),'STANDARD');
  assert.equal(timeReliability({...daytime,warningStart:'22:30',warningEnd:'08:15'},new Date('2026-09-28T08:14:00+03:30')),'WARNING');
});
test('host timezone never changes Tehran evaluation', () => {
  const previous=process.env.TZ;
  try { for(const zone of ['UTC','America/Los_Angeles','Pacific/Auckland']) {process.env.TZ=zone;assert.equal(timeReliability(defaultWarningPolicy,new Date('2026-09-28T17:30:00Z')),'WARNING');} }
  finally {if(previous===undefined)delete process.env.TZ;else process.env.TZ=previous;}
});
