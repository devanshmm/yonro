import { useState, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorState, ProgressBar } from '@/components/common';
import { ResourceStatus, SuccessState } from '@/components/ResourceStatus';
import { GoalForm } from '@/components/goals/GoalForm';
import { GoalMilestoneList } from '@/components/goals/GoalMilestoneList';
import { useResource } from '@/hooks/useResource';
import { useMutation } from '@/hooks/useMutation';
import { fetchGoal, deleteGoal } from '@/services/goalApi';
import { dateLabel } from '@/lib/utils';

export default function GoalDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [notice, setNotice] = useState(null);
  const loader = useCallback(() => fetchGoal(id), [id]);
  const resource = useResource(`goal:${id}`, loader);
  const mutation = useMutation();
  const goal = resource.data;

  async function removeGoal() {
    if (!confirm('Delete this goal and all its milestones?')) {
      return;
    }
    const deleted = await mutation.run(() => deleteGoal(id));
    if (deleted) {
      navigate('/goals');
    }
  }

  return (
    <>
      <Link
        className="back-link"
        to="/goals"
      >
        <ArrowLeft size={14} />
        All goals
      </Link>
      <ResourceStatus
        resource={resource}
        message="Loading goal…"
      />
      {goal && !resource.error && (
        <>
          <div className="page-heading">
            <div>
              <div className="eyebrow">{goal.status} GOAL</div>
              <h1>
                {goal.title}
                <span className="text-primary">.</span>
              </h1>
              <p>{goal.description || 'One milestone closer, every time you show up.'}</p>
            </div>
            <Button
              variant="secondary"
              onClick={() => setEditing(true)}
            >
              <Pencil size={14} />
              Edit goal
            </Button>
          </div>
          <SuccessState message={notice} />
          {mutation.error && <ErrorState error={mutation.error} />}
          <section className="panel goal-detail-progress">
            <div className="goal-progress-label">
              <strong>{goal.progressPercentage}%</strong>
              <span>
                {goal.completedMilestones} / {goal.totalMilestones} milestones completed
              </span>
            </div>
            <ProgressBar
              value={goal.progressPercentage}
              label="Goal milestone progress"
            />
            <p className="form-help">
              {goal.targetDate
                ? `Target date: ${dateLabel(goal.targetDate, { month: 'long', day: 'numeric', year: 'numeric' })}`
                : 'No target date set. Keep moving at your pace.'}
            </p>
          </section>
          <GoalMilestoneList goal={goal} />
          <div className="detail-footer">
            <Button
              variant="destructive"
              onClick={removeGoal}
              disabled={mutation.loading}
            >
              <Trash2 size={15} />
              {mutation.loading ? 'Deleting goal…' : 'Delete goal'}
            </Button>
          </div>
          {editing && (
            <GoalForm
              goal={goal}
              open
              onOpenChange={setEditing}
              onSaved={setNotice}
            />
          )}
        </>
      )}
    </>
  );
}
