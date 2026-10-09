import test from 'node:test';
import assert from 'node:assert/strict';
import { escapeMaintenanceHtml, isMaintenanceBypass } from '../src/lib/maintenance';
import { calculatorToolsByProduct, defaultCalculatorNavigation, normalizeCalculatorNavigation, visibleCalculatorTools } from '../src/lib/calculator-navigation';
import { readCalculatorFavorites } from '../src/lib/calculator-favorites';

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

test('melted position tools move from gold to trade, including saved admin layouts', () => {
  const moved = ['meltedPnl', 'meltedPartialSell', 'meltedBreakEven', 'meltedNewBuy', 'meltedTargetAverage', 'meltedTarget'];
  const navigation = normalizeCalculatorNavigation({ tools: { gold: moved, trade: ['scaleIn'] } });
  for (const id of moved) {
    assert.equal(calculatorToolsByProduct.gold.includes(id as never), false);
    assert.equal(navigation.tools.gold.includes(id), false);
    assert.equal(navigation.tools.trade.includes(id), true);
  }
  assert.equal(navigation.tools.trade[0], 'scaleIn');
});

test('personal favorites follow moved tools without selecting new favorites', () => {
  const globals = globalThis as unknown as { window?: unknown; localStorage?: unknown };
  const oldWindow = globals.window;
  const oldStorage = globals.localStorage;
  globals.window = {};
  globals.localStorage = { getItem: () => JSON.stringify({ gold: ['goldBubble', 'meltedPnl'], trade: ['scaleIn'] }) };
  try {
    const favorites = readCalculatorFavorites();
    assert.deepEqual(favorites.gold, ['goldBubble']);
    assert.deepEqual(favorites.trade, ['scaleIn', 'meltedPnl']);
  } finally {
    if (oldWindow === undefined) delete globals.window; else globals.window = oldWindow;
    if (oldStorage === undefined) delete globals.localStorage; else globals.localStorage = oldStorage;
  }
});

test('calculator layout keeps valid categories, removes injected tools, and pins favorites first', () => {
  const navigation = normalizeCalculatorNavigation({
    categories: ['coin', 'coin', 'invalid', 'gold'],
    tools: { gold: ['fineGold', 'fineGold', 'unapproved'] },
    starred: { gold: ['goldBubble', 'unapproved'] },
  });
  assert.deepEqual(navigation.categories, ['coin', 'gold', 'silver', 'fx', 'trade']);
  assert.equal(navigation.tools.gold[0], 'fineGold');
  assert.equal(navigation.tools.gold.includes('unapproved'), false);
  assert.deepEqual(navigation.starred.gold, ['goldBubble']);
  assert.equal(visibleCalculatorTools('gold', navigation, { favorites: ['goldBubble'] })[0], 'goldBubble');
  assert.deepEqual(defaultCalculatorNavigation.starred.gold, []);
  assert.equal(
    visibleCalculatorTools('gold', navigation, { favorites: [], lockedIds: ['fineGold'] })[0] !== 'fineGold',
    true,
  );
  assert.equal(defaultCalculatorNavigation.categories.length, 5);
});
