import * as goalService from '../services/goalService.js';

export async function list(req, res) {
  const goals = await goalService.listGoals(req.user.id, req.validated.query.status);
  res.json({ goals });
}

export async function create(req, res) {
  const goal = await goalService.createGoal(req.user.id, req.validated.body);
  res.status(201).json({ goal });
}

export async function get(req, res) {
  const goal = await goalService.getGoal(req.user.id, req.validated.params.id);
  res.json({ goal });
}

export async function update(req, res) {
  const goal = await goalService.updateGoal(
    req.user.id,
    req.validated.params.id,
    req.validated.body,
  );
  res.json({ goal });
}

export async function remove(req, res) {
  await goalService.deleteGoal(req.user.id, req.validated.params.id);
  res.status(204).end();
}

export async function createMilestone(req, res) {
  const milestone = await goalService.createMilestone(
    req.user.id,
    req.validated.params.id,
    req.validated.body,
  );
  res.status(201).json({ milestone });
}

export async function updateMilestone(req, res) {
  const milestone = await goalService.updateMilestone(
    req.user.id,
    req.validated.params.id,
    req.validated.body,
  );
  res.json({ milestone });
}

export async function removeMilestone(req, res) {
  await goalService.deleteMilestone(req.user.id, req.validated.params.id);
  res.status(204).end();
}

export async function completeMilestone(req, res) {
  const milestone = await goalService.updateMilestone(req.user.id, req.validated.params.id, {
    completed: true,
  });
  res.json({ milestone });
}

export async function reorderMilestones(req, res) {
  const goal = await goalService.reorderMilestones(
    req.user.id,
    req.validated.params.id,
    req.validated.body.milestoneIds,
  );
  res.json({ goal });
}
