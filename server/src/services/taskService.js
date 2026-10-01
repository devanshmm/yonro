import { prisma } from '../lib/prisma.js';
import { getProductivityDay } from '../utils/productivityDay.js';
export function listTasks(user, date) {
  return prisma.task.findMany({
    where: { userId: user.id, productivityDate: date ?? getProductivityDay(user.settings) },
    orderBy: [{ createdAt: 'asc' }],
  });
}
export function createTask(user, data) {
  return prisma.task.create({
    data: {
      ...data,
      userId: user.id,
      productivityDate: data.productivityDate ?? getProductivityDay(user.settings),
      completedAt: data.status === 'COMPLETED' ? new Date() : null,
    },
  });
}
export function updateTask(userId, id, data) {
  return prisma.task.update({
    where: { id, userId },
    data: {
      ...data,
      ...(data.status !== undefined && {
        completedAt: data.status === 'COMPLETED' ? new Date() : null,
      }),
    },
  });
}
export async function deleteTask(userId, id) {
  await prisma.task.delete({ where: { id, userId } });
}
