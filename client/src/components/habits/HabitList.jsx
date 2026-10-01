import { EmptyState } from '@/components/common';
import { HabitCard } from './HabitCard';

export function HabitList({ habits, onEdit, onRecord, compact = false }) {
  if (!habits.length) {
    return (
      <EmptyState
        title="Build your first habit."
        description="Choose a small action you want to return to each day."
      />
    );
  }
  return (
    <div className={compact ? 'compact-habit-list' : 'collection-grid'}>
      {habits.map((habit) => (
        <HabitCard
          key={habit.id}
          habit={habit}
          onEdit={onEdit}
          onRecord={onRecord}
          compact={compact}
        />
      ))}
    </div>
  );
}
