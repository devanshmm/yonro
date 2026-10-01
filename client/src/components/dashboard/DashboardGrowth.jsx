import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { EmptyState } from '@/components/common';
import { ResourceStatus, SuccessState } from '@/components/ResourceStatus';
import { HabitList } from '@/components/habits/HabitList';
import { HabitEntryForm } from '@/components/habits/HabitEntryForm';
import { GoalCard } from '@/components/goals/GoalCard';
import { useResource } from '@/hooks/useResource';
import { fetchHabits } from '@/services/habitApi';
import { fetchGoals } from '@/services/goalApi';

export function DashboardGrowth() {
  const habitResource = useResource('habits', fetchHabits);
  const goalResource = useResource('goals', fetchGoals);
  const [tracking, setTracking] = useState(null);
  const [notice, setNotice] = useState(null);
  const habits = (habitResource.data ?? []).filter((habit) => habit.active).slice(0, 3);
  const goals = (goalResource.data ?? []).filter((goal) => goal.status === 'ACTIVE').slice(0, 2);

  return (
    <>
      <SuccessState message={notice} />
      <div className="growth-grid">
        <section className="panel">
          <div className="panel-heading">
            <h2>Today’s habits</h2>
            <Link
              className="section-link"
              to="/habits"
            >
              All habits
              <ArrowUpRight size={14} />
            </Link>
          </div>
          <ResourceStatus
            resource={habitResource}
            message="Loading habits…"
          />
          {habitResource.data && !habitResource.error && (
            <HabitList
              habits={habits}
              compact
              onRecord={setTracking}
            />
          )}
        </section>
        <section className="panel">
          <div className="panel-heading">
            <h2>Current goals</h2>
            <Link
              className="section-link"
              to="/goals"
            >
              All goals
              <ArrowUpRight size={14} />
            </Link>
          </div>
          <ResourceStatus
            resource={goalResource}
            message="Loading goals…"
          />
          {goalResource.data &&
            !goalResource.error &&
            (goals.length ? (
              <div className="compact-goal-list">
                {goals.map((goal) => (
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    compact
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                title="What are you working toward?"
                description="Give your bigger plans a home."
              />
            ))}
        </section>
      </div>
      {tracking && (
        <HabitEntryForm
          habit={tracking}
          open
          onOpenChange={() => setTracking(null)}
          onSaved={setNotice}
        />
      )}
    </>
  );
}
