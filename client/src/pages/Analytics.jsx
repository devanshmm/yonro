import { Target, CheckCheck, Clock3, TrendingUp } from 'lucide-react';
import { useProductivity } from '@/stores/productivity';
import { StatCard, ErrorState, LoadingState, ProgressBar } from '@/components/common';
import { WeeklyChart } from '@/components/WeeklyChart';
import { dateLabel, minutes } from '@/lib/utils';
export default function Analytics() {
  const { today, week, loading, error, refresh } = useProductivity();
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} retry={refresh} />;
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">SEE YOUR MOMENTUM</div>
          <h1>
            Progress, in perspective<span className="text-primary">.</span>
          </h1>
          <p>Small efforts leave a trail. Here’s yours.</p>
        </div>
        <span className="date-pill">
          {dateLabel(week.startsOn, { month: 'short', day: 'numeric' })} —{' '}
          {dateLabel(week.endsOn, { month: 'short', day: 'numeric' })}
        </span>
      </div>
      <div className="stat-grid four">
        <StatCard
          label="Today’s completion"
          value={`${today.completionPercentage}%`}
          detail={`${today.completedTasks} / ${today.plannedTasks} tasks`}
          icon={Target}
          accent
        />
        <StatCard
          label="Weekly completion"
          value={`${week.completionPercentage}%`}
          detail="Across all tasks planned this week"
          icon={TrendingUp}
        />
        <StatCard
          label="Tasks this week"
          value={week.completedTasks}
          detail={`${week.plannedTasks} tasks planned`}
          icon={CheckCheck}
        />
        <StatCard
          label="Focus this week"
          value={minutes(week.focusSeconds)}
          detail="Completed focus sessions"
          icon={Clock3}
        />
      </div>
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h2>Weekly completion</h2>
            <p className="text-sm text-muted-foreground mt-2">
              A little consistency goes a long way.
            </p>
          </div>
          <span className="chart-legend">
            <i />
            Task completion
          </span>
        </div>
        <WeeklyChart week={week} large />
      </section>
      <section className="panel mt-5">
        <div className="panel-heading">
          <h2>Your week, day by day</h2>
        </div>
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Productivity day</th>
                <th>Tasks completed</th>
                <th>Completion</th>
                <th>Focus time</th>
              </tr>
            </thead>
            <tbody>
              {week.days.map((d) => (
                <tr key={d.date}>
                  <td>
                    {dateLabel(d.date, { weekday: 'long', month: 'short', day: 'numeric' })}
                    {d.date === week.today && <span className="today-label">Today</span>}
                  </td>
                  <td>
                    {d.completedTasks} / {d.plannedTasks}
                  </td>
                  <td>
                    <div className="table-progress">
                      <ProgressBar value={d.completionPercentage} />
                      <span>{d.completionPercentage}%</span>
                    </div>
                  </td>
                  <td>{minutes(d.focusSeconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
