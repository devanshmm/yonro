import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorState, EmptyState } from '@/components/common';
import { SuccessState } from '@/components/ResourceStatus';
import { useMutation } from '@/hooks/useMutation';
import { updateMilestone, deleteMilestone, reorderMilestones } from '@/services/goalApi';
import { moveMilestone } from '@/lib/goals';
import { GoalMilestoneItem } from './GoalMilestoneItem';
import { MilestoneForm } from './MilestoneForm';

export function GoalMilestoneList({ goal }) {
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [notice, setNotice] = useState(null);
  const mutation = useMutation();

  async function toggleMilestone(milestone) {
    setNotice(null);
    await mutation.run(
      () => updateMilestone(milestone.id, { completed: !milestone.completed }),
      milestone.completed ? 'Milestone reopened' : 'Milestone completed',
    );
  }

  async function removeMilestone(milestone) {
    if (!confirm(`Delete milestone “${milestone.title}”?`)) {
      return;
    }
    setNotice(null);
    await mutation.run(() => deleteMilestone(milestone.id), 'Milestone deleted');
  }

  async function reorder(milestone, offset) {
    setNotice(null);
    const ids = moveMilestone(goal.milestones, milestone.id, offset);
    await mutation.run(() => reorderMilestones(goal.id, ids), 'Milestones reordered');
  }

  return (
    <section className="panel">
      <div className="panel-heading">
        <h2>
          Your milestones<span className="count-badge">{goal.totalMilestones}</span>
        </h2>
        <Button
          variant="secondary"
          size="sm"
          disabled={mutation.loading || goal.totalMilestones >= 100}
          onClick={() => setAdding(true)}
        >
          <Plus size={14} />
          New milestone
        </Button>
      </div>
      {mutation.loading && (
        <p
          role="status"
          className="form-help"
        >
          Updating milestone…
        </p>
      )}
      {mutation.error && <ErrorState error={mutation.error} />}
      <SuccessState message={notice || mutation.success} />
      {goal.milestones.length ? (
        <ol className="milestone-list">
          {goal.milestones.map((milestone, index) => (
            <GoalMilestoneItem
              key={milestone.id}
              milestone={milestone}
              index={index}
              total={goal.milestones.length}
              busy={mutation.loading}
              onToggle={toggleMilestone}
              onEdit={setEditing}
              onDelete={removeMilestone}
              onMove={reorder}
            />
          ))}
        </ol>
      ) : (
        <EmptyState
          title="A big goal starts with a small step."
          description="Add a milestone to give this goal a path forward."
        />
      )}
      {adding && (
        <MilestoneForm
          goalId={goal.id}
          open
          onOpenChange={setAdding}
          onSaved={setNotice}
        />
      )}
      {editing && (
        <MilestoneForm
          goalId={goal.id}
          milestone={editing}
          open
          onOpenChange={() => setEditing(null)}
          onSaved={setNotice}
        />
      )}
    </section>
  );
}
