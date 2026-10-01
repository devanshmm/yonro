import { Prisma } from '@prisma/client';
import { prisma } from '../lib/prisma.js';
import { AppError } from '../utils/errors.js';
import { calculateGoalProgress } from '../utils/goalProgress.js';
import { lockOwnedGoal } from './ownershipService.js';

const milestoneOrder = { order: 'asc' };

export function presentGoal(goal) {
  return { ...goal, ...calculateGoalProgress(goal.milestones) };
}

export async function listGoals(userId, status = 'ALL') {
  const goals = await prisma.goal.findMany({
    where: { userId, ...(status === 'ALL' ? {} : { status }) },
    include: { milestones: { select: { id: true, completed: true }, orderBy: milestoneOrder } },
    orderBy: { createdAt: 'desc' },
  });
  return goals.map(presentGoal);
}

export async function getGoal(userId, id) {
  const goal = await prisma.goal.findUniqueOrThrow({
    where: { id, userId },
    include: { milestones: { orderBy: milestoneOrder } },
  });
  return presentGoal(goal);
}

export async function createGoal(userId, data) {
  const goal = await prisma.goal.create({
    data: { ...data, userId },
    include: { milestones: true },
  });
  return presentGoal(goal);
}

export async function updateGoal(userId, id, data) {
  const goal = await prisma.goal.update({
    where: { id, userId },
    data,
    include: { milestones: { orderBy: milestoneOrder } },
  });
  return presentGoal(goal);
}

export async function deleteGoal(userId, id) {
  await prisma.goal.delete({ where: { id, userId } });
}

export async function createMilestone(userId, goalId, data) {
  return prisma.$transaction(async (transaction) => {
    // Lock the parent to serialize append/reorder/delete operations on this goal.
    await lockOwnedGoal(transaction, userId, goalId);
    const milestones = await transaction.goalMilestone.findMany({
      where: { goalId },
      select: { order: true },
    });
    if (milestones.length >= 100) {
      throw new AppError(400, 'A goal can contain at most 100 milestones');
    }
    const order = milestones.length
      ? Math.max(...milestones.map((milestone) => milestone.order)) + 1
      : 0;
    return transaction.goalMilestone.create({
      data: { ...data, goalId, order, completedAt: data.completed ? new Date() : null },
    });
  });
}

export async function updateMilestone(userId, id, data) {
  return prisma.$transaction(async (transaction) => {
    const existing = await transaction.goalMilestone.findUniqueOrThrow({
      where: { id, goal: { userId } },
    });
    await lockOwnedGoal(transaction, userId, existing.goalId);
    // Re-read after obtaining the parent lock so simultaneous completion updates agree.
    const current = await transaction.goalMilestone.findUniqueOrThrow({ where: { id } });
    let completedAt = current.completedAt;
    if (data.completed !== undefined) {
      completedAt = data.completed ? (current.completedAt ?? new Date()) : null;
    }
    return transaction.goalMilestone.update({ where: { id }, data: { ...data, completedAt } });
  });
}

async function writeMilestoneOrder(transaction, goalId, milestoneIds) {
  if (!milestoneIds.length) {
    return;
  }
  const mapping = Prisma.join(
    milestoneIds.map((id, order) => Prisma.sql`(${id}::uuid, ${order}::integer)`),
  );
  // Temporary negative positions avoid unique-order collisions during a swap.
  // Both statements are atomic to readers because they run in the same transaction.
  await transaction.$executeRaw`
    UPDATE "GoalMilestone" AS milestone
    SET "order" = -positions.position - 1, "updatedAt" = NOW()
    FROM (VALUES ${mapping}) AS positions(id, position)
    WHERE milestone."id" = positions.id AND milestone."goalId" = ${goalId}::uuid
  `;
  await transaction.$executeRaw`
    UPDATE "GoalMilestone" AS milestone
    SET "order" = positions.position, "updatedAt" = NOW()
    FROM (VALUES ${mapping}) AS positions(id, position)
    WHERE milestone."id" = positions.id AND milestone."goalId" = ${goalId}::uuid
  `;
}

export async function reorderMilestones(userId, goalId, milestoneIds) {
  await prisma.$transaction(async (transaction) => {
    await lockOwnedGoal(transaction, userId, goalId);
    const milestones = await transaction.goalMilestone.findMany({
      where: { goalId },
      select: { id: true },
    });
    const existingIds = new Set(milestones.map((milestone) => milestone.id));
    if (
      existingIds.size !== milestoneIds.length ||
      milestoneIds.some((id) => !existingIds.has(id))
    ) {
      throw new AppError(400, 'Provide every milestone in this goal exactly once');
    }
    await writeMilestoneOrder(transaction, goalId, milestoneIds);
  });
  return getGoal(userId, goalId);
}

export async function deleteMilestone(userId, id) {
  await prisma.$transaction(async (transaction) => {
    const existing = await transaction.goalMilestone.findUniqueOrThrow({
      where: { id, goal: { userId } },
    });
    await lockOwnedGoal(transaction, userId, existing.goalId);
    await transaction.goalMilestone.delete({ where: { id } });
    const remaining = await transaction.goalMilestone.findMany({
      where: { goalId: existing.goalId },
      select: { id: true },
      orderBy: milestoneOrder,
    });
    await writeMilestoneOrder(
      transaction,
      existing.goalId,
      remaining.map((milestone) => milestone.id),
    );
  });
}
