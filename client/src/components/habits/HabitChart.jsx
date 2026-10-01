import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import { EmptyState } from '@/components/common';
import { dateLabel } from '@/lib/utils';
import { formatHabitValue } from '@/lib/habits';

export function HabitChart({ habit, chart }) {
  const trackedDays = chart.filter((day) => day.tracked).length;
  if (!trackedDays) {
    return (
      <EmptyState
        title="Your habit history will appear here once you start tracking."
        description="Record a value to see your trend over time."
      />
    );
  }
  return (
    <div
      className="habit-chart"
      role="img"
      aria-label={`${habit.name} values across ${chart.length} productivity days; ${trackedDays} days tracked`}
    >
      <ResponsiveContainer
        width="100%"
        height="100%"
      >
        <LineChart
          data={chart}
          margin={{ top: 15, right: 15, left: 0, bottom: 10 }}
        >
          <CartesianGrid
            stroke="#2a3523"
            vertical={false}
            strokeDasharray="3 6"
          />
          <XAxis
            dataKey="date"
            tickFormatter={(date) => dateLabel(date, { month: 'short', day: 'numeric' })}
            minTickGap={35}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9aaf87', fontSize: 10 }}
          />
          <YAxis
            width={48}
            domain={
              habit.type === 'PERCENTAGE'
                ? [0, 100]
                : habit.type === 'BOOLEAN'
                  ? [0, 1]
                  : [0, 'auto']
            }
            allowDecimals={habit.type !== 'COUNTER' && habit.type !== 'BOOLEAN'}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#9aaf87', fontSize: 10 }}
          />
          <Tooltip
            labelFormatter={(date) =>
              dateLabel(date, { weekday: 'short', month: 'short', day: 'numeric' })
            }
            formatter={(value) => [formatHabitValue(habit, value), 'Tracked']}
            contentStyle={{ background: '#232b1d', border: '1px solid #485d36', borderRadius: 8 }}
          />
          <ReferenceLine
            y={habit.targetValue}
            ifOverflow="extendDomain"
            stroke="#788c63"
            strokeDasharray="5 5"
            label={{ value: 'Target', fill: '#9caf88', fontSize: 10 }}
          />
          <Line
            dataKey="value"
            type="linear"
            stroke="#c6f36a"
            strokeWidth={2}
            dot={{ r: 3, fill: '#c6f36a' }}
            connectNulls={false}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
