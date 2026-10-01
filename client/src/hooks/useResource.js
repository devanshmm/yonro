import { useEffect } from 'react';
import { useResources } from '@/stores/resources';

export function useResource(key, loader) {
  const resource = useResources((state) => state.cache[key]);
  const revision = useResources((state) => state.revision);
  const load = useResources((state) => state.load);

  useEffect(() => {
    void load(key, loader);
  }, [key, loader, load, revision]);

  return {
    data: resource?.data ?? null,
    loading: resource?.loading ?? true,
    error: resource?.error ?? null,
    retry: () => load(key, loader, true),
  };
}
