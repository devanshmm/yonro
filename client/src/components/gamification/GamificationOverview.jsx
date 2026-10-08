import { CheckCheck, Timer, Flag, CircleCheck } from 'lucide-react';
import { StatCard } from '@/components/common';
import { LevelBadge } from './LevelBadge';
import { XPProgress } from './XPProgress';
import { StreakBadge } from './StreakBadge';
import { AchievementGrid } from './AchievementCard';

export function GamificationOverview({ data, showAchievements }) {
  const earned = data.achievements.filter((achievement) => achievement.unlocked);
  return (
    <>
      <section className="game-hero">
        <div className="game-hero-content">
          <span className="season-label">
            <span className="status-dot" /> A LITTLE BETTER, EVERY DAY
          </span>
          <div className="hero-level">
            <LevelBadge
              level={data.level}
              name={data.levelName}
            />
            <div>
              <span>LEVEL {data.level}</span>
              <h2>{data.levelName}</h2>
              <p>A stronger foundation with every focused day.</p>
            </div>
          </div>
          <XPProgress data={data} />
        </div>
        <div className="game-hero-aside">
          <span>THE LONG VIEW</span>
          <h2>
            Small steps.
            <br />
            Real progress.
          </h2>
          <p>
            Make time for what matters.
            <br />
            The numbers will follow.
          </p>
          <div className="aside-index">01 / YOUR JOURNEY</div>
        </div>
      </section>
      <div className="stat-grid four game-stat-grid">
        <StatCard
          label="Tasks completed"
          value={data.stats.tasksCompleted}
          detail="Distinct XP-earning tasks"
          icon={CheckCheck}
        />
        <StatCard
          label="Focus hours"
          value={(data.stats.focusSeconds / 3600).toFixed(1)}
          detail="Server-timed active focus"
          icon={Timer}
        />
        <StatCard
          label="Habit completions"
          value={data.stats.habitsCompleted}
          detail="XP-earning target days"
          icon={CircleCheck}
        />
        <StatCard
          label="Milestones reached"
          value={data.stats.goalMilestones}
          detail="One step closer"
          icon={Flag}
        />
      </div>
      <StreakBadge data={data} />
      <section className="reward-showcase">
        <div className="panel-heading">
          <div>
            <div className="eyebrow">MILESTONES</div>
            <h2>{earned.length ? 'Proof of your progress' : 'Room to grow'}</h2>
          </div>
          <button
            className="section-link"
            onClick={showAchievements}
          >
            All achievements <span aria-hidden="true">↗</span>
          </button>
        </div>
        {!earned.length && (
          <p className="form-help">
            You haven't unlocked any achievements yet. Start with one small, meaningful action.
          </p>
        )}
        <AchievementGrid
          achievements={earned.length ? earned.slice(-3) : data.achievements.slice(0, 3)}
        />
      </section>
      <div className="reward-rules">
        <CircleCheck size={20} />
        <div>
          <strong>Progress, at your pace.</strong>
          <p>
            Tasks and habits: 10 XP each, up to 50 XP per day per type. Milestones: 25 XP, up to 50
            daily. Verified focus: 2 XP per 5 minutes, up to 80 daily. Streak and achievement
            rewards are earned once.
          </p>
        </div>
      </div>
    </>
  );
}
