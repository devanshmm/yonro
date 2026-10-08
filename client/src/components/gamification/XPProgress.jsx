import { ProgressBar } from '@/components/common';

export function XPProgress({ data }) {
  return (
    <div className="xp-progress">
      <div className="xp-heading">
        <span>{data.levelName}</span>
        <strong> {data.totalXP.toLocaleString()} XP</strong>
      </div>
      <ProgressBar
        value={data.progressPercentage}
        label="Level progress"
      />
      <div className="xp-caption">
        <span>
          {data.xpIntoLevel.toLocaleString()} / {data.xpRequiredInLevel.toLocaleString()} level XP
        </span>
        <span>
          {data.xpToNextLevel.toLocaleString()} XP to level {data.level + 1}
        </span>
      </div>
    </div>
  );
}
