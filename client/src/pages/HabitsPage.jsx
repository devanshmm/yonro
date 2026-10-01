import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ResourceStatus, SuccessState } from '@/components/ResourceStatus';
import { HabitList } from '@/components/habits/HabitList';
import { HabitForm } from '@/components/habits/HabitForm';
import { HabitEntryForm } from '@/components/habits/HabitEntryForm';
import { useResource } from '@/hooks/useResource';
import { fetchHabits } from '@/services/habitApi';

export default function HabitsPage() {
  const resource = useResource('habits', fetchHabits);
  const [scope, setScope] = useState('active');
  const [editing, setEditing] = useState(null);
  const [creating, setCreating] = useState(false);
  const [tracking, setTracking] = useState(null);
  const [notice, setNotice] = useState(null);
  const habits = (resource.data ?? []).filter((habit) => habit.active === (scope === 'active'));

  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">CONSISTENCY, ON YOUR TERMS</div>
          <h1>
            Your habits<span className="text-primary">.</span>
          </h1>
          <p>Choose what to measure. Keep returning to what matters.</p>
        </div>
        <Button onClick={() => setCreating(true)}>
          <Plus size={16} />
          New habit
        </Button>
      </div>
      <div className="collection-toolbar">
        <div className="tabs">
          <button
            className={scope === 'active' ? 'selected' : ''}
            onClick={() => setScope('active')}
          >
            Active habits
          </button>
          <button
            className={scope === 'archived' ? 'selected' : ''}
            onClick={() => setScope('archived')}
          >
            Archived habits
          </button>
        </div>
        <span className="form-help">{habits.length} habits</span>
      </div>
      <SuccessState message={notice} />
      <ResourceStatus
        resource={resource}
        message="Loading habits…"
      />
      {resource.data && !resource.error && (
        <HabitList
          habits={habits}
          onEdit={setEditing}
          onRecord={setTracking}
        />
      )}
      {creating && (
        <HabitForm
          open
          onOpenChange={setCreating}
          onSaved={setNotice}
        />
      )}
      {editing && (
        <HabitForm
          key={editing.id}
          habit={editing}
          open
          onOpenChange={() => setEditing(null)}
          onSaved={setNotice}
        />
      )}
      {tracking && (
        <HabitEntryForm
          key={tracking.id}
          habit={tracking}
          open
          onOpenChange={() => setTracking(null)}
          onSaved={setNotice}
        />
      )}
    </>
  );
}
