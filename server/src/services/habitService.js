import { prisma } from '../lib/prisma.js';
import { AppError } from '../utils/errors.js';
import {
  getProductivityDay,
  trailingDateRange,
  dateSequence,
  addDays,
} from '../utils/productivityDay.js';
import {
  calculateHabitProgress,
  calculateHabitStatistics,
  isHabitSuccessful,
} from '../utils/habitMetrics.js';
import { habitDefinitionSchema, validateEntryValue } from '../validators/habitSchemas.js';
import { lockOwnedHabit } from './ownershipService.js';
import { rewardedAction } from './rewardService.js';

function presentHabit(record) {
  const { entries, ...habit } = record;
  const todayEntry = entries?.[0] ?? null;
  return { ...habit, todayEntry, progressPercentage: calculateHabitProgress(habit, todayEntry) };
}

function todayEntryInclude(user) {
  return { entries: { where: { productivityDate: getProductivityDay(user.settings) } } };
}

export async function listHabits(user, scope = 'active') {
  const activeFilter = scope === 'all' ? {} : { active: scope === 'active' };
  const habits = await prisma.habit.findMany({
    where: { userId: user.id, ...activeFilter },
    include: todayEntryInclude(user),
    orderBy: { createdAt: 'asc' },
  });
  return habits.map(presentHabit);
}

export async function getHabit(user, id) {
  const habit = await prisma.habit.findUniqueOrThrow({
    where: { id, userId: user.id },
    include: todayEntryInclude(user),
  });
  return presentHabit(habit);
}

export async function createHabit(user, data) {
  const habit = await prisma.habit.create({ data: { ...data, userId: user.id } });
  return presentHabit(habit);
}

function trackingDefinition(habit) {
  return {
    name: habit.name,
    description: habit.description,
    type: habit.type,
    targetValue: habit.targetValue,
    targetDirection: habit.targetDirection,
    unit: habit.unit,
    active: habit.active,
  };
}

export async function updateHabit(user, id, changes) {
  await rewardedAction(user.id, async (transaction) => {
    // Entry writes share this lock so an entry cannot evaluate a half-updated target.
    await lockOwnedHabit(transaction, user.id, id);
    const existing = await transaction.habit.findUniqueOrThrow({ where: { id } });
    const definition = habitDefinitionSchema.parse({ ...trackingDefinition(existing), ...changes });
    if (definition.type !== existing.type || definition.unit !== existing.unit) {
      const entryCount = await transaction.habitEntry.count({ where: { habitId: id } });
      if (entryCount > 0) {
        throw new AppError(
          409,
          'Tracking type and unit cannot change after recording history. Create a new habit instead.',
        );
      }
    }
    await transaction.habit.update({ where: { id }, data: definition });
    return { result: undefined };
  });
  return getHabit(user, id);
}

export async function deleteHabit(userId, id) {
  await rewardedAction(userId, async (transaction) => {
    await transaction.habit.delete({ where: { id, userId } });
    return { result: undefined };
  });
}

export async function deleteEntry(userId, habitId, productivityDate) {
  await rewardedAction(userId, async (transaction) => {
    await lockOwnedHabit(transaction, userId, habitId);
    await transaction.habitEntry.delete({
      where: { habitId_productivityDate: { habitId, productivityDate } },
    });
    return { result: undefined };
  });
}

export async function recordEntry(user, habitId, data) {
  const today = getProductivityDay(user.settings);
  const productivityDate = data.productivityDate ?? today;
  if (productivityDate > today || productivityDate < addDays(today, -364)) {
    throw new AppError(
      400,
      'Entries must be within the previous 365 productivity days, including today',
    );
  }
  return rewardedAction(user.id, async (transaction) => {
    await lockOwnedHabit(transaction, user.id, habitId);
    const habit = await transaction.habit.findUniqueOrThrow({ where: { id: habitId } });
    if (!habit.active) {
      throw new AppError(409, 'Restore this archived habit before recording an entry');
    }
    const value = validateEntryValue(habit, data.value);
    const completed = isHabitSuccessful(habit, value);
    // Store the success decision with the entry; later target edits do not rewrite history.
    const entry = await transaction.habitEntry.upsert({
      where: { habitId_productivityDate: { habitId, productivityDate } },
      create: { habitId, productivityDate, value, completed },
      update: { value, completed },
    });
    return {
      result: entry,
      event: completed
        ? {
            source: 'HABIT_COMPLETION',
            sourceId: `${habitId}:${productivityDate}`,
            description: 'Met a habit target',
            productivityDate,
          }
        : null,
    };
  });
}

export async function listEntries(user, habitId, days) {
  await prisma.habit.findUniqueOrThrow({
    where: { id: habitId, userId: user.id },
    select: { id: true },
  });
  return fetchEntryHistory(user.settings, habitId, days);
}

async function fetchEntryHistory(settings, habitId, days) {
  const range = trailingDateRange(settings, days);
  const entries = await prisma.habitEntry.findMany({
    where: { habitId, productivityDate: { gte: range.startDate, lte: range.endDate } },
    orderBy: { productivityDate: 'asc' },
  });
  return { ...range, entries };
}

export async function getHabitAnalytics(user, habitId, days) {
  const habit = await getHabit(user, habitId);
  const today = getProductivityDay(user.settings);
  const [history, successfulHistory] = await Promise.all([
    fetchEntryHistory(user.settings, habitId, days),
    prisma.habitEntry.findMany({
      where: { habitId, completed: true, productivityDate: { lte: today } },
      select: { productivityDate: true },
    }),
  ]);
  const entriesByDate = new Map(history.entries.map((entry) => [entry.productivityDate, entry]));
  const successfulDates = successfulHistory.map((entry) => entry.productivityDate);
  const chart = dateSequence(history.startDate, history.endDate).map((date) => {
    const entry = entriesByDate.get(date);
    return {
      date,
      value: entry?.value ?? null,
      completed: entry?.completed ?? false,
      tracked: Boolean(entry),
    };
  });

  return {
    habit,
    ...history,
    statistics: calculateHabitStatistics(history.entries, successfulDates, today),
    chart,
  };
}
