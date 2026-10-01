import { useProductivity } from '@/stores/productivity';
import { ErrorState, LoadingState } from '@/components/common';
import { ResourceStatus } from '@/components/ResourceStatus';
import { ProductivityHeatmap } from '@/components/activity/ProductivityHeatmap';
import { ProductivitySummary, FocusSummary } from '@/components/analytics/PeriodSummary';
import { HabitTrends } from '@/components/analytics/HabitTrends';
import { StreakGoalSummary } from '@/components/analytics/StreakGoalSummary';
import { WeeklyBreakdown } from '@/components/analytics/WeeklyBreakdown';
import { useResource } from '@/hooks/useResource';
import { fetchAnalyticsOverview } from '@/services/analyticsApi';
import { dateLabel } from '@/lib/utils';

export default function Analytics() {
  const resource = useResource('overview', fetchAnalyticsOverview);
  const week = useProductivity((state) => state.week);
  const loading = useProductivity((state) => state.loading);
  const error = useProductivity((state) => state.error);
  const refresh = useProductivity((state) => state.refresh);
  const overview = resource.data;

  if (loading) {
    return <LoadingState />;
  }
  if (error) {
    return (
      <ErrorState
        error={error}
        retry={refresh}
      />
    );
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">SEE YOUR MOMENTUM</div>
          <h1>
            Progress, in perspective<span className="text-primary">.</span>
          </h1>
          <p>Tasks, focus, habits, and goals. A clearer picture of your progress.</p>
        </div>
        <span className="date-pill">
          {dateLabel(week.startsOn, { month: 'short', day: 'numeric' })} —{' '}
          {dateLabel(week.endsOn, { month: 'short', day: 'numeric' })}
        </span>
      </div>
      <ResourceStatus
        resource={resource}
        message="Loading analytics…"
      />
      {overview && !resource.error && (
        <>
          <ProductivitySummary overview={overview} />
          <FocusSummary overview={overview} />
          <WeeklyBreakdown week={week} />
          <HabitTrends overview={overview} />
          <StreakGoalSummary overview={overview} />
        </>
      )}
      <ProductivityHeatmap />
    </>
  );
}
