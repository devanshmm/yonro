import { create } from 'zustand';
import { api } from '@/lib/api';
import { useResources } from './resources';
let generation = 0;
let todayGeneration = 0;
let pendingRefresh = null;
export const useProductivity = create((set, get) => ({
  tasks: [],
  today: null,
  week: null,
  sessions: [],
  loading: true,
  error: null,
  clear: () => {
    generation++;
    todayGeneration++;
    pendingRefresh = null;
    set({ tasks: [], today: null, week: null, sessions: [], loading: true, error: null });
  },
  refresh: (force = false) => {
    if (pendingRefresh && !force) {
      return pendingRefresh;
    }
    const requestId = ++generation;
    const todayRequestId = ++todayGeneration;
    const request = (async () => {
      try {
        const [today, week, sessions] = await Promise.all([
          api.get('/productivity/today'),
          api.get('/productivity/week'),
          api.get('/focus/sessions'),
        ]);
        const tasks = await api.get('/tasks', { params: { date: today.data.productivityDate } });
        if (requestId === generation) {
          set({
            tasks: tasks.data.tasks,
            today: todayRequestId === todayGeneration ? today.data : get().today,
            week: week.data,
            sessions: sessions.data.sessions,
            loading: false,
            error: null,
          });
        }
      } catch (error) {
        if (requestId === generation) {
          set({ loading: false, error });
        }
      }
    })().finally(() => {
      if (pendingRefresh === request) {
        pendingRefresh = null;
      }
    });
    pendingRefresh = request;
    return request;
  },
  refreshToday: async () => {
    const requestId = ++todayGeneration;
    try {
      const { data } = await api.get('/productivity/today');
      if (requestId === todayGeneration) {
        set({ today: data });
      }
    } catch (error) {
      if (requestId === todayGeneration) {
        set({ error });
      }
    }
  },
  createTask: async (body) => {
    await api.post('/tasks', body);
    useResources
      .getState()
      .invalidate(['activity', 'overview', 'gamification', 'xp-history', 'leaderboard:']);
    await get().refresh(true);
  },
  updateTask: async (id, body) => {
    await api.patch(`/tasks/${id}`, body);
    useResources
      .getState()
      .invalidate(['activity', 'overview', 'gamification', 'xp-history', 'leaderboard:']);
    await get().refresh(true);
  },
  deleteTask: async (id) => {
    await api.delete(`/tasks/${id}`);
    useResources
      .getState()
      .invalidate(['activity', 'overview', 'gamification', 'xp-history', 'leaderboard:']);
    await get().refresh(true);
  },
}));
