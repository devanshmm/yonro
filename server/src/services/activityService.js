import { prisma } from '../lib/prisma.js';
import { decorateActivityDay } from '../utils/activityMetrics.js';
import {
  calculateCurrentStreak,
  calculateLongestStreak,
  dateSequence,
  trailingDateRange,
  weekdayIndex,
} from '../utils/productivityDay.js';

function emptyActivity(date) {
  return {
    date,
    plannedTasks: 0,
    tasksCompleted: 0,
    focusSeconds: 0,
    focusSessions: 0,
    habitsTracked: 0,
    habitsCompleted: 0,
  };
}

export async function getActivityDays(userId, startDate, endDate) {
  const dates = { gte: startDate, lte: endDate };
  const [taskGroups, focusGroups, habitGroups] = await Promise.all([
    prisma.task.groupBy({
      by: ['productivityDate', 'status'],
      where: { userId, productivityDate: dates },
      _count: { _all: true },
    }),
    prisma.focusSession.groupBy({
      by: ['productivityDate'],
      where: { userId, productivityDate: dates },
      _sum: { durationSeconds: true },
      _count: { _all: true },
    }),
    prisma.habitEntry.groupBy({
      by: ['productivityDate', 'completed'],
      where: { habit: { userId }, productivityDate: dates },
      _count: { _all: true },
    }),
  ]);
  const dailyActivity = new Map(
    dateSequence(startDate, endDate).map((date) => [date, emptyActivity(date)]),
  );
  for (const group of taskGroups) {
    const day = dailyActivity.get(group.productivityDate);
    day.plannedTasks += group._count._all;
    if (group.status === 'COMPLETED') {
      day.tasksCompleted += group._count._all;
    }
  }
  for (const group of focusGroups) {
    const day = dailyActivity.get(group.productivityDate);
    day.focusSeconds = group._sum.durationSeconds ?? 0;
    day.focusSessions = group._count._all;
  }
  for (const group of habitGroups) {
    const day = dailyActivity.get(group.productivityDate);
    day.habitsTracked += group._count._all;
    if (group.completed) {
      day.habitsCompleted += group._count._all;
    }
  }
  return [...dailyActivity.values()].map(decorateActivityDay);
}

export async function getMeaningfulHistory(userId, today, database = prisma) {
  const dates = { lte: today };
  const [tasks, focus, habits] = await Promise.all([
    database.task.groupBy({
      by: ['productivityDate'],
      where: { userId, status: 'COMPLETED', productivityDate: dates },
      _count: { _all: true },
    }),
    database.focusSession.groupBy({
      by: ['productivityDate'],
      where: { userId, productivityDate: dates, durationSeconds: { gt: 0 } },
      _count: { _all: true },
    }),
    database.habitEntry.groupBy({
      by: ['habitId', 'productivityDate'],
      where: { habit: { userId }, completed: true, productivityDate: dates },
      _count: { _all: true },
    }),
  ]);
  const activity = new Map();
  const addActivity = (date, field, count) => {
    const day = activity.get(date) ?? emptyActivity(date);
    day[field] += count;
    activity.set(date, day);
  };
  tasks.forEach((group) =>
    addActivity(group.productivityDate, 'tasksCompleted', group._count._all),
  );
  focus.forEach((group) => addActivity(group.productivityDate, 'focusSessions', group._count._all));
  habits.forEach((group) =>
    addActivity(group.productivityDate, 'habitsCompleted', group._count._all),
  );
  const successfulDates = [...activity.values()]
    .map(decorateActivityDay)
    .filter((day) => day.meaningful)
    .map((day) => day.date);
  return {
    currentStreak: calculateCurrentStreak(successfulDates, today),
    longestStreak: calculateLongestStreak(successfulDates),
    successfulDates,
    successfulHabitDays: habits,
  };
}

export async function getHeatmap(user, days = 365) {
  const range = trailingDateRange(user.settings, days);
  const activity = await getActivityDays(user.id, range.startDate, range.endDate);
  return { ...range, firstWeekday: weekdayIndex(range.startDate), days: activity };
}
