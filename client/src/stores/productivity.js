import { create } from 'zustand';
import { api } from '@/lib/api';
import { useResources } from './resources';
let generation = 0;
export const useProductivity = create((set, get) => ({
  tasks: [],
  today: null,
  week: null,
  sessions: [],
  loading: true,
  error: null,
  clear: () => {
    generation++;
    set({ tasks: [], today: null, week: null, sessions: [], loading: true, error: null });
  },
  refresh: async () => {
    const requestId = ++generation;
    try {
      const [today, week, sessions] = await Promise.all([
        api.get('/productivity/today'),
        api.get('/productivity/week'),
        api.get('/focus/sessions'),
      ]);
      const tasks = await api.get('/tasks', { params: { date: today.data.productivityDate } });
      if (requestId === generation)
        set({
          tasks: tasks.data.tasks,
          today: today.data,
          week: week.data,
          sessions: sessions.data.sessions,
          loading: false,
          error: null,
        });
    } catch (error) {
      if (requestId === generation) set({ loading: false, error });
    }
  },
  refreshToday: async () => {
    try {
      const { data } = await api.get('/productivity/today');
      set({ today: data });
    } catch (error) {
      set({ error });
    }
  },
  createTask: async (body) => {
    await api.post('/tasks', body);
    useResources.getState().invalidate(['activity', 'overview']);
    await get().refresh();
  },
  updateTask: async (id, body) => {
    await api.patch(`/tasks/${id}`, body);
    useResources.getState().invalidate(['activity', 'overview']);
    await get().refresh();
  },
  deleteTask: async (id) => {
    await api.delete(`/tasks/${id}`);
    useResources.getState().invalidate(['activity', 'overview']);
    await get().refresh();
  },
}));
