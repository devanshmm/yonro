import { Dialog, DialogContent } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/common';
import { useMutation } from '@/hooks/useMutation';
import { createMilestone, updateMilestone } from '@/services/goalApi';

export function MilestoneForm({ goalId, milestone, open, onOpenChange, onSaved }) {
  const mutation = useMutation();

  async function handleSubmit(event) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const body = {
      title: formData.get('title').trim(),
      description: formData.get('description').trim(),
    };
    const saved = await mutation.run(() =>
      milestone ? updateMilestone(milestone.id, body) : createMilestone(goalId, body),
    );
    if (saved) {
      onSaved?.(milestone ? 'Milestone updated' : 'Milestone added');
      onOpenChange(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
    >
      <DialogContent
        title={milestone ? 'Edit milestone' : 'One step toward your goal.'}
        description="Make this milestone specific enough to know when you have finished."
      >
        <form
          className="form-stack"
          onSubmit={handleSubmit}
        >
          <label>
            Milestone title
            <input
              name="title"
              defaultValue={milestone?.title ?? ''}
              maxLength={200}
              required
              autoFocus
              placeholder="Build a REST API"
            />
          </label>
          <label>
            Description
            <textarea
              name="description"
              defaultValue={milestone?.description ?? ''}
              maxLength={2000}
              rows={3}
            />
          </label>
          {mutation.error && <ErrorState error={mutation.error} />}
          <Button
            type="submit"
            disabled={mutation.loading}
          >
            {mutation.loading
              ? 'Saving milestone…'
              : milestone
                ? 'Save milestone'
                : 'Add milestone'}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
