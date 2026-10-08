import { api } from '@/lib/api';
import { useResources } from '@/stores/resources';
import { useProductivity } from '@/stores/productivity';

async function habitChanged() {
  useResources
    .getState()
    .invalidate([
      'habits',
      'habit:',
      'activity',
      'overview',
      'gamification',
      'xp-history',
      'leaderboard:',
    ]);
  await useProductivity.getState().refreshToday();
}

export async function fetchHabits() {
  const { data } = await api.get('/habits', { params: { scope: 'all' } });
  return data.habits;
}

export async function createHabit(body) {
  const { data } = await api.post('/habits', body);
  await habitChanged();
  return data.habit;
}

export async function updateHabit(id, body) {
  const { data } = await api.patch(`/habits/${id}`, body);
  await habitChanged();
  return data.habit;
}

export async function deleteHabit(id) {
  await api.delete(`/habits/${id}`);
  await habitChanged();
}

export async function recordHabitEntry(id, body) {
  const { data } = await api.post(`/habits/${id}/entries`, body);
  await habitChanged();
  return data.entry;
}

export async function deleteHabitEntry(id, productivityDate) {
  await api.delete(`/habits/${id}/entries/${productivityDate}`);
  await habitChanged();
}

export async function fetchHabitAnalytics(id, days) {
  const { data } = await api.get(`/habits/${id}/analytics`, { params: { days } });
  return data;
}
