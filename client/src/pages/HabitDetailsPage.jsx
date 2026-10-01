import { useState, useCallback } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { Pencil, Trash2, ArrowLeft, Archive, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ErrorState } from '@/components/common';
import { ResourceStatus, SuccessState, HistoryRange } from '@/components/ResourceStatus';
import { HabitForm } from '@/components/habits/HabitForm';
import { HabitEntryForm } from '@/components/habits/HabitEntryForm';
import { HabitStats } from '@/components/habits/HabitStats';
import { HabitChart } from '@/components/habits/HabitChart';
import { HabitHistory } from '@/components/habits/HabitHistory';
import { useResource } from '@/hooks/useResource';
import { useMutation } from '@/hooks/useMutation';
import { fetchHabitAnalytics, deleteHabit, updateHabit } from '@/services/habitApi';
import { habitTargetLabel, formatHabitValue } from '@/lib/habits';

export default function HabitDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [days, setDays] = useState(30);
  const [editing, setEditing] = useState(false);
  const [tracking, setTracking] = useState(null);
  const [notice, setNotice] = useState(null);
  const loader = useCallback(() => fetchHabitAnalytics(id, days), [id, days]);
  const resource = useResource(`habit:${id}:${days}`, loader);
  const mutation = useMutation();
  const details = resource.data;

  async function removeHabit() {
    if (!confirm('Delete this habit and its recorded history?')) {
      return;
    }
    const deleted = await mutation.run(() => deleteHabit(id));
    if (deleted) {
      navigate('/habits');
    }
  }

  function trackEntry(entry = null) {
    setTracking({ entry, date: entry?.productivityDate ?? details.endDate });
  }

  return (
    <>
      <Link
        className="back-link"
        to="/habits"
      >
        <ArrowLeft size={14} />
        All habits
      </Link>
      <ResourceStatus
        resource={resource}
        message="Loading habit analytics…"
      />
      {details && !resource.error && (
        <>
          <div className="page-heading">
            <div>
              <div className="eyebrow">YOUR PRACTICE, OVER TIME</div>
              <h1>
                {details.habit.name}
                <span className="text-primary">.</span>
              </h1>
              <p>{details.habit.description || habitTargetLabel(details.habit)}</p>
            </div>
            <div className="heading-actions">
              <Button
                variant="secondary"
                onClick={() => setEditing(true)}
              >
                <Pencil size={14} />
                Edit habit
              </Button>
              <Button
                disabled={!details.habit.active}
                onClick={() => trackEntry()}
              >
                Track today
              </Button>
            </div>
          </div>
          <div className="collection-toolbar">
            <HistoryRange
              value={days}
              onChange={setDays}
            />
            <span className="form-help">
              {habitTargetLabel(details.habit)} · Today:{' '}
              {formatHabitValue(details.habit, details.habit.todayEntry?.value)}
            </span>
          </div>
          <SuccessState message={notice || mutation.success} />
          {mutation.error && <ErrorState error={mutation.error} />}
          <HabitStats
            habit={details.habit}
            statistics={details.statistics}
          />
          <section className="panel">
            <div className="panel-heading">
              <h2>Your habit trend</h2>
              <span className="form-help">Missing days remain untracked</span>
            </div>
            <HabitChart
              habit={details.habit}
              chart={details.chart}
            />
          </section>
          <section className="panel mt-5">
            <div className="panel-heading">
              <h2>Recorded history</h2>
              <span className="form-help">Targets are evaluated when entries are saved</span>
            </div>
            <HabitHistory
              habit={details.habit}
              entries={details.entries}
              onRecord={trackEntry}
            />
          </section>
          <div className="detail-footer">
            <Button
              variant="secondary"
              disabled={mutation.loading}
              onClick={() =>
                mutation.run(
                  () => updateHabit(id, { active: !details.habit.active }),
                  details.habit.active ? 'Habit archived' : 'Habit restored',
                )
              }
            >
              {details.habit.active ? <Archive size={15} /> : <RotateCcw size={15} />}
              {mutation.loading
                ? 'Updating habit…'
                : details.habit.active
                  ? 'Archive habit'
                  : 'Restore habit'}
            </Button>
            <Button
              variant="destructive"
              disabled={mutation.loading}
              onClick={removeHabit}
            >
              <Trash2 size={15} />
              Delete habit
            </Button>
          </div>
          {editing && (
            <HabitForm
              habit={details.habit}
              open
              onOpenChange={setEditing}
              onSaved={setNotice}
            />
          )}
          {tracking && (
            <HabitEntryForm
              habit={details.habit}
              entry={tracking.entry}
              date={tracking.date}
              open
              onOpenChange={() => setTracking(null)}
              onSaved={setNotice}
            />
          )}
        </>
      )}
    </>
  );
}
