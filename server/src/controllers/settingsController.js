import { updateSettings } from '../services/settingsService.js';
export function get(req, res) {
  res.json({ settings: req.user.settings });
}
export async function update(req, res) {
  res.json({ settings: await updateSettings(req.user.id, req.validated.body) });
}
