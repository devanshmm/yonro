import { api } from '@/lib/api';
import { useResources } from '@/stores/resources';

function goalChanged() {
  useResources
    .getState()
    .invalidate(['goals', 'goal:', 'overview', 'gamification', 'xp-history', 'leaderboard:']);
}

export async function fetchGoals() {
  const { data } = await api.get('/goals');
  return data.goals;
}

export async function fetchGoal(id) {
  const { data } = await api.get(`/goals/${id}`);
  return data.goal;
}

export async function createGoal(body) {
  const { data } = await api.post('/goals', body);
  goalChanged();
  return data.goal;
}

export async function updateGoal(id, body) {
  const { data } = await api.patch(`/goals/${id}`, body);
  goalChanged();
  return data.goal;
}

export async function deleteGoal(id) {
  await api.delete(`/goals/${id}`);
  goalChanged();
}

export async function createMilestone(goalId, body) {
  const { data } = await api.post(`/goals/${goalId}/milestones`, body);
  goalChanged();
  return data.milestone;
}

export async function updateMilestone(id, body) {
  const { data } = await api.patch(`/milestones/${id}`, body);
  goalChanged();
  return data.milestone;
}

export async function deleteMilestone(id) {
  await api.delete(`/milestones/${id}`);
  goalChanged();
}

export async function reorderMilestones(goalId, milestoneIds) {
  const { data } = await api.put(`/goals/${goalId}/milestones/order`, { milestoneIds });
  goalChanged();
  return data.goal;
}
