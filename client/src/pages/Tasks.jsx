import { useState, useEffect } from 'react';
import { Plus, Search } from 'lucide-react';
import { useProductivity } from '@/stores/productivity';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { TaskEditor, TaskList, QuickAdd } from '@/components/TaskList';
import { ErrorState, LoadingState } from '@/components/common';
export default function Tasks() {
  const { today, tasks, loading, error, refresh } = useProductivity(),
    [adding, setAdding] = useState(false),
    [filter, setFilter] = useState('ALL'),
    [search, setSearch] = useState(''),
    [date, setDate] = useState(''),
    [historical, setHistorical] = useState(null),
    [historyError, setHistoryError] = useState(null);
  useEffect(() => {
    let cancelled = false;
    if (!date || date === today?.productivityDate) {
      setHistorical(null);
      setHistoryError(null);
      return;
    }
    setHistorical(null);
    setHistoryError(null);
    api
      .get('/tasks', { params: { date } })
      .then(({ data }) => {
        if (!cancelled) setHistorical(data.tasks);
      })
      .catch((e) => {
        if (!cancelled) setHistoryError(e);
      });
    return () => {
      cancelled = true;
    };
  }, [date, today?.productivityDate, tasks]);
  if (loading) return <LoadingState />;
  if (error) return <ErrorState error={error} retry={refresh} />;
  const isHistory = date && date !== today.productivityDate;
  const list = (isHistory ? historical || [] : tasks).filter(
    (t) =>
      (filter === 'ALL' || t.status === filter) &&
      `${t.title} ${t.category}`.toLowerCase().includes(search.toLowerCase()),
  );
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">A PLAN YOU CAN ACT ON</div>
          <h1>
            Your tasks<span className="text-primary">.</span>
          </h1>
          <p>Make space for what matters. One task at a time.</p>
        </div>
        <Button onClick={() => setAdding(true)}>
          <Plus size={17} />
          New task
        </Button>
      </div>
      <section className="panel">
        <div className="task-toolbar">
          <div className="tabs">
            {[
              ['ALL', 'All tasks'],
              ['TODO', 'To do'],
              ['IN_PROGRESS', 'In progress'],
              ['COMPLETED', 'Completed'],
              ['SKIPPED', 'Skipped'],
            ].map(([value, label]) => (
              <button
                key={value}
                className={filter === value ? 'selected' : ''}
                onClick={() => setFilter(value)}
              >
                {label}
              </button>
            ))}
          </div>
          <label className="date-select">
            Day
            <input
              aria-label="Task productivity date"
              type="date"
              value={date || today.productivityDate}
              onChange={(e) => setDate(e.target.value)}
            />
          </label>
        </div>
        <div className="search-field">
          <Search size={16} />
          <input
            aria-label="Search tasks"
            placeholder="Search your tasks or categories…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        {!isHistory && <QuickAdd />}
        {historyError ? (
          <ErrorState error={historyError} />
        ) : isHistory && !historical ? (
          <LoadingState />
        ) : (
          <TaskList tasks={list} />
        )}
      </section>
      <TaskEditor open={adding} onOpenChange={setAdding} />
    </>
  );
}
