import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { dateLabel } from '@/lib/utils';
export function WeeklyChart({ week, large = false }) {
  const days = (week?.days || []).map((d) => ({ ...d, label: dateLabel(d.date) }));
  return (
    <div
      className="weekly-chart"
      style={{ height: large ? 260 : 165 }}
      role="img"
      aria-label={`Weekly task completion: ${days.map((d) => `${d.label} ${d.completionPercentage}%`).join(', ')}`}
    >
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={days}
          margin={{ top: 10, left: -8, right: 8, bottom: 0 }}
          barSize={large ? 36 : 24}
        >
          <CartesianGrid stroke="#2a2d29" vertical={false} strokeDasharray="3 6" />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#8b9188', fontSize: 11 }}
            dy={8}
          />
          <YAxis
            width={42}
            domain={[0, 100]}
            ticks={[0, 50, 100]}
            axisLine={false}
            tickLine={false}
            tick={{ fill: '#686f65', fontSize: 10 }}
            tickFormatter={(v) => `${v}%`}
          />
          <Tooltip
            cursor={{ fill: '#ffffff04' }}
            contentStyle={{
              background: '#232720',
              border: '1px solid #414638',
              borderRadius: 8,
              color: '#e7edde',
            }}
            formatter={(v) => [`${v}%`, 'Completion']}
          />
          <Bar
            dataKey="completionPercentage"
            radius={[5, 5, 0, 0]}
            minPointSize={3}
            isAnimationActive={false}
          >
            {days.map((d) => (
              <Cell key={d.date} fill={d.date === week.today ? '#c6f36a' : '#536b39'} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
