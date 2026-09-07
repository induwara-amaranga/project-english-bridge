import { PageTransition } from './PageTransition';
import { LottieBox } from './LottieBox';
import { ROCKET } from '../lib/animations';

// A handful of fixed positions rather than random ones, so they don't jump
// around on every re-render — the same reasoning as Roadmap's own star field.
const STARS = Array.from({ length: 14 }, (_, i) => ({ top: (i * 41) % 100, left: (i * 67) % 100, delay: (i % 5) * 0.3 }));

/** Shown while the roadmap hands off to a course's lessons page. Always visible while mounted — the parent controls mounting, not fading it back out. */
export function TravelTransition({ label }: { label: string }) {
  return (
    <PageTransition visible label={label} background="linear-gradient(165deg, #1B1730 0%, #2B2140 45%, var(--c-primary-hover) 100%)">
      <div className="travel-transition__stars" aria-hidden="true">
        {STARS.map((s, i) => (
          <span key={i} className="travel-transition__star" style={{ top: `${s.top}%`, left: `${s.left}%`, animationDelay: `${s.delay}s` }} />
        ))}
      </div>
      {/* The launch-and-hover motion (rocket-launch, float-node) lives on this
          wrapper, not the Lottie itself, so it still plays even while the
          animations folder is empty and the plain image fallback is showing. */}
      <div className="travel-transition__rocket">
        <LottieBox name={ROCKET} size={72} loop fallback={<img src="/assets/rocket_ship.png" alt="" style={{ width: '100%', height: 'auto', objectFit: 'contain' }} />} />
      </div>
    </PageTransition>
  );
}
