import * as service from '../services/taskService.js';
export async function list(req, res) {
  res.json({ tasks: await service.listTasks(req.user, req.validated.query.date) });
}
export async function create(req, res) {
  res.status(201).json({ task: await service.createTask(req.user, req.validated.body) });
}
export async function update(req, res) {
  res.json({
    task: await service.updateTask(req.user.id, req.validated.params.id, req.validated.body),
  });
}
export async function remove(req, res) {
  await service.deleteTask(req.user.id, req.validated.params.id);
  res.status(204).end();
}
export async function complete(req, res) {
  res.json({
    task: await service.updateTask(req.user.id, req.validated.params.id, { status: 'COMPLETED' }),
  });
}
export async function uncomplete(req, res) {
  res.json({
    task: await service.updateTask(req.user.id, req.validated.params.id, { status: 'TODO' }),
  });
}
