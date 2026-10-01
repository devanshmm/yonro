import { WeeklyChart } from '@/components/WeeklyChart';
import { ProgressBar } from '@/components/common';
import { dateLabel, minutes } from '@/lib/utils';

export function WeeklyBreakdown({ week }) {
  return (
    <>
      <section className="panel analytics-section">
        <div className="panel-heading">
          <h2>Weekly completion</h2>
          <span className="chart-legend">
            <i />
            Task completion
          </span>
        </div>
        <WeeklyChart
          week={week}
          large
        />
      </section>
      <section className="panel analytics-section">
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
              {week.days.map((day) => (
                <tr key={day.date}>
                  <td>
                    {dateLabel(day.date, { weekday: 'long', month: 'short', day: 'numeric' })}
                    {day.date === week.today && <span className="today-label">Today</span>}
                  </td>
                  <td>
                    {day.completedTasks} / {day.plannedTasks}
                  </td>
                  <td>
                    <div className="table-progress">
                      <ProgressBar value={day.completionPercentage} />
                      <span>{day.completionPercentage}%</span>
                    </div>
                  </td>
                  <td>{minutes(day.focusSeconds)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}
