import { Check, Pencil, Trash2, ArrowUp, ArrowDown } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function GoalMilestoneItem({
  milestone,
  index,
  total,
  busy,
  onToggle,
  onEdit,
  onDelete,
  onMove,
}) {
  return (
    <li className={`milestone-item ${milestone.completed ? 'milestone-complete' : ''}`}>
      <button
        type="button"
        className={`task-check ${milestone.completed ? 'checked' : ''}`}
        disabled={busy}
        onClick={() => onToggle(milestone)}
        aria-label={`${milestone.completed ? 'Uncomplete' : 'Complete'} ${milestone.title}`}
      >
        {milestone.completed && <Check size={13} />}
      </button>
      <div className="milestone-content">
        <strong>{milestone.title}</strong>
        {milestone.description && <p>{milestone.description}</p>}
      </div>
      <div className="milestone-actions">
        <Button
          size="icon"
          variant="ghost"
          aria-label={`Move ${milestone.title} up`}
          disabled={busy || index === 0}
          onClick={() => onMove(milestone, -1)}
        >
          <ArrowUp size={14} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label={`Move ${milestone.title} down`}
          disabled={busy || index === total - 1}
          onClick={() => onMove(milestone, 1)}
        >
          <ArrowDown size={14} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label={`Edit ${milestone.title}`}
          disabled={busy}
          onClick={() => onEdit(milestone)}
        >
          <Pencil size={14} />
        </Button>
        <Button
          size="icon"
          variant="ghost"
          aria-label={`Delete ${milestone.title}`}
          disabled={busy}
          onClick={() => onDelete(milestone)}
        >
          <Trash2 size={14} />
        </Button>
      </div>
    </li>
  );
}
