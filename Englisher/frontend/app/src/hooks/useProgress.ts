import { useEffect, useState } from 'react';
import { EMPTY_PROGRESS, loadProgress } from '../domain/progress';
import { errorMessage } from '../lib/apiClient';
import type { Progress } from '../domain/progress';

/** The learner's progress, fetched from GET /api/progress. `setProgress` lets a
 * caller sync in the authoritative result of a write (lesson completion,
 * placement) without a second round trip. */
export function useProgress() {
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadProgress()
      .then((p) => { if (alive) setProgress(p); })
      .catch((err) => { if (alive) setError(errorMessage(err)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  return { progress, loading, error, setProgress };
}
