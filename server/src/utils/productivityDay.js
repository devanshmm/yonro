import { DateTime } from 'luxon';

// Dates are local calendar labels, never UTC-midnight timestamps.
function boundary(date, settings) {
  const [hour, minute] = settings.dayStartTime.split(':').map(Number);
  const local = DateTime.fromISO(date, { zone: settings.timezone }).set({
    hour,
    minute,
    second: 0,
    millisecond: 0,
  });
  // A repeated DST boundary starts at its first occurrence. A nonexistent
  // boundary is moved forward by Luxon to the first corresponding valid time.
  return local.getPossibleOffsets().sort((a, b) => a.toMillis() - b.toMillis())[0];
}
export function getProductivityDay(settings, timestamp = new Date()) {
  const local = DateTime.fromJSDate(new Date(timestamp), { zone: settings.timezone });
  if (!local.isValid) throw new Error('Invalid timestamp or timezone');
  const date = local.toISODate();
  return local.toMillis() < boundary(date, settings).toMillis()
    ? local.minus({ days: 1 }).toISODate()
    : date;
}
export function getProductivityDayRange(settings, date) {
  const next = DateTime.fromISO(date, { zone: settings.timezone }).plus({ days: 1 }).toISODate();
  return { start: boundary(date, settings).toJSDate(), end: boundary(next, settings).toJSDate() };
}
export function addDays(date, count) {
  return DateTime.fromISO(date, { zone: 'UTC' }).plus({ days: count }).toISODate();
}
export function weekDates(date) {
  const day = DateTime.fromISO(date, { zone: 'UTC' });
  const monday = day.minus({ days: day.weekday - 1 }).toISODate();
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}
export function summarizeTasks(tasks) {
  const completedTasks = tasks.filter((task) => task.status === 'COMPLETED').length;
  return {
    plannedTasks: tasks.length,
    completedTasks,
    completionPercentage: tasks.length ? Math.round((completedTasks / tasks.length) * 100) : 0,
  };
}
export function calculateStreak(tasks, today) {
  const completedDates = new Set(
    tasks.filter((t) => t.status === 'COMPLETED').map((t) => t.productivityDate),
  );
  return calculateCurrentStreak(completedDates, today);
}

export function calculateCurrentStreak(successfulDates, today) {
  const completedDates = new Set(successfulDates);
  let date = completedDates.has(today) ? today : addDays(today, -1);
  let streak = 0;
  while (completedDates.has(date)) {
    streak++;
    date = addDays(date, -1);
  }
  return streak;
}

export function calculateLongestStreak(successfulDates) {
  const dates = [...new Set(successfulDates)].sort();
  let previousDate = null;
  let currentLength = 0;
  let longestLength = 0;

  for (const date of dates) {
    currentLength = previousDate && addDays(previousDate, 1) === date ? currentLength + 1 : 1;
    longestLength = Math.max(longestLength, currentLength);
    previousDate = date;
  }

  return longestLength;
}

export function dateSequence(startDate, endDate) {
  const dates = [];
  for (let date = startDate; date <= endDate; date = addDays(date, 1)) {
    dates.push(date);
  }
  return dates;
}

export function trailingDateRange(settings, days, timestamp = new Date()) {
  const endDate = getProductivityDay(settings, timestamp);
  return { startDate: addDays(endDate, 1 - days), endDate };
}

export function monthRange(productivityDate) {
  const date = DateTime.fromISO(productivityDate, { zone: 'UTC' });
  return { startDate: date.startOf('month').toISODate(), endDate: date.endOf('month').toISODate() };
}

export function weekdayIndex(productivityDate) {
  return DateTime.fromISO(productivityDate, { zone: 'UTC' }).weekday % 7;
}
