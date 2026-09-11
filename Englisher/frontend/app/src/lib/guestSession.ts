// Whether the current browser is in guest-preview mode — no backend account,
// no JWT, nothing sent over the wire until the guest actually signs up (see
// domain/guestProgress.ts and SignUp.tsx). Lives outside React state, the
// same way apiClient.ts owns the access token, so a plain domain module (or
// a route guard) can read it without needing a hook.

const KEY = 'englisher.guestMode.v1';

export function isGuestActive(): boolean {
  try {
    return localStorage.getItem(KEY) === '1';
  } catch {
    return false;
  }
}

export function setGuestActive(active: boolean): void {
  try {
    if (active) localStorage.setItem(KEY, '1');
    else localStorage.removeItem(KEY);
  } catch {
    // Private mode or a full quota — guest mode just won't survive a reload.
  }
}
