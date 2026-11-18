import { useCallback, useEffect, useState, type DependencyList } from 'react';
import { errorMessage } from '@/domain/shared/errors';

export interface AsyncState<T> {
  data: T | undefined;
  error: string | null;
  loading: boolean;
  reload(): void;
  // Replace the loaded data locally (after a save) without refetching.
  setData(update: T | ((current: T | undefined) => T)): void;
}

// Runs `load` when the component mounts and whenever `deps` change; ignores results that arrive after
// the deps changed or the component unmounted. `loading` is true until the first result and during
// reload(); when deps change, the previous data stays visible until the new result arrives.
export function useAsync<T>(load: () => Promise<T>, deps: DependencyList): AsyncState<T> {
  const [data, setData] = useState<T | undefined>(undefined);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let live = true;
    load()
      .then((result) => {
        if (!live) return;
        setData(result);
        setError(null);
      })
      .catch((e: unknown) => live && setError(errorMessage(e)))
      .finally(() => live && setLoading(false));
    return () => {
      live = false;
    };
    // `load` is recreated every render; `deps` (plus retry attempts) decide when to rerun.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, attempt]);

  const reload = useCallback(() => {
    setLoading(true);
    setAttempt((a) => a + 1);
  }, []);
  return { data, error, loading, reload, setData };
}
