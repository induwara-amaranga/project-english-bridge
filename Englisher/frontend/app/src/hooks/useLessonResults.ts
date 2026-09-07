import { useEffect, useState } from 'react';
import { fetchAllResults, getAllResults, type LessonResult } from '../domain/lessonResults';

/**
 * Every lesson result the learner has, for the review and completion screens.
 *
 * <p>Renders from the local cache on the first paint — those rows were written
 * by this device and are almost always the same ones — then reconciles with the
 * server, whose copy wins. So the screen is never blank waiting on a request,
 * and a learner signing in on a new device still sees their history.
 */
export function useLessonResults() {
  const [results, setResults] = useState<LessonResult[]>(getAllResults);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    fetchAllResults()
      .then((all) => { if (alive) setResults(all); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  return { results, loading };
}
