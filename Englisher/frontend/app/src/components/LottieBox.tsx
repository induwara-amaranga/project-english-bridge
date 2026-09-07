import { Suspense, lazy, useEffect, useState, type ReactNode } from 'react';
import { getCachedAnimation, loadAnimation } from '../lib/animations';

// The player is ~500 KB, so it is split out — an empty src/animations folder
// costs nothing, and the exercise pages do not carry the engine just in case.
// LottieSvg is the svg-only build: it drops lottie-web's canvas and html
// renderers while keeping expression support, which LottieFiles exports often
// rely on. The import() runs as soon as this module does, in parallel with
// whichever animation JSON loads first, rather than only starting once that
// JSON has already resolved — chaining the two would let a short-lived
// overlay's Suspense boundary hit the fallback a second time, after the data
// was already in, while the player chunk was still the one in flight.
const lottieModule = import('lottie-react');
const LottiePlayer = lazy(() => lottieModule.then((m) => ({ default: m.LottieSvg })));

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

/**
 * Plays a Lottie animation from src/animations by name, falling back to
 * `fallback` whenever that file has not been added yet — so a screen designed
 * around an animation still looks finished with an empty animations folder.
 */
export function LottieBox({ name, size = 200, loop = false, fallback = null }: {
  name: string | null;
  size?: number;
  loop?: boolean;
  fallback?: ReactNode;
}) {
  const [data, setData] = useState<object | null>(() => getCachedAnimation(name));

  useEffect(() => {
    let alive = true;
    // Only drop back to the fallback if this name hasn't already resolved
    // elsewhere — otherwise a remount (or a second LottieBox playing the same
    // animation, like the roadmap header and the travel transition both
    // playing `rocket`) would flash the fallback back in for no reason.
    if (!getCachedAnimation(name)) setData(null);
    loadAnimation(name).then((d) => { if (alive) setData(d); });
    return () => { alive = false; };
  }, [name]);

  return (
    <div style={{ width: size, height: size, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }} aria-hidden="true">
      {data
        ? (
          <Suspense fallback={fallback}>
            <LottiePlayer src={data} loop={loop} autoplay={!reducedMotion()} style={{ width: '100%', height: '100%' }} />
          </Suspense>
        )
        : fallback}
    </div>
  );
}
