import { Target, CheckCheck, Clock3, TrendingUp } from 'lucide-react';
import { StatCard } from '@/components/common';
import { minutes } from '@/lib/utils';

export function ProductivitySummary({ overview }) {
  return (
    <section className="analytics-section">
      <div className="section-heading">
        <h2>Productivity</h2>
        <p>Completion is weighted by the number of planned tasks.</p>
      </div>
      <div className="stat-grid four">
        <StatCard
          label="Today’s completion"
          value={`${overview.daily.completionPercentage}%`}
          detail={`${overview.daily.completedTasks} / ${overview.daily.plannedTasks} tasks`}
          icon={Target}
          accent
        />
        <StatCard
          label="Weekly completion"
          value={`${overview.weekly.completionPercentage}%`}
          detail={`${overview.weekly.completedTasks} / ${overview.weekly.plannedTasks} tasks`}
          icon={TrendingUp}
        />
        <StatCard
          label="Monthly completion"
          value={`${overview.monthly.completionPercentage}%`}
          detail={`${overview.monthly.completedTasks} / ${overview.monthly.plannedTasks} tasks`}
          icon={TrendingUp}
        />
        <StatCard
          label="Tasks this month"
          value={overview.monthly.completedTasks}
          detail="Completed planned tasks"
          icon={CheckCheck}
        />
      </div>
    </section>
  );
}

export function FocusSummary({ overview }) {
  return (
    <section className="analytics-section">
      <div className="section-heading">
        <h2>Focus</h2>
        <p>Finished sessions, excluding pauses.</p>
      </div>
      <div className="stat-grid">
        <StatCard
          label="Focus today"
          value={minutes(overview.daily.focusSeconds)}
          detail="This productivity day"
          icon={Clock3}
        />
        <StatCard
          label="Focus this week"
          value={minutes(overview.weekly.focusSeconds)}
          detail="Monday through Sunday"
          icon={Clock3}
        />
        <StatCard
          label="Focus this month"
          value={minutes(overview.monthly.focusSeconds)}
          detail="Current productivity month"
          icon={Clock3}
        />
      </div>
    </section>
  );
}
