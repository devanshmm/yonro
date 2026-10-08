export function LevelBadge({ level, name, compact = false }) {
  return (
    <div
      className={`level-badge ${compact ? 'level-badge-small' : ''}`}
      aria-label={`Level ${level}, ${name}`}
    >
      <span className="level-label">LVL</span>
      <strong>{String(level).padStart(2, '0')}</strong>
    </div>
  );
}
