import { api } from '@/lib/api';

export async function fetchHeatmap() {
  const { data } = await api.get('/analytics/heatmap');
  return data;
}

export async function fetchAnalyticsOverview() {
  const { data } = await api.get('/analytics/overview');
  return data;
}
