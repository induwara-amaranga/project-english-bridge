// Onboarding (Goal → Language → Streak → Walkthrough) runs before there is
// any account to attach answers to — same reason guestProgress.ts exists.
// Each screen stashes its pick here; SignUp.tsx pushes the whole thing to
// PUT /api/me/preferences once the account is real, then clears it. Until
// that lands, AuthController's /me/preferences comment was right: these
// answers were being collected and thrown away.

export interface OnboardingAnswers {
  /** A stable slug, not the displayed label — the label is re-translated per UI language, this isn't. */
  goal?: 'exam' | 'job' | 'travel' | 'self';
  courseLanguage?: 'en' | 'si';
  streakGoalDays?: number;
}

const KEY = 'englisher.onboardingAnswers.v1';

export function saveOnboardingAnswer(patch: Partial<OnboardingAnswers>): void {
  try {
    localStorage.setItem(KEY, JSON.stringify({ ...loadOnboardingAnswers(), ...patch }));
  } catch {
    // Out of quota or blocked — the answer just won't survive to signup.
  }
}

export function loadOnboardingAnswers(): OnboardingAnswers {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function clearOnboardingAnswers(): void {
  try {
    localStorage.removeItem(KEY);
  } catch {
    // Nothing left to clean up if storage is already unavailable.
  }
}
