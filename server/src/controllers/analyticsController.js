import { getAnalyticsOverview } from '../services/analyticsService.js';
import { getHeatmap } from '../services/activityService.js';

export async function overview(req, res) {
  const analytics = await getAnalyticsOverview(req.user);
  res.json(analytics);
}

export async function heatmap(req, res) {
  const activity = await getHeatmap(req.user, req.validated.query.days);
  res.json(activity);
}
