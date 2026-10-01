import { Link } from 'react-router-dom';
import { ArrowUpRight, Flag } from 'lucide-react';
import { ProgressBar } from '@/components/common';
import { dateLabel } from '@/lib/utils';

export function GoalCard({ goal, compact = false }) {
  return (
    <article className={`goal-card ${compact ? 'goal-card-compact' : ''}`}>
      <div className="goal-card-heading">
        <span className="goal-icon">
          <Flag size={17} />
        </span>
        <span className="entry-badge">{goal.status.toLowerCase()}</span>
      </div>
      <Link
        className="goal-title-link"
        to={`/goals/${goal.id}`}
      >
        <h3>{goal.title}</h3>
        <ArrowUpRight size={17} />
      </Link>
      {!compact && goal.description && <p className="card-description">{goal.description}</p>}
      <div className="goal-progress-label">
        <strong>{goal.progressPercentage}%</strong>
        <span>
          {goal.completedMilestones} / {goal.totalMilestones} milestones
        </span>
      </div>
      <ProgressBar
        value={goal.progressPercentage}
        label={`${goal.title} milestone progress`}
      />
      <div className="goal-card-footer">
        <span>
          {goal.targetDate
            ? `Target: ${dateLabel(goal.targetDate, { month: 'short', day: 'numeric', year: 'numeric' })}`
            : 'No target date set'}
        </span>
        <Link to={`/goals/${goal.id}`}>
          Open goal
          <ArrowUpRight size={13} />
        </Link>
      </div>
    </article>
  );
}
