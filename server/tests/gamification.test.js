import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateLevel,
  levelThreshold,
  calculateXPProgress,
  calculateFocusXP,
} from '../src/utils/xp.js';
import { leaderboardPeriod } from '../src/services/leaderboardService.js';
import { activeFocusMilliseconds } from '../src/services/focusRunService.js';

test('level curve and progress agree at every boundary and grow progressively', () => {
  for (let level = 1; level <= 150; level += 1) {
    const threshold = levelThreshold(level);
    assert.equal(calculateLevel(threshold), level);
    if (threshold) assert.equal(calculateLevel(threshold - 1), level - 1);
    assert.equal(calculateXPProgress(threshold).progressPercentage, 0);
    assert.equal(calculateXPProgress(threshold).xpRequiredInLevel, 100 * level);
  }
  assert.equal(calculateXPProgress(125).level, 2);
  assert.equal(calculateXPProgress(125).xpToNextLevel, 175);
  assert.equal(calculateXPProgress(125).xpIntoLevel, 25);
});

test('focus XP has a minimum and scales only with verified active seconds', () => {
  assert.equal(calculateFocusXP(299), 0);
  assert.equal(calculateFocusXP(300), 2);
  assert.equal(calculateFocusXP(1500), 10);
  assert.equal(calculateFocusXP(3000), 20);
});

test('server focus active time excludes pauses and never uses a client elapsed clock', () => {
  const now = new Date('2026-10-02T12:00:00Z');
  const run = {
    state: 'RUNNING',
    resumedAt: new Date('2026-10-02T11:59:45Z'),
    activeMilliseconds: 10000,
  };
  assert.equal(activeFocusMilliseconds(run, now), 25000);
  assert.equal(activeFocusMilliseconds({ ...run, state: 'PAUSED' }, now), 10000);
});

test('leaderboard boundaries use the existing configured day start and DST-safe ranges', () => {
  const period = leaderboardPeriod(
    { timezone: 'America/New_York', dayStartTime: '04:00' },
    'weekly',
    new Date('2026-03-08T16:00:00Z'),
  );
  assert.equal(period.start.getUTCHours(), 9);
  assert.equal((period.end - period.start) / 3600000, 167);
  assert.equal(period.startDate.length, 10);
  assert.equal(period.end > period.start, true);
  const allTime = leaderboardPeriod({ timezone: 'UTC', dayStartTime: '04:00' }, 'all-time');
  assert.equal(allTime.start, null);
});
