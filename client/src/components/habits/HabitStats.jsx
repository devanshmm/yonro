import {
  Flame,
  TrendingUp,
  BarChart3,
  CheckCheck,
  CalendarDays,
  ArrowDown,
  ArrowUp,
  Target,
} from 'lucide-react';
import { StatCard } from '@/components/common';
import { formatHabitValue } from '@/lib/habits';

export function HabitStats({ habit, statistics }) {
  const cards = [
    {
      label: 'Current streak',
      value: `${statistics.currentStreak} days`,
      detail: 'Across all recorded history',
      icon: Flame,
    },
    {
      label: 'Best streak',
      value: `${statistics.longestStreak} days`,
      detail: 'Your longest successful run',
      icon: TrendingUp,
    },
    {
      label: 'Average value',
      value: formatHabitValue(habit, statistics.averageValue),
      detail: 'Within the selected range',
      icon: BarChart3,
    },
    {
      label: 'Target completion',
      value: `${statistics.completionPercentage}%`,
      detail: 'Successful / tracked days',
      icon: Target,
    },
    {
      label: 'Minimum value',
      value: formatHabitValue(habit, statistics.minimumValue),
      detail: 'Within the selected range',
      icon: ArrowDown,
    },
    {
      label: 'Maximum value',
      value: formatHabitValue(habit, statistics.maximumValue),
      detail: 'Within the selected range',
      icon: ArrowUp,
    },
    {
      label: 'Tracked days',
      value: statistics.trackedDays,
      detail: 'Days with a recorded value',
      icon: CalendarDays,
    },
    {
      label: 'Successful days',
      value: statistics.successfulDays,
      detail: 'Days that met their target',
      icon: CheckCheck,
    },
  ];
  return (
    <div className="stat-grid four habit-stats">
      {cards.map((card) => (
        <StatCard
          key={card.label}
          {...card}
        />
      ))}
    </div>
  );
}
