/** Stands in for the celebration pool until src/animations has files in it. */
export function CelebrationBadge({ size = 120 }: { size?: number }) {
  return (
    <div className="pop-in" style={{ width: size, height: size, borderRadius: '50%', background: 'var(--c-warning-bg)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <svg width={size * 0.5} height={size * 0.5} viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M7 3h10v3a5 5 0 0 1-10 0V3Z" fill="var(--c-warning)" />
        <path d="M12 11v5m-3 3h6" stroke="var(--c-warning-ink)" strokeWidth="2" strokeLinecap="round" />
        <path d="M17 4h3v2a3 3 0 0 1-3 3M7 4H4v2a3 3 0 0 0 3 3" stroke="var(--c-warning)" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </div>
  );
}
