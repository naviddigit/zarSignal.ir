import assert from 'node:assert/strict';
import test from 'node:test';
import { bubbleDisplayState, type LiveBubbleCard } from '../src/lib/bubbles';
import type { Quote } from '../src/lib/market';

test('homepage keeps fresh, expired, missing and blocked data distinct without a trading result', () => {
  const now = Date.parse('2026-09-26T12:00:00Z');
  const input: Quote = { symbol: 'USD', buy: '200000', sell: '200000', currency: 'TMN', unit: 'دلار', source: 'زرسیگنال', sourceUrl: null, observedAt: new Date(now).toISOString(), fetchedAt: new Date(now).toISOString() };
  const card: LiveBubbleCard = { key: 'GOLD_BUBBLE', status: 'ok', percent: 0, theoretical: 1, reason: '' };
  assert.equal(bubbleDisplayState(card, [input], now), 'ok');
  assert.equal(bubbleDisplayState(card, [input], now + 16 * 60_000), 'stale');
  assert.equal(bubbleDisplayState({ ...card, status: 'stale' }, [input], now), 'stale');
  assert.equal(bubbleDisplayState({ ...card, status: 'blocked' }, [], now), 'blocked');
  assert.equal(bubbleDisplayState({ ...card, status: 'unavailable' }, [input], now), 'unavailable');
  assert.equal(bubbleDisplayState(undefined, [], now), 'unavailable');
  assert.equal(bubbleDisplayState({ ...card, percent: null }, [input], now), 'unavailable');
  assert.equal(bubbleDisplayState(card, [], now), 'unavailable');
  assert.equal(bubbleDisplayState(card, [{ ...input, observedAt: 'invalid' }], now), 'stale');
});
