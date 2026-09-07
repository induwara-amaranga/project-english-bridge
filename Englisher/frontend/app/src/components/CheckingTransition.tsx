import { PageTransition } from './PageTransition';

/**
 * Shown while the exercise player grades a finished lesson. Deliberately its
 * own visual rather than the celebration animation — that one is the payoff
 * on the screen right behind this, and repeating it here would spend the
 * surprise before the reveal.
 */
export function CheckingTransition({ visible, label }: { visible: boolean; label: string }) {
  return (
    <PageTransition visible={visible} label={label}>
      <div className="checking-badge" aria-hidden="true">
        <span className="checking-badge__ring" />
        <span className="checking-badge__core">
          <svg width="26" height="26" viewBox="0 0 22 22" fill="none"><path d="M5 11.5L9.5 16L17 6" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" /></svg>
        </span>
      </div>
    </PageTransition>
  );
}
