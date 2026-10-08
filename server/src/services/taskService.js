import { prisma } from '../lib/prisma.js';
import { getProductivityDay } from '../utils/productivityDay.js';
import { rewardedAction } from './rewardService.js';

export function listTasks(user, date) {
  return prisma.task.findMany({
    where: { userId: user.id, productivityDate: date ?? getProductivityDay(user.settings) },
    orderBy: [{ createdAt: 'asc' }],
  });
}

function taskEvent(task) {
  return task.status === 'COMPLETED'
    ? {
        source: 'TASK_COMPLETION',
        sourceId: task.id,
        description: 'Completed planned task',
        productivityDate: task.productivityDate,
      }
    : null;
}

export function createTask(user, data) {
  return rewardedAction(user.id, async (transaction) => {
    const task = await transaction.task.create({
      data: {
        ...data,
        userId: user.id,
        productivityDate: data.productivityDate ?? getProductivityDay(user.settings),
        completedAt: data.status === 'COMPLETED' ? new Date() : null,
      },
    });
    return { result: task };
  });
}

export function updateTask(userId, id, data) {
  return rewardedAction(userId, async (transaction) => {
    const previous = await transaction.task.findUniqueOrThrow({
      where: { id, userId },
      select: { status: true },
    });
    const task = await transaction.task.update({
      where: { id, userId },
      data: {
        ...data,
        ...(data.status !== undefined && {
          completedAt: data.status === 'COMPLETED' ? new Date() : null,
        }),
      },
    });
    // Editing a completed task is not a reward event.
    return {
      result: task,
      event:
        data.status === 'COMPLETED' && previous.status !== 'COMPLETED' ? taskEvent(task) : null,
    };
  });
}

export async function deleteTask(userId, id) {
  return rewardedAction(userId, async (transaction) => {
    await transaction.task.delete({ where: { id, userId } });
    return { result: undefined };
  });
}
