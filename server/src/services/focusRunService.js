import { prisma } from '../lib/prisma.js';
import { lockRewardUser } from './rewardService.js';
import { AppError } from '../utils/errors.js';

export function activeFocusMilliseconds(run, now = new Date()) {
  return (
    run.activeMilliseconds +
    (run.state === 'RUNNING' && run.resumedAt
      ? Math.max(0, now.getTime() - run.resumedAt.getTime())
      : 0)
  );
}

export async function startFocusRun(userId, data) {
  return prisma.$transaction(async (transaction) => {
    await lockRewardUser(transaction, userId);
    const existing = await transaction.focusRun.findUnique({ where: { id: data.id } });
    if (existing) {
      if (existing.userId !== userId) {
        throw new AppError(409, 'This timer identifier is already in use');
      }
      if (existing.targetSeconds !== data.targetSeconds || existing.state !== 'RUNNING') {
        throw new AppError(409, 'This timer has already been started. Resume or reset it.');
      }
      return existing;
    }
    const now = new Date();
    // Stale abandoned runs expire without earning focus or XP.
    await transaction.focusRun.updateMany({
      where: {
        userId,
        state: { in: ['RUNNING', 'PAUSED'] },
        startedAt: { lt: new Date(now.getTime() - 7 * 86400000) },
      },
      data: { state: 'CANCELLED', resumedAt: null },
    });
    const active = await transaction.focusRun.findFirst({
      where: { userId, state: { in: ['RUNNING', 'PAUSED'] } },
    });
    if (active) {
      throw new AppError(409, 'Another focus timer is active. Reset it before starting a new one.');
    }
    return transaction.focusRun.create({
      data: { ...data, userId, startedAt: now, resumedAt: now },
    });
  });
}

export async function changeFocusRun(userId, id, action) {
  return prisma.$transaction(async (transaction) => {
    await lockRewardUser(transaction, userId);
    const run = await transaction.focusRun.findUniqueOrThrow({ where: { id, userId } });
    const now = new Date();
    if (action === 'cancel') {
      if (run.state === 'COMPLETE' || run.state === 'CANCELLED') {
        return run;
      }
      return transaction.focusRun.update({
        where: { id },
        data: { state: 'CANCELLED', resumedAt: null },
      });
    }
    const expected = action === 'pause' ? 'RUNNING' : 'PAUSED';
    const next = action === 'pause' ? 'PAUSED' : 'RUNNING';
    if (run.state === next) {
      return run;
    }
    if (run.state !== expected) {
      throw new AppError(409, 'This focus timer is no longer active');
    }
    return transaction.focusRun.update({
      where: { id },
      data: {
        state: next,
        activeMilliseconds: Math.min(21600000, activeFocusMilliseconds(run, now)),
        resumedAt: next === 'RUNNING' ? now : null,
      },
    });
  });
}

export async function cancelActiveFocusRuns(userId) {
  return prisma.$transaction(async (transaction) => {
    await lockRewardUser(transaction, userId);
    await transaction.focusRun.updateMany({
      where: { userId, state: { in: ['RUNNING', 'PAUSED'] } },
      data: { state: 'CANCELLED', resumedAt: null },
    });
  });
}
