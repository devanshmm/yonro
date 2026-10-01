import { useState } from 'react';
import { EmptyState } from '@/components/common';
import { ResourceStatus } from '@/components/ResourceStatus';
import { useResource } from '@/hooks/useResource';
import { fetchHeatmap } from '@/services/analyticsApi';
import { heatmapMetrics, heatmapLayout, heatmapCellLabel, nextHeatmapCell } from '@/lib/heatmap';

function HeatmapGrid({ data, metric }) {
  const [selected, setSelected] = useState(data.days.at(-1));
  const [focusedDate, setFocusedDate] = useState(data.endDate);
  const layout = heatmapLayout(data);
  const activeDays = data.days.filter((day) => day.levels[metric] > 0).length;

  function moveFocus(event, day) {
    const index = data.days.findIndex((entry) => entry.date === day.date);
    const nextIndex = nextHeatmapCell(index, event.key, data.days.length);
    if (nextIndex === null) {
      return;
    }
    event.preventDefault();
    const nextDate = data.days[nextIndex].date;
    setFocusedDate(nextDate);
    event.currentTarget.parentElement.querySelector(`[data-date="${nextDate}"]`).focus();
  }

  return (
    <>
      <div className="heatmap-scroll">
        <div
          className="heatmap-content"
          style={{ '--weeks': layout.weeks }}
        >
          <div className="heatmap-months">
            {layout.months.map((month) => (
              <span
                key={month.key}
                style={{ gridColumn: month.column }}
              >
                {month.label}
              </span>
            ))}
          </div>
          <div className="heatmap-body">
            <div className="heatmap-weekdays">
              <span>Mon</span>
              <span>Wed</span>
              <span>Fri</span>
            </div>
            <div
              className="heatmap-grid"
              aria-label={`${metric} activity across 365 productivity days`}
            >
              {layout.cells.map((day, index) =>
                day ? (
                  <button
                    key={day.date}
                    type="button"
                    data-date={day.date}
                    className={`heatmap-cell level-${day.levels[metric]}`}
                    title={heatmapCellLabel(day, metric)}
                    aria-label={heatmapCellLabel(day, metric)}
                    aria-pressed={selected?.date === day.date}
                    tabIndex={focusedDate === day.date ? 0 : -1}
                    onFocus={() => {
                      setFocusedDate(day.date);
                      setSelected(day);
                    }}
                    onClick={() => setSelected(day)}
                    onKeyDown={(event) => moveFocus(event, day)}
                  />
                ) : (
                  <span
                    key={`padding-${index}`}
                    className="heatmap-padding"
                    aria-hidden="true"
                  />
                ),
              )}
            </div>
          </div>
        </div>
      </div>
      <div className="heatmap-footer">
        <span>{activeDays} active days in this view</span>
        <div className="heatmap-legend">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((level) => (
            <i
              key={level}
              className={`level-${level}`}
            />
          ))}
          <span>More</span>
        </div>
      </div>
      <p
        className="heatmap-selection"
        role="status"
      >
        {selected
          ? heatmapCellLabel(
              data.days.find((day) => day.date === selected.date) ?? selected,
              metric,
            )
          : 'Select a productivity day to inspect it.'}
      </p>
      {!activeDays && (
        <EmptyState
          title="Start locking in and your progress will appear here."
          description="Only completed tasks, successful habits, and finished focus sessions count."
        />
      )}
    </>
  );
}

export function ProductivityHeatmap() {
  const resource = useResource('activity', fetchHeatmap);
  const [metric, setMetric] = useState('overall');

  return (
    <section className="panel activity-panel">
      <div className="panel-heading">
        <div>
          <h2>Your activity</h2>
          <p className="form-help">365 productivity days. Every meaningful effort leaves a mark.</p>
        </div>
        <div className="tabs heatmap-filters">
          {heatmapMetrics.map((option) => (
            <button
              key={option.value}
              type="button"
              className={metric === option.value ? 'selected' : ''}
              aria-pressed={metric === option.value}
              onClick={() => setMetric(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>
      <ResourceStatus
        resource={resource}
        message="Loading activity…"
      />
      {resource.data && !resource.error && (
        <HeatmapGrid
          data={resource.data}
          metric={metric}
        />
      )}
    </section>
  );
}
