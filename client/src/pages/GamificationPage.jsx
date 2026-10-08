import { GamificationOverview } from '@/components/gamification/GamificationOverview';
import { useState } from 'react';
import { Trophy } from 'lucide-react';
import { useResource } from '@/hooks/useResource';
import { fetchGamification } from '@/services/gamificationApi';
import { ResourceStatus } from '@/components/ResourceStatus';
import { AchievementGrid } from '@/components/gamification/AchievementCard';
import { XPHistory } from '@/components/gamification/XPHistory';
import { Leaderboard } from '@/components/gamification/Leaderboard';

export default function GamificationPage({ rankings = false }) {
  const [tab, setTab] = useState(rankings ? 'Leaderboards' : 'Overview');
  const resource = useResource('gamification', fetchGamification);
  const data = resource.data;
  const earned = data?.achievements.filter((achievement) => achievement.unlocked) ?? [];
  return (
    <>
      <div className="page-heading">
        <div>
          <div className="eyebrow">A PERSONAL RECORD OF PROGRESS</div>
          <h1>
            Your progress, in perspective<span className="text-primary">.</span>
          </h1>
          <p>A little more focused. A little more consistent. All at your pace.</p>
        </div>
        <div className="reward-label">
          <Trophy size={18} /> {earned.length} badges earned
        </div>
      </div>
      <div
        className="tabs game-tabs"
        aria-label="Rewards sections"
      >
        {['Overview', 'Achievements', 'XP History', 'Leaderboards'].map((label) => (
          <button
            key={label}
            aria-pressed={tab === label}
            className={tab === label ? 'selected' : ''}
            onClick={() => setTab(label)}
          >
            {label}
          </button>
        ))}
      </div>
      <ResourceStatus
        resource={resource}
        message="Loading your rewards…"
      />
      {data && !resource.error && (
        <>
          {tab === 'Overview' && (
            <GamificationOverview
              data={data}
              showAchievements={() => setTab('Achievements')}
            />
          )}

          {tab === 'Achievements' && (
            <>
              <div className="achievement-section-heading">
                <h2>Your milestones</h2>
                <p>
                  {earned.length} / {data.achievements.length} unlocked. Permanent milestones,
                  earned at your pace.
                </p>
              </div>
              <AchievementGrid achievements={data.achievements} />
            </>
          )}
          {tab === 'XP History' && <XPHistory />}
          {tab === 'Leaderboards' && <Leaderboard />}
        </>
      )}
    </>
  );
}
