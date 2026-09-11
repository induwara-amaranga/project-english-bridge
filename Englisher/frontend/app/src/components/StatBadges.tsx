import type { CSSProperties } from 'react';

// Shared header pills for XP / coins / level — the same look Roadmap.tsx and
// StageLessons.tsx already used for their XP pill, pulled out so coins and
// level don't have to be re-invented (and re-drift) on every header.

const PILL: CSSProperties = { display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(255,255,255,0.22)', borderRadius: 999, padding: '8px 14px' };

export function XpBadge({ xp, style }: { xp: number; style?: CSSProperties }) {
  return (
    <div style={{ ...PILL, ...style }}>
      <img src="/assets/icons/xp.svg" alt="" width={18} height={18} />
      <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>{xp} XP</span>
    </div>
  );
}

export function CoinsBadge({ coins, style }: { coins: number; style?: CSSProperties }) {
  return (
    <div style={{ ...PILL, ...style }}>
      <img src="/assets/icons/coins.svg" alt="" width={18} height={18} />
      <span style={{ color: 'white', fontWeight: 700, fontSize: 14 }}>{coins}</span>
    </div>
  );
}

/** A level chip with a thin xp-into-level bar underneath it, sized to sit next to the XP pill. */
export function LevelBadge({ level, xpIntoLevel, xpForNextLevel, style }: {
  level: number; xpIntoLevel: number; xpForNextLevel: number; style?: CSSProperties;
}) {
  const pct = xpForNextLevel > 0 ? Math.min(100, Math.round((xpIntoLevel / xpForNextLevel) * 100)) : 100;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: 'rgba(255,255,255,0.22)', borderRadius: 999, padding: '6px 14px 6px 8px', ...style }}>
      <div style={{ width: 22, height: 22, borderRadius: '50%', background: '#FFD976', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#5B3A00', fontWeight: 800, fontSize: 12, flexShrink: 0 }}>{level}</div>
      <div>
        <div style={{ width: 54, height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.3)', overflow: 'hidden' }}>
          <div style={{ height: '100%', borderRadius: 999, background: 'white', width: `${pct}%` }} />
        </div>
      </div>
    </div>
  );
}
