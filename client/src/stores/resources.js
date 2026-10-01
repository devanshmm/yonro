import { create } from 'zustand';

const pendingRequests = new Map();
let cacheEpoch = 0;

export const useResources = create((set, get) => ({
  ownerId: null,
  cache: {},
  revision: 0,
  bindUser: (ownerId) => {
    if (get().ownerId !== ownerId) {
      get().clear();
      set({ ownerId });
    }
  },
  clear: () => {
    cacheEpoch += 1;
    pendingRequests.clear();
    set({ ownerId: null, cache: {}, revision: get().revision + 1 });
  },
  invalidate: (prefixes = ['']) => {
    const cache = { ...get().cache };
    for (const key of Object.keys(cache)) {
      if (prefixes.some((prefix) => key.startsWith(prefix))) {
        cache[key] = { ...cache[key], stale: true, loading: false };
        pendingRequests.delete(key);
      }
    }
    set({ cache, revision: get().revision + 1 });
  },
  load: async (key, loader, force = false) => {
    const cached = get().cache[key];
    if (!force && pendingRequests.has(key)) {
      return pendingRequests.get(key);
    }
    if (!force && cached?.data && !cached.stale) {
      return cached.data;
    }
    const epoch = cacheEpoch;
    set((state) => ({ cache: { ...state.cache, [key]: { ...cached, loading: true, error: null } } }));
    // Shared requests survive route changes; epoch/request checks prevent an old
    // account's response or a pre-mutation response from replacing current data.
    const request = Promise.resolve().then(loader).then((data) => {
      if (epoch === cacheEpoch && pendingRequests.get(key) === request) {
        set((state) => ({ cache: { ...state.cache, [key]: { data, loading: false, error: null, stale: false } } }));
      }
      return data;
    }).catch((error) => {
      if (epoch === cacheEpoch && pendingRequests.get(key) === request) {
        set((state) => ({ cache: { ...state.cache, [key]: { ...state.cache[key], loading: false, error, stale: true } } }));
      }
    }).finally(() => {
      if (pendingRequests.get(key) === request) {
        pendingRequests.delete(key);
      }
    });
    pendingRequests.set(key, request);
    return request;
  },
}));
