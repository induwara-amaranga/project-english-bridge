// ---------------------------------------------------------------------------
// PARENT ACCESS LINK
//
// A parent never signs up on their own and is never given the child's login.
// The child (or their school) owns the account, and invites a parent to view
// progress:
//
//   1. Child creates an account, or receives one from a school.
//   2. Child enters a parent's email address or phone number.
//   3. The parent receives an invitation.
//   4. Once accepted, the parent can view the child's progress.
//
// Only step 4 unlocks the parent dashboard, so the dashboard is never reachable
// by URL alone — it checks this record on load.
//
// In production this is a row in a `parent_links` table (child_id, contact,
// status, invited_at, accepted_at) and the invitation is a signed, expiring
// token sent by email/SMS. Here it ships as localStorage so the static
// prototype pages can share one state.
// ---------------------------------------------------------------------------
var PARENT_KEY = 'englisher.parentLink';

// status: 'none' | 'invited' | 'accepted'
window.PARENT_LINK_DEFAULT = { status: 'none', contact: '', channel: '', invitedAt: null, acceptedAt: null };

window.loadParentLink = function () {
  try {
    var raw = window.localStorage.getItem(PARENT_KEY);
    if (raw) return JSON.parse(raw);
  } catch (e) { /* storage blocked — fall through to the default */ }
  return JSON.parse(JSON.stringify(window.PARENT_LINK_DEFAULT));
};

window.saveParentLink = function (link) {
  try {
    window.localStorage.setItem(PARENT_KEY, JSON.stringify(link));
    return true;
  } catch (e) {
    return false;
  }
};

// An invitation goes to exactly one of the two channels, so the same field
// accepts either and the channel is inferred rather than asked for twice.
window.parentContactChannel = function (value) {
  var v = String(value == null ? '' : value).trim();
  if (!v) return '';
  if (v.indexOf('@') !== -1) return /^[^@\s]+@[^@\s.]+\.[^@\s]{2,}$/.test(v) ? 'email' : '';
  var digits = v.replace(/[\s()\-.]/g, '');
  return /^\+?\d{9,15}$/.test(digits) ? 'phone' : '';
};
