import { prisma } from '../lib/prisma.js';
import { lockRewardUser, updateStreakProfile } from './rewardService.js';
export function updateSettings(userId, data) {
  return prisma.$transaction(async (transaction) => {
    await lockRewardUser(transaction, userId);
    const settings = await transaction.userSettings.update({ where: { userId }, data });
    await updateStreakProfile(transaction, { id: userId, settings });
    return settings;
  });
}
