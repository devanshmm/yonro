import { prisma } from '../lib/prisma.js';
import { getProductivityDay } from '../utils/productivityDay.js';
import { AppError } from '../utils/errors.js';
export async function saveFocus(user, data) {
  const session = await prisma.focusSession.upsert({
    where: { id: data.id },
    create: {
      ...data,
      userId: user.id,
      startedAt: new Date(data.startedAt),
      endedAt: new Date(data.endedAt),
      productivityDate: getProductivityDay(user.settings, data.startedAt),
    },
    update: {},
  });
  if (session.userId !== user.id)
    throw new AppError(409, 'This session identifier is already in use');
  return session;
}
export function listFocus(user) {
  return prisma.focusSession.findMany({
    where: { userId: user.id },
    orderBy: { startedAt: 'desc' },
    take: 50,
  });
}
