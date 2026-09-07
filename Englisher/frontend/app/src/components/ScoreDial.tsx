import { useEffect, useState } from 'react';

/** Score as a ring that fills on mount — the lesson- and course-complete headline. */
export function ScoreDial({ pct, size = 136, label }: { pct: number; size?: number; label?: string }) {
  // Starts empty and fills once mounted, so the ring animates to the score
  // instead of appearing already at it.
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(pct));
    return () => cancelAnimationFrame(id);
  }, [pct]);

  const stroke = 13;
  const r = (size - stroke) / 2;
  const circumference = 2 * Math.PI * r;
  const colour = pct >= 80 ? 'var(--c-success)' : pct >= 50 ? 'var(--c-warning)' : 'var(--c-danger)';

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }} aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--c-primary-tint)" strokeWidth={stroke} />
        <circle
          cx={size / 2} cy={size / 2} r={r} fill="none" stroke={colour} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference - (circumference * shown) / 100}
          style={{ transition: 'stroke-dashoffset 900ms cubic-bezier(0.22, 0.61, 0.36, 1)' }}
        />
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 2 }}>
        <span className="count-up" style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: Math.round(size * 0.27), lineHeight: 1, color: 'var(--c-ink)' }}>{pct}%</span>
        {label && <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.05em', color: 'var(--c-ink-soft)' }}>{label}</span>}
      </div>
    </div>
  );
}
