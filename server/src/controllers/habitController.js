import * as habitService from '../services/habitService.js';

export async function list(req, res) {
  const habits = await habitService.listHabits(req.user, req.validated.query.scope);
  res.json({ habits });
}

export async function create(req, res) {
  const habit = await habitService.createHabit(req.user, req.validated.body);
  res.status(201).json({ habit });
}

export async function get(req, res) {
  const habit = await habitService.getHabit(req.user, req.validated.params.id);
  res.json({ habit });
}

export async function update(req, res) {
  const habit = await habitService.updateHabit(req.user, req.validated.params.id, req.validated.body);
  res.json({ habit });
}

export async function remove(req, res) {
  await habitService.deleteHabit(req.user.id, req.validated.params.id);
  res.status(204).end();
}

export async function recordEntry(req, res) {
  const entry = await habitService.recordEntry(req.user, req.validated.params.id, req.validated.body);
  res.json({ entry });
}

export async function entries(req, res) {
  const history = await habitService.listEntries(req.user, req.validated.params.id, req.validated.query.days);
  res.json(history);
}

export async function analytics(req, res) {
  const analytics = await habitService.getHabitAnalytics(req.user, req.validated.params.id, req.validated.query.days);
  res.json(analytics);
}

export async function removeEntry(req, res) {
  const { id, productivityDate } = req.validated.params;
  await habitService.deleteEntry(req.user.id, id, productivityDate);
  res.status(204).end();
}
