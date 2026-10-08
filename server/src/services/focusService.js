import { prisma } from '../lib/prisma.js';
import { getProductivityDay } from '../utils/productivityDay.js';
import { AppError } from '../utils/errors.js';
import { rewardedAction } from './rewardService.js';
import { activeFocusMilliseconds } from './focusRunService.js';

export async function saveFocus(user, data) {
  return rewardedAction(user.id, async (transaction) => {
    const existing = await transaction.focusSession.findUnique({ where: { id: data.id } });
    if (existing) {
      if (existing.userId !== user.id) {
        throw new AppError(409, 'This session identifier is already in use');
      }
      return { result: existing };
    }
    const run = await transaction.focusRun.findUnique({ where: { id: data.id } });
    if (run && run.userId !== user.id) {
      throw new AppError(409, 'This timer identifier is already in use');
    }
    const now = new Date();
    const verified =
      run?.state === 'RUNNING' &&
      activeFocusMilliseconds(run, now) >= run.targetSeconds * 1000 - 1000;
    const verifiedSeconds = verified ? run.targetSeconds : 0;
    const startedAt = verified ? run.startedAt : new Date(data.startedAt);
    const endedAt = verified ? now : new Date(data.endedAt);
    const session = await transaction.focusSession.create({
      data: {
        id: data.id,
        userId: user.id,
        startedAt,
        endedAt,
        durationSeconds: verified ? verifiedSeconds : data.durationSeconds,
        verifiedSeconds,
        productivityDate: getProductivityDay(user.settings, startedAt),
      },
    });
    if (run && ['RUNNING', 'PAUSED'].includes(run.state)) {
      await transaction.focusRun.update({
        where: { id: run.id },
        data: { state: 'COMPLETE', resumedAt: null },
      });
    }
    return {
      result: session,
      event: verifiedSeconds
        ? {
            source: 'FOCUS_SESSION',
            sourceId: session.id,
            verifiedSeconds,
            description: `Completed ${Math.floor(verifiedSeconds / 60)} minutes of verified focus`,
            productivityDate: getProductivityDay(user.settings),
          }
        : null,
    };
  });
}

export function listFocus(user) {
  return prisma.focusSession.findMany({
    where: { userId: user.id },
    orderBy: { startedAt: 'desc' },
    take: 50,
  });
}
