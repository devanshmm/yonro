import { calculateCurrentStreak, calculateLongestStreak } from './productivityDay.js';

export function isHabitSuccessful(habit, value) {
  if (habit.type === 'BOOLEAN') {
    return value === 1;
  }
  return habit.targetDirection === 'AT_MOST'
    ? value <= habit.targetValue
    : value >= habit.targetValue;
}

export function calculateHabitProgress(habit, entry) {
  if (!entry) {
    return 0;
  }
  if (habit.type === 'BOOLEAN') {
    return entry.completed ? 100 : 0;
  }
  if (habit.targetDirection === 'AT_MOST') {
    return entry.value <= habit.targetValue
      ? 100
      : Math.min(100, Math.round((habit.targetValue / entry.value) * 100));
  }
  return Math.min(100, Math.round((entry.value / habit.targetValue) * 100));
}

export function calculateHabitStatistics(entries, successfulDates, today) {
  const values = entries.map((entry) => entry.value);
  const successfulDays = entries.filter((entry) => entry.completed).length;
  const totalValue = values.reduce((sum, value) => sum + value, 0);

  return {
    currentStreak: calculateCurrentStreak(successfulDates, today),
    longestStreak: calculateLongestStreak(successfulDates),
    averageValue: values.length ? Number((totalValue / values.length).toFixed(2)) : null,
    minimumValue: values.length ? Math.min(...values) : null,
    maximumValue: values.length ? Math.max(...values) : null,
    trackedDays: entries.length,
    successfulDays,
    completionPercentage: entries.length ? Math.round((successfulDays / entries.length) * 100) : 0,
  };
}
