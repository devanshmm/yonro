import { prisma } from '../lib/prisma.js';
import { calculateXPProgress } from '../utils/xp.js';
import { STREAK_REWARDS } from '../config/gamification.js';
import { lockRewardUser, updateStreakProfile, getRewardStreak } from './rewardService.js';
import { getProductivityDay } from '../utils/productivityDay.js';

export async function getAchievements(userId) {
  const [catalog, unlocked] = await Promise.all([
    prisma.achievement.findMany({ orderBy: { id: 'asc' } }),
    prisma.userAchievement.findMany({
      where: { userId },
      select: { achievementId: true, unlockedAt: true },
    }),
  ]);
  const unlocks = new Map(unlocked.map((entry) => [entry.achievementId, entry.unlockedAt]));
  return catalog.map((achievement) => ({
    ...achievement,
    unlocked: unlocks.has(achievement.id),
    unlockedAt: unlocks.get(achievement.id) ?? null,
  }));
}

export async function getGamification(user) {
  const today = getProductivityDay(user.settings);
  const [xp, profile, achievements, focus, sources, streakAwards] = await Promise.all([
    prisma.xPTransaction.aggregate({ where: { userId: user.id }, _sum: { amount: true } }),
    prisma.$transaction(async (transaction) => {
      await lockRewardUser(transaction, user.id);
      return updateStreakProfile(transaction, user);
    }),
    getAchievements(user.id),
    prisma.focusSession.aggregate({ where: { userId: user.id }, _sum: { verifiedSeconds: true } }),
    prisma.xPTransaction.groupBy({
      by: ['source'],
      where: { userId: user.id, amount: { gt: 0 } },
      _count: { _all: true },
    }),
    prisma.xPTransaction.findMany({
      where: { userId: user.id, source: 'STREAK_MILESTONE' },
      select: { sourceId: true },
    }),
  ]);
  const counts = new Map(sources.map((source) => [source.source, source._count._all]));
  const earnedMilestones = new Set(streakAwards.map((award) => Number(award.sourceId)));
  const nextMilestone = STREAK_REWARDS.find((reward) => !earnedMilestones.has(reward.days));
  const rewardStreak = await getRewardStreak(prisma, user.id, today, profile.currentStreak);
  return {
    ...calculateXPProgress(xp._sum.amount ?? 0),
    currentStreak: profile.currentStreak,
    longestStreak: profile.longestStreak,
    rewardStreak,
    nextStreakMilestone: nextMilestone
      ? { ...nextMilestone, remainingDays: Math.max(0, nextMilestone.days - rewardStreak) }
      : null,
    achievements,
    stats: {
      tasksCompleted: counts.get('TASK_COMPLETION') ?? 0,
      habitsCompleted: counts.get('HABIT_COMPLETION') ?? 0,
      goalMilestones: counts.get('GOAL_MILESTONE') ?? 0,
      focusSeconds: focus._sum.verifiedSeconds ?? 0,
    },
  };
}

export async function getXPHistory(userId, { limit, cursor }) {
  const entries = await prisma.xPTransaction.findMany({
    where: { userId, amount: { gt: 0 } },
    orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
    take: limit + 1,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
  });
  // Scope the cursor as well as the query so another user's receipt cannot reveal ordering.
  if (cursor) {
    await prisma.xPTransaction.findUniqueOrThrow({
      where: { id: cursor, userId },
      select: { id: true },
    });
  }
  const more = entries.length > limit;
  const transactions = entries.slice(0, limit);
  return { transactions, nextCursor: more ? transactions.at(-1).id : null };
}
