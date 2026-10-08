import { LEVEL_NAMES, XP_RULES } from '../config/gamification.js';

export function levelThreshold(level) {
  return 50 * (level - 1) * level;
}

export function calculateLevel(totalXP) {
  return Math.max(1, Math.floor((1 + Math.sqrt(1 + totalXP / 12.5)) / 2));
}

export function calculateXPProgress(totalXP) {
  const level = calculateLevel(totalXP);
  const currentLevelXP = levelThreshold(level);
  const nextLevelXP = levelThreshold(level + 1);
  const levelName = [...LEVEL_NAMES].reverse().find((tier) => level >= tier.level).name;
  return {
    totalXP,
    level,
    levelName,
    currentLevelXP,
    nextLevelXP,
    xpRequiredInLevel: nextLevelXP - currentLevelXP,
    xpIntoLevel: totalXP - currentLevelXP,
    xpToNextLevel: nextLevelXP - totalXP,
    progressPercentage: Math.floor(
      ((totalXP - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100,
    ),
  };
}

export function calculateTaskXP() {
  return XP_RULES.TASK_COMPLETION.amount;
}

export function calculateFocusXP(verifiedSeconds) {
  const rule = XP_RULES.FOCUS_SESSION;
  return verifiedSeconds >= rule.minimumSeconds
    ? Math.floor(verifiedSeconds / rule.secondsPerXP)
    : 0;
}

export function calculateHabitXP() {
  return XP_RULES.HABIT_COMPLETION.amount;
}

export function calculateGoalXP() {
  return XP_RULES.GOAL_MILESTONE.amount;
}
