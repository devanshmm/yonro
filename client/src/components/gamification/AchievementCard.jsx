import {
  CalendarCheck,
  CheckCheck,
  CircleCheck,
  Flag,
  TrendingUp,
  Timer,
  LockKeyhole,
  Check,
} from 'lucide-react';
const icons = {
  crown: CalendarCheck,
  sword: CheckCheck,
  gem: CircleCheck,
  flag: Flag,
  flame: TrendingUp,
  shield: CircleCheck,
  focus: Timer,
};

export function AchievementCard({ achievement }) {
  const Icon = icons[achievement.icon] ?? CircleCheck;
  return (
    <article className={`achievement-card ${achievement.unlocked ? 'unlocked' : 'locked'}`}>
      <div className={`achievement-emblem emblem-${achievement.icon}`}>
        <Icon
          size={30}
          strokeWidth={1.8}
        />
      </div>
      <div className="achievement-copy">
        <div className="achievement-state">
          {achievement.unlocked ? <Check size={12} /> : <LockKeyhole size={12} />}
          {achievement.unlocked ? 'UNLOCKED' : 'LOCKED'}
        </div>
        <h3>{achievement.name}</h3>
        <p>{achievement.description}</p>
        <div className="achievement-footer">
          <span>{achievement.xpReward ? `+${achievement.xpReward} XP` : 'Streak reward'}</span>
          {achievement.unlockedAt && (
            <time dateTime={achievement.unlockedAt}>
              {new Date(achievement.unlockedAt).toLocaleDateString(undefined, {
                month: 'short',
                day: 'numeric',
              })}
            </time>
          )}
        </div>
      </div>
    </article>
  );
}

export function AchievementGrid({ achievements }) {
  return (
    <div className="achievement-grid">
      {achievements.map((achievement) => (
        <AchievementCard
          key={achievement.id}
          achievement={achievement}
        />
      ))}
    </div>
  );
}
