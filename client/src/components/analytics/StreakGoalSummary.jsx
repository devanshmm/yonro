import { Link } from 'react-router-dom';
import { Flame, TrendingUp } from 'lucide-react';
import { StatCard, ProgressBar, EmptyState } from '@/components/common';

export function StreakGoalSummary({ overview }) {
  return (
    <div className="growth-grid analytics-section">
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>LockIn streaks</h2>
            <p className="form-help">Tasks, successful habits, and completed focus all count.</p>
          </div>
        </div>
        <div className="streak-summary">
          <StatCard
            label="Current streak"
            value={`${overview.streaks.currentStreak} days`}
            detail="Today can continue yesterday’s streak"
            icon={Flame}
            accent
          />
          <StatCard
            label="Longest streak"
            value={`${overview.streaks.longestStreak} days`}
            detail="Across all your recorded activity"
            icon={TrendingUp}
          />
        </div>
      </section>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Goals</h2>
            <p className="form-help">
              {overview.goals.activeCount} active · {overview.goals.completedCount} completed
            </p>
          </div>
          <Link
            className="section-link"
            to="/goals"
          >
            All goals ↗
          </Link>
        </div>
        {overview.goals.activeGoals.length ? (
          <div className="goal-analytics-list">
            {overview.goals.activeGoals.map((goal) => (
              <div key={goal.id}>
                <Link to={`/goals/${goal.id}`}>{goal.title}</Link>
                <div className="goal-progress-label">
                  <span>
                    {goal.completedMilestones} / {goal.totalMilestones} milestones
                  </span>
                  <strong>{goal.progressPercentage}%</strong>
                </div>
                <ProgressBar
                  value={goal.progressPercentage}
                  label={`${goal.title} progress`}
                />
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            title="What are you working toward?"
            description="Your active goals and milestone progress will appear here."
          />
        )}
      </section>
    </div>
  );
}
