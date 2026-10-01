import { prisma } from '../lib/prisma.js';
export function updateSettings(userId, data) {
  return prisma.userSettings.update({ where: { userId }, data });
}
