import { useCallback, useState } from 'react';
import { getParentLink, setParentLink } from '../lib/storage';
import type { ParentLink } from '../domain/parentLink';

export function useParentLink() {
  const [link, setState] = useState<ParentLink>(() => getParentLink());

  const update = useCallback((next: ParentLink) => {
    setParentLink(next);
    setState(next);
  }, []);

  return { link, update };
}
