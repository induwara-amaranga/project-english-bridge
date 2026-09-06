import { useEffect, useState } from 'react';
import { EMPTY_ANALYTICS, loadAnalytics } from '../domain/analytics';
import type { Analytics } from '../domain/analytics';

export function useAnalytics() {
  const [analytics, setAnalytics] = useState<Analytics>(EMPTY_ANALYTICS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    loadAnalytics()
      .then((a) => { if (alive) setAnalytics(a); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  return { analytics, loading };
}
