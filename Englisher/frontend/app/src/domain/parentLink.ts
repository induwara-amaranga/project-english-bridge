// ---------------------------------------------------------------------------
// PARENT ACCESS LINK — ported from parent-link.js unchanged in behaviour.
//
// A parent never signs up on their own and is never given the child's login.
// The child invites a parent by email/phone; only after the parent accepts
// does the dashboard unlock. In production this is a row in a `parent_links`
// table (child_id, contact, status, invited_at, accepted_at) with a signed,
// expiring invitation token. Here it is one `localStorage` key.
// ---------------------------------------------------------------------------

export type ParentLinkStatus = 'none' | 'invited' | 'accepted';

export interface ParentLink {
  status: ParentLinkStatus;
  contact: string;
  channel: '' | 'email' | 'phone';
  invitedAt: number | null;
  acceptedAt: number | null;
}

const KEY = 'englisher.parentLink';

export const PARENT_LINK_DEFAULT: ParentLink = { status: 'none', contact: '', channel: '', invitedAt: null, acceptedAt: null };

export function loadParentLink(): ParentLink {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw) as ParentLink;
  } catch {
    /* storage blocked — fall through to the default */
  }
  return JSON.parse(JSON.stringify(PARENT_LINK_DEFAULT)) as ParentLink;
}

export function saveParentLink(link: ParentLink): boolean {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(link));
    return true;
  } catch {
    return false;
  }
}

/** An invitation goes to exactly one of the two channels — inferred, not asked for twice. */
export function parentContactChannel(value: string): '' | 'email' | 'phone' {
  const v = String(value == null ? '' : value).trim();
  if (!v) return '';
  if (v.indexOf('@') !== -1) return /^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/.test(v) ? 'email' : '';
  const digits = v.replace(/[\s()\-.]/g, '');
  return /^\+?\d{9,15}$/.test(digits) ? 'phone' : '';
}
