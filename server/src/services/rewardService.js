import { prisma } from '../lib/prisma.js';
import { ACHIEVEMENTS, STREAK_REWARDS, XP_RULES } from '../config/gamification.js';
import {
  getProductivityDay,
  getProductivityDayRange,
  addDays,
  calculateCurrentStreak,
} from '../utils/productivityDay.js';
import { getMeaningfulHistory } from './activityService.js';
import { calculateFocusXP } from '../utils/xp.js';

export async function lockRewardUser(transaction, userId) {
  await transaction.$queryRaw`SELECT "id" FROM "User" WHERE "id" = ${userId}::uuid FOR UPDATE`;
}

export async function updateStreakProfile(transaction, user) {
  const today = getProductivityDay(user.settings);
  const history = await getMeaningfulHistory(user.id, today, transaction);
  const latest = [...history.successfulDates].sort().at(-1);
  const streakValidUntil = latest
    ? getProductivityDayRange(user.settings, addDays(latest, 2)).start
    : null;
  return transaction.gamificationProfile.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      currentStreak: history.currentStreak,
      longestStreak: history.longestStreak,
      streakValidUntil,
    },
    update: {
      currentStreak: history.currentStreak,
      longestStreak: history.longestStreak,
      streakValidUntil,
    },
  });
}

export async function getRewardStreak(transaction, userId, today, currentStreak) {
  const earnedDays = await transaction.xPTransaction.groupBy({
    by: ['rewardDate'],
    where: {
      userId,
      source: { in: ['TASK_COMPLETION', 'HABIT_COMPLETION', 'FOCUS_SESSION'] },
      amount: { gt: 0 },
      rewardDate: { gte: addDays(today, -100), lte: today },
    },
  });
  return Math.min(
    currentStreak,
    calculateCurrentStreak(
      earnedDays.map((day) => day.rewardDate),
      today,
    ),
  );
}

async function awardXP(transaction, user, event, requestedAmount, rewardDate) {
  const sourceKey = { userId: user.id, source: event.source, sourceId: event.sourceId };
  const existing = await transaction.xPTransaction.findUnique({
    where: { userId_source_sourceId: sourceKey },
  });
  if (existing) {
    return false;
  }
  const dailyCap = XP_RULES[event.source]?.dailyCap;
  let amount = requestedAmount;
  if (dailyCap !== undefined) {
    const alreadyEarned = await transaction.xPTransaction.aggregate({
      where: { userId: user.id, rewardDate, source: event.source },
      _sum: { amount: true },
    });
    amount = Math.min(amount, Math.max(0, dailyCap - (alreadyEarned._sum.amount ?? 0)));
  }
  // Zero-amount receipts also reserve this source identity. Deleting/recreating an
  // entry or revisiting a capped action tomorrow must not reopen its XP allowance.
  await transaction.xPTransaction.create({
    data: {
      ...sourceKey,
      amount,
      description: event.description,
      productivityDate: event.productivityDate,
      rewardDate,
    },
  });
  return true;
}

async function achievementMetrics(transaction, userId, event, streak) {
  const metrics = { streak };
  if (
    event.source === 'TASK_COMPLETION' ||
    event.source === 'HABIT_COMPLETION' ||
    event.source === 'GOAL_MILESTONE'
  ) {
    const count = await transaction.xPTransaction.count({
      where: { userId, source: event.source, amount: { gt: 0 } },
    });
    const metric = {
      TASK_COMPLETION: 'tasks',
      HABIT_COMPLETION: 'habits',
      GOAL_MILESTONE: 'milestones',
    }[event.source];
    metrics[metric] = count;
  }
  if (event.source === 'FOCUS_SESSION') {
    const focus = await transaction.focusSession.aggregate({
      where: { userId },
      _sum: { verifiedSeconds: true },
    });
    metrics.focusSeconds = focus._sum.verifiedSeconds ?? 0;
  }
  if (event.source === 'GOAL_MILESTONE') {
    const finished = await transaction.goal.count({
      where: { userId, milestones: { some: {}, every: { completed: true } } },
    });
    metrics.goals = finished;
  }
  return metrics;
}

export async function checkAndUnlockAchievements(transaction, user, metrics, rewardDate) {
  const relevant = ACHIEVEMENTS.filter(
    (achievement) => metrics[achievement.metric] >= achievement.target,
  );
  if (!relevant.length) {
    return;
  }
  const catalog = await transaction.achievement.findMany({
    where: { key: { in: relevant.map((achievement) => achievement.key) } },
  });
  for (const achievement of catalog) {
    const existing = await transaction.userAchievement.findUnique({
      where: { userId_achievementId: { userId: user.id, achievementId: achievement.id } },
    });
    if (existing) {
      continue;
    }
    await transaction.userAchievement.create({
      data: { userId: user.id, achievementId: achievement.id },
    });
    await awardXP(
      transaction,
      user,
      {
        source: 'ACHIEVEMENT',
        sourceId: achievement.key,
        description: `Achievement: ${achievement.name}`,
        productivityDate: rewardDate,
      },
      achievement.xpReward,
      rewardDate,
    );
  }
}

export async function applyProductivityReward(transaction, userId, event) {
  const user = await transaction.user.findUniqueOrThrow({
    where: { id: userId },
    include: { settings: true },
  });
  const profile = await updateStreakProfile(transaction, user);
  if (!event?.source) {
    return;
  }
  const rewardDate = getProductivityDay(user.settings);
  // Backfilled habit activity can repair history but cannot farm retroactive XP.
  if (event.productivityDate !== rewardDate) {
    return;
  }
  const amount =
    event.source === 'FOCUS_SESSION'
      ? calculateFocusXP(event.verifiedSeconds)
      : XP_RULES[event.source].amount;
  if (amount === 0) {
    return;
  }
  const firstAward = await awardXP(transaction, user, event, amount, rewardDate);
  if (!firstAward) {
    return;
  }
  // Backfilled entries remain valid history, but a streak reward needs recorded
  // earning activity on each day. Retrospective edits cannot manufacture bonuses.
  const rewardStreak = await getRewardStreak(
    transaction,
    userId,
    rewardDate,
    profile.currentStreak,
  );
  for (const milestone of STREAK_REWARDS.filter((reward) => rewardStreak >= reward.days)) {
    await awardXP(
      transaction,
      user,
      {
        source: 'STREAK_MILESTONE',
        sourceId: String(milestone.days),
        description: `${milestone.days}-day consistency milestone`,
        productivityDate: rewardDate,
      },
      milestone.xp,
      rewardDate,
    );
  }
  const metrics = await achievementMetrics(transaction, userId, event, rewardStreak);
  await checkAndUnlockAchievements(transaction, user, metrics, rewardDate);
}

export async function rewardedAction(userId, action) {
  return prisma.$transaction(
    async (transaction) => {
      // Every productive mutation takes the same user lock before any parent lock:
      // caps, rewards and the original action commit together without lock inversion.
      await lockRewardUser(transaction, userId);
      const { result, event } = await action(transaction);
      await applyProductivityReward(transaction, userId, event);
      return result;
    },
    { timeout: 15000 },
  );
}
