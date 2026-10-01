import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/common';
import { dateLabel } from '@/lib/utils';
import { formatHabitValue } from '@/lib/habits';

export function HabitHistory({ habit, entries, onRecord }) {
  if (!entries.length) {
    return (
      <EmptyState
        title="No history in this range."
        description="Your recorded productivity days will appear here."
      />
    );
  }
  return (
    <div className="table-scroll history-table">
      <table>
        <thead>
          <tr>
            <th>Productivity day</th>
            <th>Value</th>
            <th>Target met</th>
            <th>Entry</th>
          </tr>
        </thead>
        <tbody>
          {[...entries].reverse().map((entry) => (
            <tr key={entry.id}>
              <td>
                {dateLabel(entry.productivityDate, {
                  weekday: 'short',
                  month: 'short',
                  day: 'numeric',
                  year: 'numeric',
                })}
              </td>
              <td>{formatHabitValue(habit, entry.value)}</td>
              <td>
                <span className={`entry-badge ${entry.completed ? 'successful' : ''}`}>
                  {entry.completed ? 'Yes' : 'No'}
                </span>
              </td>
              <td>
                <Button
                  variant="ghost"
                  size="sm"
                  disabled={!habit.active}
                  onClick={() => onRecord(entry)}
                >
                  Edit entry
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
