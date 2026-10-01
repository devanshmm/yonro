export const habitTypes = [
  { value: 'BOOLEAN', label: 'Completion · yes or no' },
  { value: 'NUMBER', label: 'Number · a measured amount' },
  { value: 'DURATION', label: 'Duration · hours and minutes' },
  { value: 'PERCENTAGE', label: 'Percentage · 0 to 100' },
  { value: 'COUNTER', label: 'Counter · a whole-number count' },
];

export function formatHabitValue(habit, value) {
  if (value === null || value === undefined) {
    return 'Not tracked';
  }
  if (habit.type === 'BOOLEAN') {
    if (value === 1) {
      return 'Completed';
    }
    return value === 0 ? 'Not completed' : `${Math.round(value * 100)}% completed`;
  }
  if (habit.type === 'DURATION') {
    const hours = Math.floor(value / 60);
    const minutes = Math.round(value % 60);
    return hours ? `${hours}h ${minutes}m` : `${minutes} min`;
  }
  return `${value.toLocaleString()}${habit.unit === '%' ? '%' : ` ${habit.unit}`}`;
}

export function habitTargetLabel(habit) {
  if (habit.type === 'BOOLEAN') {
    return 'Complete the habit';
  }
  const direction = habit.targetDirection === 'AT_MOST' ? 'At most' : 'At least';
  return `${direction} ${formatHabitValue(habit, habit.targetValue)}`;
}

function readDuration(formData, prefix) {
  const hours = Number(formData.get(`${prefix}Hours`));
  const minutes = Number(formData.get(`${prefix}Minutes`));
  return hours * 60 + minutes;
}

export function habitFormPayload(formData, type) {
  const isBoolean = type === 'BOOLEAN';
  let unit = formData.get('unit');
  let targetValue = Number(formData.get('targetValue'));
  if (isBoolean) {
    unit = 'completed';
    targetValue = 1;
  } else if (type === 'DURATION') {
    unit = 'minutes';
    targetValue = readDuration(formData, 'target');
  } else if (type === 'PERCENTAGE') {
    unit = '%';
  }
  if (!Number.isFinite(targetValue) || targetValue <= 0) {
    throw new Error('Set a target greater than zero');
  }
  return {
    name: formData.get('name').trim(),
    description: formData.get('description').trim(),
    type,
    targetValue,
    unit,
    targetDirection: isBoolean ? 'AT_LEAST' : formData.get('targetDirection'),
  };
}

export function entryFormPayload(formData, type) {
  let value = Number(formData.get('value'));
  if (type === 'BOOLEAN') {
    value = formData.get('completed') ? 1 : 0;
  } else if (type === 'DURATION') {
    value = readDuration(formData, 'entry');
  }
  if (!Number.isFinite(value) || value < 0) {
    throw new Error('Enter a valid nonnegative value');
  }
  return { value, productivityDate: formData.get('productivityDate') };
}
