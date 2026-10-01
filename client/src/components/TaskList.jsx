import { useState } from 'react';
import { Check, Pencil, Clock3, Plus, Trash2 } from 'lucide-react';
import { useProductivity } from '@/stores/productivity';
import { Button } from './ui/button';
import { Dialog, DialogContent } from './ui/dialog';
import { EmptyState, ErrorState } from './common';
import { errorMessage } from '@/lib/utils';
export function TaskEditor({ open, onOpenChange, task }) {
  const create = useProductivity((s) => s.createTask),
    update = useProductivity((s) => s.updateTask),
    remove = useProductivity((s) => s.deleteTask);
  const [busy, setBusy] = useState(false),
    [error, setError] = useState(null);
  async function submit(event) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    const data = Object.fromEntries(new FormData(event.currentTarget));
    data.estimatedMinutes = data.estimatedMinutes ? Number(data.estimatedMinutes) : null;
    if (!data.productivityDate) delete data.productivityDate;
    try {
      if (task) await update(task.id, data);
      else await create(data);
      onOpenChange(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  async function deleteTask() {
    if (!confirm('Delete this task?')) return;
    setBusy(true);
    try {
      await remove(task.id);
      onOpenChange(false);
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        title={task ? 'Edit your task' : 'Make a little progress.'}
        description="Give your next step a name. Keep it clear and achievable."
      >
        <form onSubmit={submit} className="form-stack" key={task?.id || 'new'}>
          <label>
            Task name
            <input
              name="title"
              defaultValue={task?.title}
              required
              maxLength={200}
              placeholder="What will you work on?"
              autoFocus
            />
          </label>
          <label>
            Description
            <textarea
              name="description"
              defaultValue={task?.description || ''}
              maxLength={2000}
              rows={2}
              placeholder="A few details, if you need them"
            />
          </label>
          <div className="form-row">
            <label>
              Category
              <input
                name="category"
                defaultValue={task?.category || 'Personal'}
                required
                maxLength={50}
              />
            </label>
            <label>
              Priority
              <select
                aria-label="Priority"
                name="priority"
                defaultValue={task?.priority || 'MEDIUM'}
              >
                <option>LOW</option>
                <option>MEDIUM</option>
                <option>HIGH</option>
              </select>
            </label>
          </div>
          <div className="form-row">
            <label>
              Estimated minutes
              <input
                type="number"
                name="estimatedMinutes"
                min={1}
                max={1440}
                defaultValue={task?.estimatedMinutes || ''}
                placeholder="30"
              />
            </label>
            <label>
              Productivity date
              <input
                type="date"
                name="productivityDate"
                defaultValue={
                  task?.productivityDate || useProductivity.getState().today?.productivityDate
                }
              />
            </label>
          </div>
          {task && (
            <label>
              Status
              <select aria-label="Status" name="status" defaultValue={task.status}>
                {['TODO', 'IN_PROGRESS', 'COMPLETED', 'SKIPPED'].map((s) => (
                  <option key={s} value={s}>
                    {s.replaceAll('_', ' ')}
                  </option>
                ))}
              </select>
            </label>
          )}
          {error && <ErrorState error={error} />}
          <div className="flex justify-between gap-3">
            {task ? (
              <Button type="button" variant="destructive" onClick={deleteTask} disabled={busy}>
                <Trash2 size={15} />
                Delete
              </Button>
            ) : (
              <span />
            )}
            <Button type="submit" disabled={busy}>
              {busy ? 'Saving…' : task ? 'Save changes' : 'Create task'}
              <Plus size={16} />
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
export function QuickAdd() {
  const create = useProductivity((s) => s.createTask),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(null);
  async function submit(e) {
    e.preventDefault();
    const form = e.currentTarget;
    const title = new FormData(form).get('title').trim();
    if (!title) return;
    setBusy(true);
    setError(null);
    try {
      await create({ title });
      form.reset();
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <form className="quick-add" onSubmit={submit}>
        <Plus size={18} />
        <input
          name="title"
          aria-label="Quick add task"
          placeholder="Add a task for today…"
          maxLength={200}
          required
        />
        <Button type="submit" size="sm" variant="secondary" disabled={busy}>
          {busy ? 'Adding…' : 'Add task'}
          <span className="keyboard-hint">↵</span>
        </Button>
      </form>
      {error && <ErrorState error={error} />}
    </>
  );
}
export function TaskCard({ task, onEdit }) {
  const update = useProductivity((s) => s.updateTask),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(null);
  const done = task.status === 'COMPLETED';
  async function toggle() {
    setBusy(true);
    setError(null);
    try {
      await update(task.id, { status: done ? 'TODO' : 'COMPLETED' });
    } catch (e) {
      setError(errorMessage(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <div>
      <div className={`task-card ${done ? 'task-done' : ''}`}>
        <button
          className={`task-check ${done ? 'checked' : ''}`}
          onClick={toggle}
          aria-label={`${done ? 'Uncomplete' : 'Complete'} ${task.title}`}
          disabled={busy}
        >
          {done && <Check size={13} />}
        </button>
        <div className="task-content">
          <span className="task-title">{task.title}</span>
          <div className="task-meta">
            <span className="category-tag">{task.category}</span>
            {task.estimatedMinutes && (
              <span>
                <Clock3 size={11} />
                {task.estimatedMinutes} min
              </span>
            )}
            {task.status === 'IN_PROGRESS' && <span className="text-primary">In progress</span>}
            {task.status === 'SKIPPED' && <span>Skipped</span>}
          </div>
        </div>
        <span className={`priority priority-${task.priority.toLowerCase()}`}>
          <i />
          {task.priority.toLowerCase()}
        </span>
        <Button
          variant="ghost"
          size="icon"
          aria-label={`Edit ${task.title}`}
          onClick={() => onEdit(task)}
        >
          <Pencil size={14} />
        </Button>
      </div>
      {error && <ErrorState error={error} />}
    </div>
  );
}
export function TaskList({ tasks }) {
  const [editing, setEditing] = useState(null);
  return (
    <>
      <div className="task-list">
        {tasks.length ? (
          tasks.map((task) => <TaskCard key={task.id} task={task} onEdit={setEditing} />)
        ) : (
          <EmptyState />
        )}
      </div>
      {editing && (
        <TaskEditor
          task={editing}
          open={!!editing}
          onOpenChange={(open) => !open && setEditing(null)}
        />
      )}
    </>
  );
}
