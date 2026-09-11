import { useEffect, useState } from 'react';
import { EMPTY_PROGRESS, loadProgress } from '../domain/progress';
import { loadGuestPreview } from '../domain/guestProgress';
import { errorMessage } from '../lib/apiClient';
import { useAuth } from './useAuth';
import type { Progress } from '../domain/progress';

/**
 * The learner's progress. For a real account, from GET /api/progress; for
 * guest mode, from the local preview (domain/guestProgress.ts) — no backend
 * account exists yet, so there is nothing to fetch. `setProgress` lets a
 * caller sync in the authoritative result of a write (lesson completion,
 * placement) without a second round trip, in either mode.
 */
export function useProgress() {
  const { isGuest } = useAuth();
  const [progress, setProgress] = useState<Progress>(EMPTY_PROGRESS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isGuest) {
      setProgress(loadGuestPreview());
      setLoading(false);
      return;
    }
    let alive = true;
    loadProgress()
      .then((p) => { if (alive) setProgress(p); })
      .catch((err) => { if (alive) setError(errorMessage(err)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [isGuest]);

  return { progress, loading, error, setProgress };
}
