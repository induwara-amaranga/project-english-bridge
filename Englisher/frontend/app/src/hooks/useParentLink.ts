import { useCallback, useEffect, useState } from 'react';
import { PARENT_LINK_DEFAULT, inviteParent, loadParentLink, resendParentInvite, revokeParentLink } from '../domain/parentLink';
import { errorMessage } from '../lib/apiClient';
import type { ParentLink } from '../domain/parentLink';

export function useParentLink() {
  const [link, setLink] = useState<ParentLink>(PARENT_LINK_DEFAULT);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    loadParentLink()
      .then((l) => { if (alive) setLink(l); })
      .catch((err) => { if (alive) setError(errorMessage(err)); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, []);

  const invite = useCallback(async (contact: string) => {
    const l = await inviteParent(contact);
    setLink(l);
    return l;
  }, []);

  const resend = useCallback(async () => {
    const l = await resendParentInvite();
    setLink(l);
    return l;
  }, []);

  const revoke = useCallback(async () => {
    const l = await revokeParentLink();
    setLink(l);
    return l;
  }, []);

  return { link, loading, error, invite, resend, revoke };
}
