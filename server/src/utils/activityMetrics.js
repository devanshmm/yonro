export function isMeaningfulProductivityDay(day) {
  return day.tasksCompleted > 0 || day.habitsCompleted > 0 || day.focusSessions > 0;
}

const intensityThresholds = {
  overall: [1, 3, 6, 10],
  tasks: [1, 2, 4, 6],
  focus: [1, 25, 60, 120],
  habits: [1, 2, 4, 6],
};

export function getActivityIntensity(value, metric = 'overall') {
  return intensityThresholds[metric].filter((threshold) => value >= threshold).length;
}

export function decorateActivityDay(day) {
  const activity = day.tasksCompleted + day.habitsCompleted + day.focusSessions;
  const focusMinutes = Number((day.focusSeconds / 60).toFixed(2));

  return {
    ...day,
    activity,
    focusMinutes,
    meaningful: isMeaningfulProductivityDay(day),
    levels: {
      overall: getActivityIntensity(activity),
      tasks: getActivityIntensity(day.tasksCompleted, 'tasks'),
      focus: getActivityIntensity(focusMinutes, 'focus'),
      habits: getActivityIntensity(day.habitsCompleted, 'habits'),
    },
  };
}
