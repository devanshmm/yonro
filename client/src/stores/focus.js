import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  queueFocusCommand,
  registerFocusRun,
  updateFocusRun,
  saveFocusSession,
  cancelActiveFocusRuns,
} from '@/services/focusApi';
import { errorMessage } from '@/lib/utils';
import { useProductivity } from './productivity';
import { useResources } from './resources';
const initial = {
  ownerId: null,
  targetSeconds: 25 * 60,
  phase: 'idle',
  elapsedMs: 0,
  runningSince: null,
  startedAt: null,
  sessionId: null,
  pending: null,
  error: null,
};
export function elapsed(state, now = Date.now()) {
  return state.elapsedMs + (state.phase === 'running' ? Math.max(0, now - state.runningSince) : 0);
}
export const useFocus = create(
  persist(
    (set, get) => ({
      ...initial,
      bindUser: (ownerId) => {
        if (get().ownerId !== ownerId) set({ ...initial, ownerId });
        else if (get().phase === 'saving')
          set({ phase: 'complete', error: 'Your session is ready to save. Please retry.' });
      },
      preset: (seconds) => {
        if (get().phase === 'idle') set({ targetSeconds: seconds });
      },
      start: () => {
        const state = get();
        if (state.phase === 'idle') {
          const sessionId = crypto.randomUUID();
          set({
            phase: 'running',
            startedAt: Date.now(),
            runningSince: Date.now(),
            elapsedMs: 0,
            sessionId,
            error: null,
          });
          void queueFocusCommand(
            () => registerFocusRun(sessionId, state.targetSeconds),
            (error) => {
              if (get().sessionId === sessionId) set({ error: errorMessage(error) });
            },
          );
        } else if (state.phase === 'paused') {
          set({ phase: 'running', runningSince: Date.now() });
          void queueFocusCommand(
            () => updateFocusRun(state.sessionId, 'resume'),
            (error) => {
              if (get().sessionId === state.sessionId) set({ error: errorMessage(error) });
            },
          );
        }
      },
      pause: () => {
        if (get().phase === 'running') {
          if (elapsed(get()) >= get().targetSeconds * 1000) {
            void get().complete();
            return;
          }
          const sessionId = get().sessionId;
          set({ elapsedMs: elapsed(get()), runningSince: null, phase: 'paused' });
          void queueFocusCommand(
            () => updateFocusRun(sessionId, 'pause'),
            (error) => {
              if (get().sessionId === sessionId) set({ error: errorMessage(error) });
            },
          );
        }
      },
      reset: async () => {
        const state = get();
        set({ ...initial, ownerId: state.ownerId, targetSeconds: state.targetSeconds });
        await queueFocusCommand(cancelActiveFocusRuns, (error) => {
          if (get().ownerId === state.ownerId) {
            set({ error: errorMessage(error) });
          }
        });
      },
      complete: async () => {
        const state = get();
        if (state.phase !== 'running' || elapsed(state) < state.targetSeconds * 1000) return;
        const endedAt =
          state.runningSince + Math.max(0, state.targetSeconds * 1000 - state.elapsedMs);
        set({
          phase: 'complete',
          runningSince: null,
          elapsedMs: state.targetSeconds * 1000,
          pending: {
            id: state.sessionId,
            startedAt: new Date(state.startedAt).toISOString(),
            endedAt: new Date(endedAt).toISOString(),
            durationSeconds: state.targetSeconds,
          },
        });
        await get().save();
      },
      save: async () => {
        if (!get().pending || get().phase === 'saving') return;
        const { pending, ownerId, sessionId } = get();
        const stillCurrent = () => get().ownerId === ownerId && get().sessionId === sessionId;
        set({ phase: 'saving', error: null });
        try {
          await saveFocusSession(pending);
          if (!stillCurrent()) return;
          set({ phase: 'complete', pending: null });
          useResources
            .getState()
            .invalidate(['activity', 'overview', 'gamification', 'xp-history', 'leaderboard:']);
          await useProductivity.getState().refresh(true);
        } catch (error) {
          if (stillCurrent()) set({ phase: 'complete', error: errorMessage(error) });
        }
      },
    }),
    {
      name: 'lockin-focus-v1',
      partialize: ({
        ownerId,
        targetSeconds,
        phase,
        elapsedMs,
        runningSince,
        startedAt,
        sessionId,
        pending,
        error,
      }) => ({
        ownerId,
        targetSeconds,
        phase,
        elapsedMs,
        runningSince,
        startedAt,
        sessionId,
        pending,
        error,
      }),
    },
  ),
);
