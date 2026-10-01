import { dateLabel } from './utils';

export const heatmapMetrics = [
  { value: 'overall', label: 'Overall' },
  { value: 'tasks', label: 'Tasks' },
  { value: 'focus', label: 'Focus' },
  { value: 'habits', label: 'Habits' },
];

export function heatmapCellLabel(day, metric) {
  const date = dateLabel(day.date, { month: 'long', day: 'numeric', year: 'numeric' });
  const labels = {
    overall: `${day.activity} activities · ${day.tasksCompleted} tasks · ${day.focusMinutes} focus minutes · ${day.habitsCompleted} habits`,
    tasks: `${day.tasksCompleted} completed tasks`,
    focus: `${day.focusMinutes} focus minutes`,
    habits: `${day.habitsCompleted} successful habits`,
  };
  return `${date}: ${labels[metric]}`;
}

export function heatmapLayout(data) {
  const cellCount = Math.ceil((data.firstWeekday + data.days.length) / 7) * 7;
  const cells = Array.from(
    { length: cellCount },
    (_, index) => data.days[index - data.firstWeekday] ?? null,
  );
  const months = [];
  data.days.forEach((day, index) => {
    if (index === 0 || day.date.endsWith('-01')) {
      months.push({
        key: day.date,
        label: dateLabel(day.date, { month: 'short' }),
        column: Math.floor((index + data.firstWeekday) / 7) + 1,
      });
    }
  });
  return { cells, months, weeks: cellCount / 7 };
}

export function nextHeatmapCell(index, key, length) {
  const movement = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 };
  if (key === 'Home') {
    return 0;
  }
  if (key === 'End') {
    return length - 1;
  }
  if (movement[key] === undefined) {
    return null;
  }
  return Math.max(0, Math.min(length - 1, index + movement[key]));
}
