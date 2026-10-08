import { api } from '@/lib/api';

let commands = Promise.resolve();

export function queueFocusCommand(action, onError) {
  commands = commands.then(action).catch(onError);
  return commands;
}

export function registerFocusRun(id, targetSeconds) {
  return api.post('/focus/runs', { id, targetSeconds });
}

export function updateFocusRun(id, action) {
  return api.patch(`/focus/runs/${id}`, { action });
}

export function cancelActiveFocusRuns() {
  return api.delete('/focus/runs/active');
}

export async function saveFocusSession(pending) {
  await commands;
  return api.post('/focus/sessions', pending);
}
