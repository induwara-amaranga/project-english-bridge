import { useCallback, useEffect, useMemo, useState } from 'react';
import { EMPTY_CURRICULUM, loadCurriculum, normaliseCurriculum, saveCurriculum } from '../domain/curriculum';
import { errorMessage } from '../lib/apiClient';
import type { Curriculum } from '../domain/types';

/** Curriculum, fetched from the API and normalised on read (idempotent — see curriculum.test.ts). */
export function useCurriculum() {
  const [curriculum, setCurriculum] = useState<Curriculum>(EMPTY_CURRICULUM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadCurriculum()
      .then((c) => { if (alive) setCurriculum(normaliseCurriculum(c)); })
      .catch((err) => { if (alive) setError(errorMessage(err)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  /** Applies the mutation optimistically, then persists it — CourseDashboard's reordering. */
  const mutate = useCallback((mutator: (draft: Curriculum) => void) => {
    let next!: Curriculum;
    setCurriculum((prev) => {
      next = JSON.parse(JSON.stringify(prev));
      mutator(next);
      return next;
    });
    setSaving(true);
    return saveCurriculum(next)
      .then((server) => { setCurriculum(normaliseCurriculum(server)); setError(null); return server; })
      .catch((err) => { setError(errorMessage(err)); throw err; })
      .finally(() => setSaving(false));
  }, []);

  return useMemo(() => ({ curriculum, loading, saving, error, mutate }), [curriculum, loading, saving, error, mutate]);
}
