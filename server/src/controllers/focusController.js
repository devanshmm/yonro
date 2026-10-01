import * as service from '../services/focusService.js';
export async function list(req, res) {
  res.json({ sessions: await service.listFocus(req.user) });
}
export async function create(req, res) {
  res.status(201).json({ session: await service.saveFocus(req.user, req.validated.body) });
}
