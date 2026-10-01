import test from 'node:test';
import assert from 'node:assert/strict';
import { isAftermathItemVisible, visibleAftermathCount } from '../src/lib/analysis-reveal';

test('aftermath stays empty while typing is incomplete', () => {
  assert.equal(visibleAftermathCount({
    typingComplete: false,
    step: 99,
    total: 5,
    reducedMotion: false,
    skipped: false,
  }), 0);
  assert.equal(isAftermathItemVisible(0, 0), false);
});

test('skip and reduced-motion reveal every aftermath item immediately', () => {
  assert.equal(visibleAftermathCount({
    typingComplete: true,
    step: 1,
    total: 4,
    reducedMotion: false,
    skipped: true,
  }), 4);
  assert.equal(visibleAftermathCount({
    typingComplete: true,
    step: 0,
    total: 4,
    reducedMotion: true,
    skipped: false,
  }), 4);
});

test('after typing, step grows item visibility without reserving future slots', () => {
  assert.equal(visibleAftermathCount({
    typingComplete: true,
    step: 1,
    total: 4,
    reducedMotion: false,
    skipped: false,
  }), 1);
  assert.equal(visibleAftermathCount({
    typingComplete: true,
    step: 3,
    total: 4,
    reducedMotion: false,
    skipped: false,
  }), 3);
  assert.equal(isAftermathItemVisible(0, 1), true);
  assert.equal(isAftermathItemVisible(1, 1), false);
  assert.equal(isAftermathItemVisible(3, 4), true);
});
