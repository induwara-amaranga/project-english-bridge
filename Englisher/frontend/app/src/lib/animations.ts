// Lottie animation registry.
//
// Files live in src/animations/*.json and are found at build time by Vite's
// import.meta.glob, so dropping a new .json in that folder is the whole job of
// adding an animation — see that folder's README. The glob is lazy, so each
// animation is its own chunk and a screen only downloads the one it plays.
//
// Everything here tolerates an empty folder: the callers render a drawn
// fallback when `loadAnimation` resolves to null.

const modules = import.meta.glob('../animations/*.json') as Record<string, () => Promise<{ default: unknown }>>;

const byName: Record<string, () => Promise<{ default: unknown }>> = {};
for (const path of Object.keys(modules)) {
  const file = path.split('/').pop() || '';
  byName[file.replace(/\.json$/i, '')] = modules[path];
}

/** The two outcome animations, matched by filename. */
export const CORRECT = 'correct';
export const WRONG = 'wrong';
/** The roadmap's and the travel transition's rocket — a fixed role, like the two above, not a celebration pick. */
export const ROCKET = 'rocket';

const RESERVED = new Set([CORRECT, WRONG, ROCKET]);

/** Every animation that isn't reserved for a fixed spot — the pool the celebration screens draw from. */
export function celebrationNames(): string[] {
  return Object.keys(byName).filter((n) => !RESERVED.has(n)).sort();
}

/** A random celebration, or null while the folder has none yet. */
export function randomCelebration(): string | null {
  const pool = celebrationNames();
  if (pool.length === 0) return null;
  return pool[Math.floor(Math.random() * pool.length)];
}

export function hasAnimation(name: string | null | undefined): boolean {
  return !!name && name in byName;
}

// Keyed by name, once a file has been fetched and parsed — so a second
// LottieBox playing the same animation (the roadmap header and the travel
// transition both play `rocket`, for instance) can render it on its very
// first frame instead of starting from the fallback and flashing over to
// the animation a moment later.
const resolved = new Map<string, object | null>();

/** Whatever `loadAnimation` has already resolved for this name, synchronously — null until then. */
export function getCachedAnimation(name: string | null | undefined): object | null {
  return (name && resolved.get(name)) || null;
}

/** The parsed Lottie document, or null when no such file has been added. */
export async function loadAnimation(name: string | null | undefined): Promise<object | null> {
  if (!name || !(name in byName)) return null;
  const cached = resolved.get(name);
  if (cached !== undefined) return cached;
  try {
    const mod = await byName[name]();
    const data = mod.default;
    const parsed = data && typeof data === 'object' ? (data as object) : null;
    resolved.set(name, parsed);
    return parsed;
  } catch {
    // A malformed .json should degrade to the drawn fallback, not blank the screen.
    return null;
  }
}
