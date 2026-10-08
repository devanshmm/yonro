import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import {
  getProductivityDay,
  getProductivityDayRange,
  weekDates,
  monthRange,
  addDays,
} from '../utils/productivityDay.js';
import { calculateXPProgress } from '../utils/xp.js';
import { MINIMUM_RANKED_TASKS } from '../config/gamification.js';

export function leaderboardPeriod(settings, period, timestamp = new Date()) {
  const today = getProductivityDay(settings, timestamp);
  if (period === 'all-time') {
    return {
      period,
      startDate: null,
      endDate: null,
      start: null,
      end: null,
      timezone: settings.timezone,
      dayStartTime: settings.dayStartTime,
    };
  }
  const dates = period === 'weekly' ? weekDates(today) : null;
  const range = dates ? { startDate: dates[0], endDate: dates[6] } : monthRange(today);
  return {
    period,
    ...range,
    start: getProductivityDayRange(settings, range.startDate).start,
    end: getProductivityDayRange(settings, addDays(range.endDate, 1)).start,
    timezone: settings.timezone,
    dayStartTime: settings.dayStartTime,
  };
}

function dateFilter(column, period) {
  return period.start
    ? Prisma.sql`AND ${column} >= ${period.start} AND ${column} < ${period.end}`
    : Prisma.empty;
}

