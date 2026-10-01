export function calculateGoalProgress(milestones) {
  const totalMilestones = milestones.length;
  const completedMilestones = milestones.filter((milestone) => milestone.completed).length;

  return {
    totalMilestones,
    completedMilestones,
    progressPercentage: totalMilestones
      ? Math.round((completedMilestones / totalMilestones) * 100)
      : 0,
  };
}
