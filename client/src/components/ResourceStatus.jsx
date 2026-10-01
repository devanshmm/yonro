import { Check } from 'lucide-react';
import { ErrorState, LoadingState } from './common';

export function ResourceStatus({ resource, message }) {
  if (resource.error) {
    return (
      <ErrorState
        error={resource.error}
        retry={resource.retry}
      />
    );
  }
  if (resource.loading && !resource.data) {
    return <LoadingState message={message} />;
  }
  return null;
}

export function SuccessState({ message }) {
  if (!message) {
    return null;
  }
  return (
    <p
      className="success-state"
      role="status"
    >
      <Check size={15} />
      {message}
    </p>
  );
}

export function HistoryRange({ value, onChange }) {
  return (
    <div
      className="tabs"
      aria-label="History range"
    >
      {[
        { days: 7, label: '7 days' },
        { days: 30, label: '30 days' },
        { days: 90, label: '90 days' },
        { days: 365, label: '1 year' },
      ].map((range) => (
        <button
          key={range.days}
          type="button"
          className={value === range.days ? 'selected' : ''}
          aria-pressed={value === range.days}
          onClick={() => onChange(range.days)}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}
