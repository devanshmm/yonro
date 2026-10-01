import { prisma } from '../lib/prisma.js';
import { getProductivityDay, addDays, monthRange, weekDates, calculateCurrentStreak, calculateLongestStreak } from '../utils/productivityDay.js';
import { calculateGoalProgress } from '../utils/goalProgress.js';
import { getActivityDays, getMeaningfulHistory } from './activityService.js';

function summarizePeriod(activity, startDate, endDate) {
  const days = activity.filter((day) => day.date >= startDate && day.date <= endDate);
  const total = days.reduce((summary, day) => ({
    plannedTasks: summary.plannedTasks + day.plannedTasks,
    completedTasks: summary.completedTasks + day.tasksCompleted,
    focusSeconds: summary.focusSeconds + day.focusSeconds,
    habitsTracked: summary.habitsTracked + day.habitsTracked,
    habitsCompleted: summary.habitsCompleted + day.habitsCompleted,
  }), { plannedTasks: 0, completedTasks: 0, focusSeconds: 0, habitsTracked: 0, habitsCompleted: 0 });
  return {
    startDate, endDate, ...total,
    completionPercentage: total.plannedTasks ? Math.round((total.completedTasks / total.plannedTasks) * 100) : 0,
    habitCompletionPercentage: total.habitsTracked ? Math.round((total.habitsCompleted / total.habitsTracked) * 100) : 0,
  };
}

export async function getAnalyticsOverview(user) {
  const today = getProductivityDay(user.settings);
  const week = weekDates(today);
  const month = monthRange(today);
  const endDate = month.endDate > week[6] ? month.endDate : week[6];
  const [activity, streaks, habits, goals] = await Promise.all([
    getActivityDays(user.id, month.startDate < addDays(today, -29) ? month.startDate : addDays(today, -29), endDate),
    getMeaningfulHistory(user.id, today),
    prisma.habit.findMany({ where: { userId: user.id, active: true }, select: { id: true, name: true, type: true } }),
    prisma.goal.findMany({ where: { userId: user.id }, select: { id: true, title: true, status: true, milestones: { select: { completed: true } } } }),
  ]);
  const habitDates = new Map();
  for (const entry of streaks.successfulHabitDays) {
    const dates = habitDates.get(entry.habitId) ?? [];
    dates.push(entry.productivityDate);
    habitDates.set(entry.habitId, dates);
  }
  const habitStreaks = habits.map((habit) => {
    const dates = habitDates.get(habit.id) ?? [];
    return { ...habit, currentStreak: calculateCurrentStreak(dates, today), longestStreak: calculateLongestStreak(dates) };
  });
  const activeGoals = goals.filter((goal) => goal.status === 'ACTIVE').map((goal) => ({ id: goal.id, title: goal.title, ...calculateGoalProgress(goal.milestones) }));
  const habitTrend = activity.filter((day) => day.date >= addDays(today, -29) && day.date <= today).map((day) => ({
    date: day.date, tracked: day.habitsTracked, completed: day.habitsCompleted,
    completionPercentage: day.habitsTracked ? Math.round((day.habitsCompleted / day.habitsTracked) * 100) : null,
  }));
  return {
    productivityDate: today,
    daily: summarizePeriod(activity, today, today),
    weekly: summarizePeriod(activity, week[0], week[6]),
    monthly: summarizePeriod(activity, month.startDate, month.endDate),
    streaks: { currentStreak: streaks.currentStreak, longestStreak: streaks.longestStreak },
    habits: { activeCount: habits.length, streaks: habitStreaks, trend: habitTrend },
    goals: { activeCount: activeGoals.length, completedCount: goals.filter((goal) => goal.status === 'COMPLETED').length, activeGoals },
  };
}
