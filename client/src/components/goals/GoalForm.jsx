import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/common';
import { useMutation } from '@/hooks/useMutation';
import { createGoal, updateGoal } from '@/services/goalApi';

export function GoalForm({ goal, open, onOpenChange, onSaved }) {
  const mutation = useMutation();

  async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const body = {
      title: formData.get('title').trim(),
      description: formData.get('description').trim(),
      targetDate: formData.get('targetDate') || null,
      status: formData.get('status'),
    };
    const saved = await mutation.run(() => (goal ? updateGoal(goal.id, body) : createGoal(body)));
    if (saved) {
      onSaved?.(goal ? 'Goal updated' : 'Goal created');
      onOpenChange(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        title={goal ? 'Edit your goal' : 'What are you working toward?'}
        description="Name the bigger picture. Break it into milestones as you go."
      >
        <form
          className="form-stack"
          onSubmit={handleSubmit}
        >
          <label>
            Goal title
            <input
              name="title"
              defaultValue={goal?.title ?? ''}
              required
              maxLength={200}
              autoFocus
              placeholder="Become a full-stack developer"
            />
          </label>
          <label>
            Description
            <textarea
              name="description"
              defaultValue={goal?.description ?? ''}
              maxLength={2000}
              rows={3}
            />
          </label>
          <div className="form-row">
            <label>
              Target date
              <input
                name="targetDate"
                type="date"
                defaultValue={goal?.targetDate ?? ''}
              />
            </label>
            <label>
              Status
              <select
                name="status"
                aria-label="Goal status"
                defaultValue={goal?.status ?? 'ACTIVE'}
              >
                <option value="ACTIVE">Active</option>
                <option value="COMPLETED">Completed</option>
                <option value="ARCHIVED">Archived</option>
              </select>
            </label>
          </div>
          <p className="form-help">
            Progress is calculated from milestones. Your goal status is a separate preference.
          </p>
          {mutation.error && <ErrorState error={mutation.error} />}
          <Button
            type="submit"
            disabled={mutation.loading}
          >
            {mutation.loading ? 'Saving goal…' : goal ? 'Save goal' : 'Create goal'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
