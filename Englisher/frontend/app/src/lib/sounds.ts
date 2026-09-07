// UI feedback sounds — static clips shipped with the frontend build (see
// public/sounds/README.md), not fetched from the API. They never vary per
// user, so there is nothing for the backend to serve.

const SOUND_FILES = {
  correct: '/sounds/correct.wav',
  wrong: '/sounds/wrong.wav',
  lessonComplete: '/sounds/lesson-complete.wav',
  courseComplete: '/sounds/course-complete.wav',
} as const;

export type SoundName = keyof typeof SOUND_FILES;

const cache = new Map<SoundName, HTMLAudioElement>();

const MUTE_KEY = 'englisher:sound-muted';

/** A per-device preference, not an account setting — nothing here for the backend to serve either. */
export function isSoundMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setSoundMuted(muted: boolean): void {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
  } catch {
    // Private browsing or a full quota — the preference just won't persist.
  }
}

/** Best-effort playback — a missing file or a browser autoplay block should never break the app. */
export function playSound(name: SoundName): void {
  if (isSoundMuted()) return;
  let audio = cache.get(name);
  if (!audio) {
    audio = new Audio(SOUND_FILES[name]);
    cache.set(name, audio);
  }
  audio.currentTime = 0;
  audio.play().catch(() => {});
}
