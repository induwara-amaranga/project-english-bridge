import { useCallback, useMemo, useState } from 'react';
import { normaliseCurriculum } from '../domain/curriculum';
import { getCurriculum, setCurriculum } from '../lib/storage';
import type { Curriculum } from '../domain/types';

/** Curriculum, normalised on read (idempotent — see curriculum.test.ts). */
export function useCurriculum() {
  const [curriculum, setState] = useState<Curriculum>(() => normaliseCurriculum(getCurriculum()));

  const save = useCallback((next: Curriculum) => {
    setCurriculum(next);
    setState(next);
  }, []);

  const mutate = useCallback((mutator: (draft: Curriculum) => void) => {
    setState((prev) => {
      const next: Curriculum = JSON.parse(JSON.stringify(prev));
      mutator(next);
      setCurriculum(next);
      return next;
    });
  }, []);

  return useMemo(() => ({ curriculum, save, mutate }), [curriculum, save, mutate]);
}
