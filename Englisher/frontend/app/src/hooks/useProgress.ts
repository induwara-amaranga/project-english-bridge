import { useCallback, useState } from 'react';
import { getProgress, setProgress } from '../lib/storage';
import type { Progress } from '../domain/progress';

export function useProgress() {
  const [progress, setState] = useState<Progress>(() => getProgress());

  const update = useCallback((next: Progress) => {
    setProgress(next);
    setState(next);
  }, []);

  return { progress, update };
}
