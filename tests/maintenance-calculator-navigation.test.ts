import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeMaintenanceHtml, isMaintenanceBypass } from '../src/lib/maintenance';
import { defaultCalculatorNavigation, normalizeCalculatorNavigation, visibleCalculatorTools } from '../src/lib/calculator-navigation';

test('maintenance keeps the admin recovery path open and escapes editable copy', () => {
  assert.equal(isMaintenanceBypass('/admin/maintenance'), true);
  assert.equal(isMaintenanceBypass('/api/admin/session'), true);
  assert.equal(isMaintenanceBypass('/api/auth/session'), true);
  assert.equal(isMaintenanceBypass('/robots.txt'), true);
  assert.equal(isMaintenanceBypass('/calculator'), false);
  assert.equal(isMaintenanceBypass('/api/public/markets'), false);
  assert.equal(isMaintenanceBypass('/administrator'), false);
  assert.equal(escapeMaintenanceHtml('<img src=x onerror="x">'), '&lt;img src=x onerror=&quot;x&quot;&gt;');
});

test('calculator layout keeps valid categories, removes injected tools, and pins favorites first', () => {
  const navigation = normalizeCalculatorNavigation({
    categories: ['coin', 'coin', 'invalid', 'gold'],
    tools: { gold: ['fineGold', 'fineGold', 'unapproved'] },
    starred: { gold: ['goldBubble', 'unapproved'] },
  });
  assert.deepEqual(navigation.categories, ['coin', 'gold', 'silver', 'fx']);
  assert.equal(navigation.tools.gold[0], 'fineGold');
  assert.equal(navigation.tools.gold.includes('unapproved'), false);
  assert.deepEqual(navigation.starred.gold, ['goldBubble']);
  assert.equal(visibleCalculatorTools('gold', navigation, { favorites: ['goldBubble'] })[0], 'goldBubble');
  assert.deepEqual(defaultCalculatorNavigation.starred.gold, []);
  assert.equal(
    visibleCalculatorTools('gold', navigation, { favorites: [], lockedIds: ['fineGold'] })[0] !== 'fineGold',
    true,
  );
  assert.equal(defaultCalculatorNavigation.categories.length, 4);
});
