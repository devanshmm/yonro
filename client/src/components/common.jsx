import { CircleDashed, AlertCircle, RotateCw } from 'lucide-react';
import { Button } from './ui/button';
import { errorMessage } from '@/lib/utils';
export function EmptyState({
  title = 'A little space for your next big thing.',
  description = 'Add your first task and give today a direction.',
  action,
}) {
  return (
    <div className="empty-state">
      <CircleDashed size={32} />
      <h3>{title}</h3>
      <p>{description}</p>
      {action}
    </div>
  );
}
export function ErrorState({ error, retry }) {
  return (
    <div
      role="alert"
      className="error-state"
    >
      <AlertCircle size={18} />
      <span>{typeof error === 'string' ? error : errorMessage(error)}</span>
      {retry && (
        <Button
          variant="ghost"
          size="sm"
          onClick={retry}
        >
          <RotateCw size={14} />
          Retry
        </Button>
      )}
    </div>
  );
}
export function LoadingState({ message = 'Getting your workspace ready…' }) {
  return (
    <div
      className="loading-state"
      role="status"
    >
      <span className="spinner" />
      {message}
    </div>
  );
}
export function StatCard({ label, value, detail, icon: Icon, accent }) {
  return (
    <div className={`stat-card ${accent ? 'stat-accent' : ''}`}>
      <div className="stat-label">
        {label}
        <Icon size={17} />
      </div>
      <div className="stat-value">{value}</div>
      <div className="stat-detail">{detail}</div>
    </div>
  );
}
export function ProgressBar({ value, label = 'Task completion' }) {
  return (
    <div
      className="progress-track"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
    >
      <div style={{ width: `${value}%` }} />
    </div>
  );
}
