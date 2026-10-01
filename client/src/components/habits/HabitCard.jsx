import { Link } from 'react-router-dom';
import { Check, Pencil, Archive, RotateCcw, ArrowUpRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ProgressBar, ErrorState } from '@/components/common';
import { SuccessState } from '@/components/ResourceStatus';
import { useMutation } from '@/hooks/useMutation';
import { updateHabit } from '@/services/habitApi';
import { formatHabitValue, habitTargetLabel } from '@/lib/habits';

export function HabitCard({ habit, onEdit, onRecord, compact = false }) {
  const mutation = useMutation();
  const valueLabel = formatHabitValue(habit, habit.todayEntry?.value);
  const targetLabel = habitTargetLabel(habit);
  const successful = habit.todayEntry?.completed;

  async function toggleArchive() {
    await mutation.run(
      () => updateHabit(habit.id, { active: !habit.active }),
      habit.active ? 'Habit archived' : 'Habit restored',
    );
  }

  return (
    <article className={`habit-card ${compact ? 'habit-card-compact' : ''}`}>
      <div className="habit-card-heading">
        <Link to={`/habits/${habit.id}`}>
          <h3>{habit.name}</h3>
        </Link>
        <span className={`entry-badge ${successful ? 'successful' : ''}`}>
          {successful ? (
            <>
              <Check size={12} />
              Done
            </>
          ) : habit.active ? (
            'Today'
          ) : (
            'Archived'
          )}
        </span>
      </div>
      <p className="habit-target">{targetLabel}</p>
      {!compact && habit.description && <p className="card-description">{habit.description}</p>}
      <div className="habit-value">
        <strong>{valueLabel}</strong>
        <span>{habit.progressPercentage}%</span>
      </div>
      <ProgressBar
        value={habit.progressPercentage}
        label={`${habit.name} target progress`}
      />
      <div className="card-actions">
        {habit.active && (
          <Button
            variant="secondary"
            size="sm"
            onClick={() => onRecord(habit)}
          >
            {habit.todayEntry ? 'Update value' : 'Track today'}
          </Button>
        )}
        {!compact && (
          <>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`Edit ${habit.name}`}
              onClick={() => onEdit(habit)}
            >
              <Pencil size={14} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              aria-label={`${habit.active ? 'Archive' : 'Restore'} ${habit.name}`}
              disabled={mutation.loading}
              onClick={toggleArchive}
            >
              {habit.active ? <Archive size={14} /> : <RotateCcw size={14} />}
            </Button>
          </>
        )}
        <Button
          asChild
          variant="ghost"
          size="icon"
        >
          <Link
            to={`/habits/${habit.id}`}
            aria-label={`View ${habit.name} history`}
          >
            <ArrowUpRight size={16} />
          </Link>
        </Button>
      </div>
      {mutation.loading && (
        <p
          role="status"
          className="form-help"
        >
          Updating habit…
        </p>
      )}
      {mutation.error && <ErrorState error={mutation.error} />}
      <SuccessState message={mutation.success} />
    </article>
  );
}
