import { api } from '@/lib/api';

export async function fetchGamification() {
  const { data } = await api.get('/gamification/me');
  return data;
}

export async function fetchXPHistory(cursor = null) {
  const { data } = await api.get('/gamification/xp-history', {
    params: { limit: 20, ...(cursor ? { cursor } : {}) },
  });
  return data;
}

export async function fetchLeaderboard(metric, period) {
  const { data } = await api.get(`/leaderboards/${metric}`, { params: { limit: 20, period } });
  return data;
}
