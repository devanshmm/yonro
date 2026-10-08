import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Trophy, Medal, ShieldCheck, ArrowUpRight } from 'lucide-react';
import { useResource } from '@/hooks/useResource';
import { fetchLeaderboard } from '@/services/gamificationApi';
import { ResourceStatus } from '@/components/ResourceStatus';
import { EmptyState } from '@/components/common';
import { LevelBadge } from './LevelBadge';

const metrics = [
  ['weekly', 'Weekly XP'],
  ['monthly', 'Monthly XP'],
  ['all-time', 'All-time XP'],
  ['tasks', 'Task completion'],
  ['focus', 'Focus time'],
  ['streaks', 'Current streak'],
];

function scoreLabel(row, metric) {
  if (metric === 'tasks') return `${row.score}%`;
  if (metric === 'focus') return `${(row.score / 3600).toFixed(1)} h`;
  if (metric === 'streaks') return `${row.score} days`;
  return `${row.score.toLocaleString()} XP`;
}

export function LeaderboardRow({ row, metric }) {
  return (
    <tr className={row.isMe ? 'leaderboard-self' : ''}>
      <td>
        <span className={`rank-medal rank-${row.rank}`}>
          {row.rank <= 3 ? <Medal size={18} /> : '#'}
          {row.rank}
        </span>
      </td>
      <td>
        <div className="leaderboard-user">
          <span className="rank-avatar">{row.username[0].toUpperCase()}</span>
          <div>
            <strong>
              @{row.username} {row.isMe && <small>You</small>}
            </strong>
            <span>
              Level {row.level} · {row.levelName}
            </span>
          </div>
        </div>
      </td>
      <td className="leaderboard-score">{scoreLabel(row, metric)}</td>
      <td>
        {row.completedTasks === null ? 'Private' : `${row.completedTasks} / ${row.plannedTasks}`}
      </td>
      <td>{row.focusSeconds === null ? 'Private' : `${(row.focusSeconds / 3600).toFixed(1)} h`}</td>
      <td>{row.currentStreak === null ? 'Private' : `${row.currentStreak} days`}</td>
      <td>{row.achievements}</td>
    </tr>
  );
}

export function RankCard({ data }) {
  return (
    <div className="rank-card">
      <Trophy size={26} />
      <div>
        <span>YOUR STANDING</span>
        <strong>
          {data.myRank
            ? `#${data.myRank.rank} · ${scoreLabel(data.myRank, data.metric)}`
            : 'Your progress comes first'}
        </strong>
        <p>
          {data.myRank
            ? 'A little healthy competition. Your own pace.'
            : 'Keep locking in. Your ranking will appear here.'}
        </p>
      </div>
      {data.myRank && (
        <LevelBadge
          compact
          level={data.myRank.level}
          name={data.myRank.levelName}
        />
      )}
    </div>
  );
}

export function Leaderboard() {
  const [metric, setMetric] = useState('weekly');
  const [period, setPeriod] = useState('weekly');
  const loader = useCallback(() => fetchLeaderboard(metric, period), [metric, period]);
  const resource = useResource(`leaderboard:${metric}:${period}`, loader);
  const data = resource.data;
  const supportsPeriod = ['tasks', 'focus'].includes(metric);
  return (
    <div className="leaderboard-view">
      <div className="ranking-toolbar">
        <div className="tabs ranking-tabs">
          {metrics.map(([key, label]) => (
            <button
              key={key}
              aria-pressed={metric === key}
              className={metric === key ? 'selected' : ''}
              onClick={() => setMetric(key)}
            >
              {label}
            </button>
          ))}
        </div>
        {supportsPeriod && (
          <label>
            Ranking period
            <select
              aria-label="Ranking period"
              value={period}
              onChange={(event) => setPeriod(event.target.value)}
            >
              <option value="weekly">Weekly</option>
              <option value="monthly">Monthly</option>
              <option value="all-time">All-time</option>
            </select>
          </label>
        )}
      </div>
      <ResourceStatus
        resource={resource}
        message="Loading rankings…"
      />
      {data && !resource.error && (
        <>
          <RankCard data={data} />
          <div className="leaderboard-privacy">
            <ShieldCheck size={18} />
            <p>
              Public rankings are opt-in. Your profile and sharing settings decide what appears.
            </p>
            <Link to="/settings">
              Manage privacy <ArrowUpRight size={14} />
            </Link>
          </div>
          <section className="panel leaderboard-panel">
            <div className="panel-heading">
              <h2>
                <Trophy size={20} /> {metrics.find(([key]) => key === metric)?.[1]}
              </h2>
              <span className="form-help">
                {data.period.startDate
                  ? `${data.period.startDate} – ${data.period.endDate}`
                  : 'All recorded activity'}{' '}
                · {data.period.timezone}, {data.period.dayStartTime} start
              </span>
            </div>
            {metric === 'tasks' && (
              <p className="ranking-explanation">
                Minimum {data.minimumPlannedTasks} planned tasks. {data.taskBasis}
              </p>
            )}
            {metric === 'focus' && (
              <p className="ranking-explanation">
                Only completed server-timed sessions count. Pauses and imported/self-reported time
                are excluded.
              </p>
            )}
            {data.rows.length ? (
              <div className="table-scroll">
                <table className="leaderboard-table">
                  <thead>
                    <tr>
                      <th>Rank</th>
                      <th>Builder</th>
                      <th>Score</th>
                      <th>Tasks</th>
                      <th>Focus</th>
                      <th>Streak</th>
                      <th>Badges</th>
                    </tr>
                  </thead>
                  <tbody>
                    {data.rows.map((row) => (
                      <LeaderboardRow
                        key={row.userId}
                        row={row}
                        metric={data.metric}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <EmptyState
                title="Keep locking in. Your ranking will appear here."
                description="Eligible public participants with real activity will appear. There are no sample rankings."
              />
            )}
          </section>
        </>
      )}
    </div>
  );
}
