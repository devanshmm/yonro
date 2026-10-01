import { create } from 'zustand';
import { api } from '@/lib/api';
import { useResources } from './resources';
let pendingInit = null;
let sessionGeneration = 0;
export const useAuth = create((set) => ({
  user: null,
  ready: false,
  initError: null,
  init: () => {
    if (pendingInit) {
      return pendingInit;
    }
    const requestGeneration = sessionGeneration;
    const request = (async () => {
      try {
        const { data } = await api.get('/auth/me');
        if (requestGeneration !== sessionGeneration) {
          return;
        }
        useResources.getState().bindUser(data.user.id);
        set({ user: data.user, ready: true, initError: null });
      } catch (error) {
        if (requestGeneration === sessionGeneration) {
          set({
            user: null,
            ready: true,
            initError: error.response?.status === 401 ? null : error,
          });
        }
      }
    })().finally(() => {
      if (pendingInit === request) {
        pendingInit = null;
      }
    });
    pendingInit = request;
    return request;
  },
  authenticate: async (mode, body) => {
    const { data } = await api.post(`/auth/${mode}`, body);
    sessionGeneration += 1;
    useResources.getState().bindUser(data.user.id);
    set({ user: data.user, ready: true, initError: null });
  },
  logout: async () => {
    await api.post('/auth/logout');
    sessionGeneration += 1;
    useResources.getState().clear();
    set({ user: null });
  },
  updateSettings: async (settings) => {
    const { data } = await api.patch('/settings', settings);
    useResources.getState().invalidate();
    set((state) => ({ user: { ...state.user, settings: data.settings } }));
  },
}));
