import { AppError } from '../utils/errors.js';

export async function lockOwnedHabit(transaction, userId, habitId) {
  const rows = await transaction.$queryRaw`
    SELECT "id" FROM "Habit"
    WHERE "id" = ${habitId}::uuid AND "userId" = ${userId}::uuid
    FOR UPDATE
  `;
  if (!rows.length) {
    throw new AppError(404, 'Habit not found');
  }
}

export async function lockOwnedGoal(transaction, userId, goalId) {
  const rows = await transaction.$queryRaw`
    SELECT "id" FROM "Goal"
    WHERE "id" = ${goalId}::uuid AND "userId" = ${userId}::uuid
    FOR UPDATE
  `;
  if (!rows.length) {
    throw new AppError(404, 'Goal not found');
  }
}
