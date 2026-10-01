import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculateCurrentStreak,
  calculateLongestStreak,
  monthRange,
  trailingDateRange,
} from '../src/utils/productivityDay.js';
import {
  isMeaningfulProductivityDay,
  decorateActivityDay,
  getActivityIntensity,
} from '../src/utils/activityMetrics.js';
import {
  calculateHabitStatistics,
  calculateHabitProgress,
  isHabitSuccessful,
} from '../src/utils/habitMetrics.js';
import { calculateGoalProgress } from '../src/utils/goalProgress.js';
import { habitDefinitionSchema, validateEntryValue } from '../src/validators/habitSchemas.js';

test('current and longest streaks handle gaps, duplicate dates, leap days, and yesterday grace', () => {
  const dates = ['2024-02-28', '2024-02-29', '2024-03-01', '2024-03-01', '2024-03-03'];
  assert.equal(calculateLongestStreak(dates), 3);
  assert.equal(calculateCurrentStreak(dates, '2024-03-02'), 3);
  assert.equal(calculateCurrentStreak(dates, '2024-03-03'), 1);
  assert.equal(calculateCurrentStreak(dates, '2024-03-05'), 0);
  assert.equal(calculateLongestStreak([]), 0);
});

test('meaningful days require successful work, not planned or unsuccessful activity', () => {
  const day = { tasksCompleted: 0, habitsCompleted: 0, focusSessions: 0 };
  assert.equal(isMeaningfulProductivityDay({ ...day, plannedTasks: 10, habitsTracked: 4 }), false);
  for (const field of Object.keys(day)) {
    assert.equal(isMeaningfulProductivityDay({ ...day, [field]: 1 }), true);
  }
});

test('heatmap intensity has a real zero level and minute-sensitive focus thresholds', () => {
  assert.equal(getActivityIntensity(0), 0);
  assert.equal(getActivityIntensity(1), 1);
  assert.equal(getActivityIntensity(10), 4);
  assert.equal(getActivityIntensity(0.02, 'focus'), 1);
  assert.equal(getActivityIntensity(25, 'focus'), 2);
  assert.equal(getActivityIntensity(120, 'focus'), 4);
  const day = decorateActivityDay({
    date: '2026-10-02',
    tasksCompleted: 4,
    habitsCompleted: 3,
    focusSessions: 1,
    focusSeconds: 7200,
  });
  assert.equal(day.activity, 8);
  assert.equal(day.focusMinutes, 120);
  assert.equal(day.levels.overall, 3);
});

test('habit success and progress support minimum targets and upper limits, including zero', () => {
  const reading = { type: 'COUNTER', targetValue: 20, targetDirection: 'AT_LEAST' };
  const phone = { type: 'DURATION', targetValue: 180, targetDirection: 'AT_MOST' };
  assert.equal(isHabitSuccessful(reading, 15), false);
  assert.equal(calculateHabitProgress(reading, { value: 15, completed: false }), 75);
  assert.equal(isHabitSuccessful(phone, 161), true);
  assert.equal(isHabitSuccessful(phone, 0), true);
  assert.equal(calculateHabitProgress(phone, null), 0);
  assert.equal(calculateHabitProgress(phone, { value: 0, completed: true }), 100);
  assert.equal(calculateHabitProgress(phone, { value: 0, completed: false }), 100);
  assert.equal(calculateHabitProgress(phone, { value: 360, completed: true }), 50);
});

test('habit statistics use selected tracked entries, not missing-day zeroes', () => {
  const entries = [
    { value: 10, completed: false },
    { value: 20, completed: true },
  ];
  const statistics = calculateHabitStatistics(entries, ['2026-10-01', '2026-10-02'], '2026-10-02');
  assert.equal(statistics.averageValue, 15);
  assert.equal(statistics.minimumValue, 10);
  assert.equal(statistics.maximumValue, 20);
  assert.equal(statistics.completionPercentage, 50);
  assert.equal(statistics.trackedDays, 2);
  assert.equal(statistics.currentStreak, 2);
  assert.equal(calculateHabitStatistics([], [], '2026-10-02').averageValue, null);
});

test('habit values are validated by tracking type on the server', () => {
  assert.throws(() => validateEntryValue({ type: 'BOOLEAN' }, 2));
  assert.throws(() => validateEntryValue({ type: 'PERCENTAGE' }, 101));
  assert.throws(() => validateEntryValue({ type: 'DURATION' }, 0.5));
  assert.throws(() => validateEntryValue({ type: 'COUNTER' }, 1.5));
  assert.throws(() => validateEntryValue({ type: 'NUMBER' }, Infinity));
  assert.equal(validateEntryValue({ type: 'NUMBER' }, 1.5), 1.5);
});

test('habit definitions reject impossible targets and inconsistent duration units', () => {
  const habit = {
    name: 'Phone',
    type: 'DURATION',
    targetValue: 180,
    unit: 'minutes',
    targetDirection: 'AT_MOST',
  };
  assert.equal(habitDefinitionSchema.safeParse(habit).success, true);
  assert.equal(habitDefinitionSchema.safeParse({ ...habit, unit: 'hours' }).success, false);
  assert.equal(habitDefinitionSchema.safeParse({ ...habit, targetValue: 0 }).success, false);
});

test('goal progress derives only from milestones and handles an empty goal', () => {
  assert.deepEqual(calculateGoalProgress([]), {
    totalMilestones: 0,
    completedMilestones: 0,
    progressPercentage: 0,
  });
  const milestones = Array.from({ length: 5 }, (_, index) => ({ completed: index < 3 }));
  assert.equal(calculateGoalProgress(milestones).progressPercentage, 60);
});

test('history and monthly ranges are based on the configured productivity label', () => {
  const settings = { timezone: 'Asia/Kolkata', dayStartTime: '04:00' };
  const range = trailingDateRange(settings, 7, '2026-10-01T21:00:00Z');
  assert.deepEqual(range, { startDate: '2026-09-25', endDate: '2026-10-01' });
  assert.deepEqual(monthRange(range.endDate), { startDate: '2026-10-01', endDate: '2026-10-31' });
});
