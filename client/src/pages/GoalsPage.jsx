import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common';
import { ResourceStatus, SuccessState } from '@/components/ResourceStatus';
import { GoalCard } from '@/components/goals/GoalCard';
import { GoalForm } from '@/components/goals/GoalForm';
import { useResource } from '@/hooks/useResource';
import { fetchGoals } from '@/services/goalApi';

export default function GoalsPage() {
  const resource = useResource('goals', fetchGoals);
  const [status, setStatus] = useState('ACTIVE');
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState(null);
  const goals = (resource.data ?? []).filter((goal) => status === 'ALL' || goal.status === status);

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">KEEP THE BIGGER PICTURE CLOSE</div>
          <h1>
            Your goals<span className="text-primary">.</span>
          </h1>
          <p>Turn a direction into a plan. One milestone at a time.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus size={16} />
          New goal
        </Button>
      </div>
      <div className="collection-toolbar">
        <div className="tabs">
          {['ACTIVE', 'COMPLETED', 'ARCHIVED', 'ALL'].map((value) => (
            <button
              key={value}
              className={status === value ? 'selected' : ''}
              onClick={() => setStatus(value)}
            >
              {value.toLowerCase()}
            </button>
          ))}
        </div>
        <span className="form-help">{goals.length} goals</span>
      </div>
      <SuccessState message={notice} />
      <ResourceStatus
        resource={resource}
        message="Loading goals…"
      />
      {resource.data &&
        !resource.error &&
        (goals.length ? (
          <div className="collection-grid">
            {goals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
              />
            ))}
          </div>
        ) : (
          <EmptyState
            title="What are you working toward?"
            description="Create a goal and turn it into achievable milestones."
          />
        ))}
      {creating && (
        <GoalForm
          open
          onOpenChange={setCreating}
          onSaved={setNotice}
        />
      )}
    </>
  );
}
