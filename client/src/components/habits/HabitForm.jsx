import { useState } from 'react';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/common';
import { useMutation } from '@/hooks/useMutation';
import { createHabit, updateHabit } from '@/services/habitApi';
import { habitTypes, habitFormPayload } from '@/lib/habits';
import { DurationInput } from './DurationInput';

export function HabitForm({ habit, open, onOpenChange, onSaved }) {
  const [type, setType] = useState(habit?.type ?? 'BOOLEAN');
  const mutation = useMutation();
  const isBoolean = type === 'BOOLEAN';
  const customUnit = type === 'NUMBER' || type === 'COUNTER';
  const target =
    habit?.type === type
      ? habit.targetValue
      : type === 'PERCENTAGE'
        ? 100
        : type === 'DURATION'
          ? 60
          : 1;

  async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const saved = await mutation.run(async () => {
      const payload = habitFormPayload(formData, type);
      if (habit) {
        await updateHabit(habit.id, payload);
      } else {
        await createHabit(payload);
      }
    });
    if (saved) {
      onSaved?.(habit ? 'Habit updated' : 'Habit created');
      onOpenChange(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        title={habit ? 'Edit your habit' : 'Build your next habit.'}
        description="Choose what to track and what a successful day looks like."
      >
        <form
          className="form-stack"
          onSubmit={handleSubmit}
        >
          <label>
            Habit name
            <input
              name="name"
              defaultValue={habit?.name ?? ''}
              required
              maxLength={100}
              autoFocus
              placeholder="Reading, coding, exercise…"
            />
          </label>
          <label>
            Description
            <textarea
              name="description"
              defaultValue={habit?.description ?? ''}
              maxLength={2000}
              rows={2}
            />
          </label>
          <label>
            Tracking type
            <select
              aria-label="Tracking type"
              value={type}
              onChange={(event) => setType(event.target.value)}
            >
              {habitTypes.map((option) => (
                <option
                  key={option.value}
                  value={option.value}
                >
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {isBoolean ? (
            <label className="switch-row">
              <span>Completion target</span>
              <input
                name="booleanTarget"
                type="checkbox"
                defaultChecked
                required
                aria-label="Completion target"
              />
            </label>
          ) : (
            <>
              <label>
                Target direction
                <select
                  name="targetDirection"
                  aria-label="Target direction"
                  defaultValue={habit?.targetDirection ?? 'AT_LEAST'}
                >
                  <option value="AT_LEAST">At least · build a habit</option>
                  <option value="AT_MOST">At most · stay within a limit</option>
                </select>
              </label>
              {type === 'DURATION' ? (
                <DurationInput
                  key={type}
                  prefix="target"
                  label="Target duration"
                  value={target}
                />
              ) : (
                <label>
                  Target value
                  <input
                    key={type}
                    name="targetValue"
                    type="number"
                    min={type === 'COUNTER' ? 1 : 0.01}
                    max={type === 'PERCENTAGE' ? 100 : 1000000000}
                    step={type === 'COUNTER' ? 1 : 'any'}
                    defaultValue={target}
                    required
                  />
                </label>
              )}
              {customUnit && (
                <label>
                  Unit
                  <input
                    key={type}
                    name="unit"
                    defaultValue={
                      habit?.type === type ? habit.unit : type === 'COUNTER' ? 'pages' : 'hours'
                    }
                    maxLength={40}
                    required
                    placeholder="pages, glasses, hours…"
                  />
                </label>
              )}
            </>
          )}
          {habit && (
            <p className="muted-note">
              After history is recorded, tracking type and unit stay fixed. Target changes apply to
              new or edited entries.
            </p>
          )}
          {mutation.error && <ErrorState error={mutation.error} />}
          <Button
            type="submit"
            disabled={mutation.loading}
          >
            {mutation.loading ? 'Saving habit…' : habit ? 'Save habit' : 'Create habit'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
