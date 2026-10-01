import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getProductivityDay,
  getProductivityDayRange,
  calculateStreak,
  summarizeTasks,
  weekDates,
} from '../src/utils/productivityDay.js';
import { signupSchema, focusSchema } from '../src/validators/index.js';
const settings = { timezone: 'Asia/Kolkata', dayStartTime: '04:00' };
test('04:00 boundary uses the previous local date until exactly 04:00', () => {
  assert.equal(getProductivityDay(settings, '2026-10-01T22:29:59Z'), '2026-10-01');
  assert.equal(getProductivityDay(settings, '2026-10-01T22:30:00Z'), '2026-10-02');
  assert.equal(getProductivityDay(settings, '2026-10-02T18:31:00Z'), '2026-10-02');
});
test('calendar rollover handles leap days and year boundaries', () => {
  const utc = { timezone: 'UTC', dayStartTime: '04:00' };
  assert.equal(getProductivityDay(utc, '2024-03-01T03:59:00Z'), '2024-02-29');
  assert.equal(getProductivityDay(utc, '2026-01-01T03:59:00Z'), '2025-12-31');
});
test('DST days have real 23-hour and 25-hour ranges', () => {
  const ny = { timezone: 'America/New_York', dayStartTime: '04:00' };
  const spring = getProductivityDayRange(ny, '2026-03-07'),
    fall = getProductivityDayRange(ny, '2026-10-31');
  assert.equal((spring.end - spring.start) / 3600000, 23);
  assert.equal((fall.end - fall.start) / 3600000, 25);
});
test('repeated 01:30 boundary never moves backward in the repeated hour', () => {
  const ny = { timezone: 'America/New_York', dayStartTime: '01:30' };
  assert.equal(getProductivityDay(ny, '2026-11-01T05:29:59Z'), '2026-10-31');
  assert.equal(getProductivityDay(ny, '2026-11-01T05:30:00Z'), '2026-11-01');
  assert.equal(getProductivityDay(ny, '2026-11-01T06:10:00Z'), '2026-11-01');
});
test('nonexistent DST boundary moves forward consistently', () => {
  const ny = { timezone: 'America/New_York', dayStartTime: '02:30' };
  assert.equal(getProductivityDay(ny, '2026-03-08T07:29:59Z'), '2026-03-07');
  assert.equal(getProductivityDay(ny, '2026-03-08T07:30:00Z'), '2026-03-08');
});
test('summary includes skipped tasks in the planned denominator', () => {
  const tasks = Array.from({ length: 10 }, (_, i) => ({
    status: i < 8 ? 'COMPLETED' : i === 8 ? 'SKIPPED' : 'TODO',
  }));
  assert.deepEqual(summarizeTasks(tasks), {
    plannedTasks: 10,
    completedTasks: 8,
    completionPercentage: 80,
  });
  assert.equal(summarizeTasks([]).completionPercentage, 0);
});
test('streak can continue from yesterday and ends at a missing day', () => {
  const tasks = ['2026-09-30', '2026-10-01', '2026-09-28'].map((productivityDate) => ({
    status: 'COMPLETED',
    productivityDate,
  }));
  assert.equal(calculateStreak(tasks, '2026-10-02'), 2);
  assert.equal(
    calculateStreak(
      [...tasks, { status: 'COMPLETED', productivityDate: '2026-10-02' }],
      '2026-10-02',
    ),
    3,
  );
  assert.equal(calculateStreak(tasks, '2026-10-04'), 0);
});
test('week labels use Monday to Sunday including across years', () => {
  assert.deepEqual(weekDates('2026-01-01'), [
    '2025-12-29',
    '2025-12-30',
    '2025-12-31',
    '2026-01-01',
    '2026-01-02',
    '2026-01-03',
    '2026-01-04',
  ]);
});
test('bcrypt input rejects passwords beyond its UTF-8 byte limit', () => {
  const user = {
    firstName: 'A',
    lastName: 'B',
    username: 'abc',
    email: 'a@example.com',
    password: '😀'.repeat(19),
  };
  assert.equal(signupSchema.safeParse(user).success, false);
});
test('focus validator rejects fabricated duration and future sessions', () => {
  const base = {
    id: '88a9b351-cafb-4d96-bcb8-429c897f6784',
    startedAt: new Date(Date.now() - 10000).toISOString(),
    endedAt: new Date().toISOString(),
    durationSeconds: 100,
  };
  assert.equal(focusSchema.safeParse(base).success, false);
  assert.equal(focusSchema.safeParse({ ...base, durationSeconds: 10 }).success, true);
});
