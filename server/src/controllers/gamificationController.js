import * as service from '../services/gamificationService.js';
import { getLeaderboard } from '../services/leaderboardService.js';
import {
  startFocusRun,
  changeFocusRun,
  cancelActiveFocusRuns,
} from '../services/focusRunService.js';

export async function me(req, res) {
  res.json(await service.getGamification(req.user));
}
export async function history(req, res) {
  res.json(await service.getXPHistory(req.user.id, req.validated.query));
}
export async function achievements(req, res) {
  res.json({ achievements: await service.getAchievements(req.user.id) });
}
export async function leaderboard(req, res) {
  res.json(await getLeaderboard(req.user, req.params.metric, req.validated.query));
}
export async function startRun(req, res) {
  res.status(201).json({ run: await startFocusRun(req.user.id, req.validated.body) });
}
export async function changeRun(req, res) {
  res.json({
    run: await changeFocusRun(req.user.id, req.validated.params.id, req.validated.body.action),
  });
}

export async function cancelRuns(req, res) {
  await cancelActiveFocusRuns(req.user.id);
  res.status(204).end();
}
