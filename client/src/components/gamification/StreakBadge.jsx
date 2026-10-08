import { Flame, Trophy } from 'lucide-react';

export function StreakBadge({ data }) {
  return (
    <section className="panel streak-game-card">
      <div className="streak-emblem">
        <Flame
          size={38}
          fill="currentColor"
        />
      </div>
      <div>
        <div className="eyebrow">YOUR CONSISTENCY</div>
        <h2>
          {data.currentStreak} day{data.currentStreak === 1 ? '' : 's'} of momentum
        </h2>
        <p>
          <Trophy size={14} /> Personal best: {data.longestStreak} days
        </p>
      </div>
      <div className="streak-next">
        {data.nextStreakMilestone ? (
          <>
            <strong>
              Next: {data.nextStreakMilestone.days} days{' '}
              <span>+{data.nextStreakMilestone.xp} XP</span>
            </strong>
            <p>
              {data.nextStreakMilestone.remainingDays} XP-earning days to go. Rest when you need to.
            </p>
          </>
        ) : (
          <>
            <strong>Every milestone earned</strong>
            <p>Keep your rhythm. You have nothing to prove.</p>
          </>
        )}
      </div>
    </section>
  );
}
