import { useEffect, useState, type ReactNode } from 'react';

interface PageTransitionProps {
  visible: boolean;
  label: string;
  background?: string;
  children: ReactNode;
}

const FADE_MS = 380;
const DEFAULT_BG = 'linear-gradient(160deg, var(--c-primary) 0%, var(--c-primary-hover) 100%)';

/**
 * A full-screen overlay that bridges two screens so a change reads as a
 * transition rather than a hard cut. Purely presentational — the caller
 * decides when to flip `visible` and for how long:
 *
 *   - TravelTransition (Roadmap → a stage's lessons) sets it and navigates a
 *     beat later, while the overlay is still fully opaque, so the route swap
 *     underneath is never actually seen.
 *   - The exercise player's "checking your answers" overlay flips it false
 *     once the real completion screen is already mounted behind it, so
 *     leaving is a cross-fade rather than a pop.
 *
 * `FADE_MS` matches the CSS transition duration below — a plain timeout
 * rather than `transitionend`, since that event does not reliably fire once
 * `prefers-reduced-motion` collapses the transition to nothing.
 */
export function PageTransition({ visible, label, background = DEFAULT_BG, children }: PageTransitionProps) {
  const [mounted, setMounted] = useState(visible);
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (visible) {
      setMounted(true);
      const raf = requestAnimationFrame(() => setEntered(true));
      return () => cancelAnimationFrame(raf);
    }
    setEntered(false);
    const t = setTimeout(() => setMounted(false), FADE_MS);
    return () => clearTimeout(t);
  }, [visible]);

  if (!mounted) return null;

  return (
    <div className={`page-transition${entered ? ' page-transition--in' : ''}`} style={{ background }} role="status" aria-live="polite">
      {children}
      <div className="page-transition__label">{label}</div>
    </div>
  );
}
