import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/common';
import { useProductivity } from '@/stores/productivity';
import { useMutation } from '@/hooks/useMutation';
import { recordHabitEntry, deleteHabitEntry } from '@/services/habitApi';
import { entryFormPayload, habitTargetLabel } from '@/lib/habits';
import { DurationInput } from './DurationInput';

export function HabitEntryForm({ habit, entry, date, open, onOpenChange, onSaved }) {
  const today = useProductivity((state) => state.today?.productivityDate);
  const mutation = useMutation();
  const existing = entry ?? habit.todayEntry;
  const defaultDate = date ?? today;
  const value = existing?.value ?? 0;

  async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const saved = await mutation.run(() =>
      recordHabitEntry(habit.id, entryFormPayload(formData, habit.type)),
    );
    if (saved) {
      onSaved?.('Habit entry saved');
      onOpenChange(false);
    }
  }

  async function clearEntry() {
    const saved = await mutation.run(() => deleteHabitEntry(habit.id, existing.productivityDate));
    if (saved) {
      onSaved?.('Habit entry cleared');
      onOpenChange(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        title={`Track ${habit.name}`}
        description={habitTargetLabel(habit)}
      >
        <form
          className="form-stack"
          onSubmit={handleSubmit}
        >
          <label>
            Productivity date
            <input
              name="productivityDate"
              type="date"
              defaultValue={defaultDate}
              max={today}
              required
            />
          </label>
          {habit.type === 'BOOLEAN' ? (
            <label className="switch-row">
              <span>Completed this habit</span>
              <input
                name="completed"
                type="checkbox"
                defaultChecked={value === 1}
                aria-label="Completed this habit"
              />
            </label>
          ) : habit.type === 'DURATION' ? (
            <DurationInput
              prefix="entry"
              label="Tracked duration"
              value={value}
            />
          ) : (
            <label>
              Tracked value ({habit.unit})
              <input
                name="value"
                type="number"
                min={0}
                max={habit.type === 'PERCENTAGE' ? 100 : 1000000000}
                step={habit.type === 'COUNTER' ? 1 : 'any'}
                defaultValue={value}
                required
              />
            </label>
          )}
          <p className="form-help">
            Saving a date replaces that day’s entry. All dates follow your configured productivity
            day.
          </p>
          {mutation.error && <ErrorState error={mutation.error} />}
          <div className="form-actions">
            {existing && (
              <Button
                type="button"
                variant="destructive"
                disabled={mutation.loading}
                onClick={clearEntry}
              >
                Clear entry
              </Button>
            )}
            <Button
              type="submit"
              disabled={mutation.loading}
            >
              {mutation.loading ? 'Saving entry…' : 'Save entry'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
