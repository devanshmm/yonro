import { create } from 'zustand';
import { api } from '@/lib/api';
import { useResources } from './resources';
export const useAuth = create((set) => ({
  user: null,
  ready: false,
  initError: null,
  init: async () => {
    try {
      const { data } = await api.get('/auth/me');
      useResources.getState().bindUser(data.user.id);
      set({ user: data.user, ready: true, initError: null });
    } catch (error) {
      set({ user: null, ready: true, initError: error.response?.status === 401 ? null : error });
    }
  },
  authenticate: async (mode, body) => {
    const { data } = await api.post(`/auth/${mode}`, body);
    useResources.getState().bindUser(data.user.id);
    set({ user: data.user, ready: true, initError: null });
  },
  logout: async () => {
    await api.post('/auth/logout');
    useResources.getState().clear();
    set({ user: null });
  },
  updateSettings: async (settings) => {
    const { data } = await api.patch('/settings', settings);
    useResources.getState().invalidate();
    set((state) => ({ user: { ...state.user, settings: data.settings } }));
  },
}));
