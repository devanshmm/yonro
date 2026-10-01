import { prisma } from '../lib/prisma.js';
import {
  getProductivityDay,
  getProductivityDayRange,
  summarizeTasks,
  weekDates,
} from '../utils/productivityDay.js';
import { getMeaningfulHistory } from './activityService.js';
export async function getToday(user) {
  const productivityDate = getProductivityDay(user.settings);
  const [tasks, streaks, focus] = await Promise.all([
    prisma.task.findMany({ where: { userId: user.id, productivityDate } }),
    getMeaningfulHistory(user.id, productivityDate),
    prisma.focusSession.aggregate({
      where: { userId: user.id, productivityDate },
      _sum: { durationSeconds: true },
    }),
  ]);
  const range = getProductivityDayRange(user.settings, productivityDate);
  return {
    productivityDate,
    ...summarizeTasks(tasks),
    currentStreak: streaks.currentStreak,
    longestStreak: streaks.longestStreak,
    focusSeconds: focus._sum.durationSeconds ?? 0,
    dayStartsAt: range.start,
    dayEndsAt: range.end,
  };
}
export async function getWeek(user) {
  const today = getProductivityDay(user.settings),
    dates = weekDates(today);
  const where = { userId: user.id, productivityDate: { gte: dates[0], lte: dates[6] } };
  const [tasks, sessions] = await Promise.all([
    prisma.task.findMany({ where }),
    prisma.focusSession.findMany({ where }),
  ]);
  const days = dates.map((date) => ({
    date,
    ...summarizeTasks(tasks.filter((t) => t.productivityDate === date)),
    focusSeconds: sessions
      .filter((s) => s.productivityDate === date)
      .reduce((sum, s) => sum + s.durationSeconds, 0),
  }));
  return {
    today,
    startsOn: dates[0],
    endsOn: dates[6],
    ...summarizeTasks(tasks),
    focusSeconds: sessions.reduce((sum, s) => sum + s.durationSeconds, 0),
    days,
  };
}
