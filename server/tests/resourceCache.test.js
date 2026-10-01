import test from 'node:test';
import assert from 'node:assert/strict';
import { useResources } from '../../client/src/stores/resources.js';

function deferred() {
  let resolve;
  const promise = new Promise((done) => {
    resolve = done;
  });
  return { promise, resolve };
}

test('shared reads deduplicate concurrent consumers and reuse fresh data', async () => {
  useResources.getState().clear();
  useResources.getState().bindUser('first');
  const waiting = deferred();
  let calls = 0;
  const loader = () => {
    calls += 1;
    return waiting.promise;
  };
  const first = useResources.getState().load('habits', loader);
  const second = useResources.getState().load('habits', loader);
  waiting.resolve([]);
  await Promise.all([first, second]);
  await useResources.getState().load('habits', loader);
  assert.equal(calls, 1);
  assert.deepEqual(useResources.getState().cache.habits.data, []);
});

test('responses from a previous account cannot enter the current cache', async () => {
  useResources.getState().clear();
  useResources.getState().bindUser('first');
  const waiting = deferred();
  const oldRead = useResources.getState().load('habits', () => waiting.promise);
  useResources.getState().bindUser('second');
  await useResources.getState().load('habits', async () => ['second account']);
  waiting.resolve(['first account']);
  await oldRead;
  assert.deepEqual(useResources.getState().cache.habits.data, ['second account']);
});

test('mutation invalidation blocks stale responses without discarding unrelated data', async () => {
  useResources.getState().clear();
  await useResources.getState().load('goals', async () => ['unchanged']);
  const waiting = deferred();
  const oldRead = useResources.getState().load('habits', () => waiting.promise);
  useResources.getState().invalidate(['habits']);
  await useResources.getState().load('habits', async () => ['updated']);
  waiting.resolve(['old']);
  await oldRead;
  assert.deepEqual(useResources.getState().cache.habits.data, ['updated']);
  assert.deepEqual(useResources.getState().cache.goals.data, ['unchanged']);
  assert.equal(useResources.getState().cache.goals.stale, false);
});

test('read errors stay available for display and an explicit retry recovers', async () => {
  useResources.getState().clear();
  const error = new Error('Temporary outage');
  await useResources.getState().load('habits', async () => {
    throw error;
  });
  assert.equal(useResources.getState().cache.habits.error, error);
  assert.equal(useResources.getState().cache.habits.loading, false);
  await useResources.getState().load('habits', async () => ['recovered'], true);
  assert.equal(useResources.getState().cache.habits.error, null);
  assert.deepEqual(useResources.getState().cache.habits.data, ['recovered']);
});
