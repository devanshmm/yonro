import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';
import { useResource } from '@/hooks/useResource';
import { fetchGamification } from '@/services/gamificationApi';
import { ResourceStatus } from '@/components/ResourceStatus';
import { LevelBadge } from './LevelBadge';
import { XPProgress } from './XPProgress';

export function GamificationSummary() {
  const resource = useResource('gamification', fetchGamification);
  const data = resource.data;
  return (
    <section className="game-summary">
      <ResourceStatus
        resource={resource}
        message="Loading your progress…"
      />
      {data && !resource.error && (
        <>
          <LevelBadge
            level={data.level}
            name={data.levelName}
          />
          <div className="game-summary-main">
            <div className="game-summary-title">
              <span>YOUR PROGRESS</span>
              <Link to="/gamification">
                View progress <ArrowUpRight size={14} />
              </Link>
            </div>
            <XPProgress data={data} />
            <p className="summary-unlocks">
              {data.achievements.filter((achievement) => achievement.unlocked).length} achievements
              earned · Small steps, stronger foundations.
            </p>
          </div>
        </>
      )}
    </section>
  );
}
