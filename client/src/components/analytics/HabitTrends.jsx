import { Link } from 'react-router-dom';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from 'recharts';
import { EmptyState } from '@/components/common';
import { dateLabel } from '@/lib/utils';

export function HabitTrends({ overview }) {
  const hasEntries = overview.habits.trend.some((day) => day.tracked > 0);
  return (
    <section className="panel analytics-section">
      <div className="panel-heading">
        <div>
          <h2>Habits</h2>
          <p className="form-help">
            {overview.monthly.habitCompletionPercentage}% of tracked habit entries met their target
            this month.
          </p>
        </div>
        <Link
          className="section-link"
          to="/habits"
        >
          View habits ↗
        </Link>
      </div>
      {hasEntries ? (
        <div
          className="habit-chart"
          role="img"
          aria-label="Habit completion percentage over the last 30 productivity days"
        >
          <ResponsiveContainer
            width="100%"
            height="100%"
          >
            <LineChart
              data={overview.habits.trend}
              margin={{ top: 10, right: 15, left: 0, bottom: 10 }}
            >
              <CartesianGrid
                stroke="#2a3523"
                vertical={false}
                strokeDasharray="3 6"
              />
              <XAxis
                dataKey="date"
                tickFormatter={(date) => dateLabel(date, { month: 'short', day: 'numeric' })}
                minTickGap={40}
                tick={{ fill: '#9aaf87', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                width={40}
                domain={[0, 100]}
                tick={{ fill: '#9aaf87', fontSize: 10 }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                formatter={(value) => [`${value}%`, 'Successful entries']}
                contentStyle={{
                  background: '#232b1d',
                  border: '1px solid #485d36',
                  borderRadius: 8,
                }}
              />
              <Line
                dataKey="completionPercentage"
                stroke="#c6f36a"
                strokeWidth={2}
                dot={{ r: 2 }}
                connectNulls={false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <EmptyState
          title="Your habit trends start with one entry."
          description="Untracked days are kept separate from unsuccessful days."
        />
      )}
      {overview.habits.streaks.length > 0 && (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Active habit</th>
                <th>Current streak</th>
                <th>Best streak</th>
              </tr>
            </thead>
            <tbody>
              {overview.habits.streaks.map((habit) => (
                <tr key={habit.id}>
                  <td>
                    <Link to={`/habits/${habit.id}`}>{habit.name} ↗</Link>
                  </td>
                  <td>{habit.currentStreak} days</td>
                  <td>{habit.longestStreak} days</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