export async function getLeaderboard(user, metric, { limit, period: requestedPeriod }) {
  const periodName = ['weekly', 'monthly', 'all-time'].includes(metric) ? metric : requestedPeriod;
  const metricName = ['weekly', 'monthly', 'all-time'].includes(metric) ? 'xp' : metric;
  const period = leaderboardPeriod(user.settings, periodName);
  const privacyFilter =
    metricName === 'focus'
      ? Prisma.sql`AND settings."showFocusTime" = true`
      : metricName === 'streaks'
        ? Prisma.sql`AND settings."showStreak" = true`
        : metricName === 'tasks'
          ? Prisma.sql`AND settings."showActivity" = true`
          : Prisma.empty;
  const score =
    metricName === 'tasks'
      ? Prisma.sql`CASE WHEN tasks.planned > 0 THEN tasks.completed::numeric / tasks.planned * 100 ELSE 0 END`
      : metricName === 'focus'
        ? Prisma.sql`COALESCE(focus.seconds, 0)`
        : metricName === 'streaks'
          ? Prisma.sql`CASE WHEN profile."streakValidUntil" > NOW() THEN COALESCE(profile."currentStreak", 0) ELSE 0 END`
          : Prisma.sql`COALESCE(xp.period_xp, 0)`;
  const threshold =
    metricName === 'tasks'
      ? Prisma.sql`tasks.planned >= ${MINIMUM_RANKED_TASKS}`
      : metricName === 'focus'
        ? Prisma.sql`COALESCE(focus.seconds, 0) > 0`
        : metricName === 'streaks'
          ? Prisma.sql`profile."streakValidUntil" > NOW() AND profile."currentStreak" > 0`
          : Prisma.sql`COALESCE(xp.period_xp, 0) > 0`;
  // One shared UTC interval is derived from the viewer's ProductivityDay settings.
  // Every candidate is compared inside that same interval, never a mix of local weeks.
  // Task ratios use the cohort of plans created in that interval; this keeps the
  // denominator and numerator from referring to different sets of planned tasks.
  const records = await prisma.$queryRaw`
    WITH eligible AS (
      SELECT users."id", users."username", settings."showActivity", settings."showFocusTime", settings."showStreak"
      FROM "User" users JOIN "UserSettings" settings ON settings."userId" = users."id"
      WHERE settings."showOnLeaderboards" = true AND settings."profileVisibility" = 'PUBLIC' ${privacyFilter}
    ), xp AS (
      SELECT ledger."userId", SUM(ledger.amount) AS total_xp,
        SUM(CASE WHEN ${period.start ? Prisma.sql`ledger."createdAt" >= ${period.start} AND ledger."createdAt" < ${period.end}` : Prisma.sql`true`} THEN ledger.amount ELSE 0 END) AS period_xp
      FROM "XPTransaction" ledger JOIN eligible ON eligible."id" = ledger."userId" GROUP BY ledger."userId"
    ), tasks AS (
      SELECT task."userId", COUNT(*) AS planned,
        COUNT(*) FILTER (WHERE task.status = 'COMPLETED') AS completed
      FROM "Task" task JOIN eligible ON eligible."id" = task."userId"
      WHERE true ${dateFilter(Prisma.sql`task."createdAt"`, period)} GROUP BY task."userId"
    ), focus AS (
      SELECT session."userId", SUM(session."verifiedSeconds") AS seconds, COUNT(*) AS sessions
      FROM "FocusSession" session JOIN eligible ON eligible."id" = session."userId"
      WHERE session."verifiedSeconds" > 0 ${dateFilter(Prisma.sql`session."startedAt"`, period)} GROUP BY session."userId"
    ), achievements AS (
      SELECT unlocked."userId", COUNT(*) AS count FROM "UserAchievement" unlocked
      JOIN eligible ON eligible."id" = unlocked."userId" GROUP BY unlocked."userId"
    ), scores AS (
      SELECT eligible.*, COALESCE(xp.total_xp, 0) AS total_xp, COALESCE(xp.period_xp, 0) AS period_xp,
        COALESCE(tasks.planned, 0) AS planned, COALESCE(tasks.completed, 0) AS completed,
        COALESCE(focus.seconds, 0) AS focus_seconds, COALESCE(focus.sessions, 0) AS focus_sessions,
        CASE WHEN profile."streakValidUntil" > NOW() THEN COALESCE(profile."currentStreak", 0) ELSE 0 END AS current_streak,
        COALESCE(profile."longestStreak", 0) AS longest_streak, COALESCE(achievements.count, 0) AS achievements,
        ${score} AS score
      FROM eligible LEFT JOIN xp ON xp."userId" = eligible."id"
      LEFT JOIN tasks ON tasks."userId" = eligible."id" LEFT JOIN focus ON focus."userId" = eligible."id"
      LEFT JOIN "GamificationProfile" profile ON profile."userId" = eligible."id"
      LEFT JOIN achievements ON achievements."userId" = eligible."id" WHERE ${threshold}
    ), ranked AS (
      SELECT scores.*, RANK() OVER (ORDER BY score DESC) AS rank,
        ROW_NUMBER() OVER (ORDER BY score DESC, username ASC) AS position FROM scores
    )
    SELECT * FROM ranked WHERE position <= ${limit} OR id = ${user.id}::uuid ORDER BY position
  `;
  const present = (record) => ({
    userId: record.id,
    username: record.username,
    rank: Number(record.rank),
    score: Number(Number(record.score).toFixed(2)),
    totalXP: Number(record.total_xp),
    xp: Number(record.period_xp),
    ...calculateXPProgress(Number(record.total_xp)),
    plannedTasks: record.showActivity ? Number(record.planned) : null,
    completedTasks: record.showActivity ? Number(record.completed) : null,
    completionPercentage:
      record.showActivity && Number(record.planned)
        ? Math.round((Number(record.completed) / Number(record.planned)) * 100)
        : null,
    focusSeconds: record.showFocusTime ? Number(record.focus_seconds) : null,
    focusSessions: record.showFocusTime ? Number(record.focus_sessions) : null,
    currentStreak: record.showStreak ? Number(record.current_streak) : null,
    longestStreak: record.showStreak ? Number(record.longest_streak) : null,
    achievements: Number(record.achievements),
    isMe: record.id === user.id,
  });
  return {
    metric: metricName,
    period,
    minimumPlannedTasks: MINIMUM_RANKED_TASKS,
    taskBasis:
      'Planned tasks created within the displayed window, using their current completion status.',
    rows: records.filter((record) => Number(record.position) <= limit).map(present),
    myRank: records.find((record) => record.id === user.id)
      ? present(records.find((record) => record.id === user.id))
      : null,
    participation: {
      optedIn: user.settings.showOnLeaderboards,
      publicProfile: user.settings.profileVisibility === 'PUBLIC',
    },
  };
}
