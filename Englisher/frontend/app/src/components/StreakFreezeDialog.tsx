import { useEffect, useRef, useState } from 'react';
import { useProgress } from '../hooks/useProgress';
import {
  buyStreakFreeze, dismissBrokenStreak, repairStreak,
  STREAK_AT_RISK_WINDOW_MS, STREAK_FREEZE_COST_COINS, STREAK_REPAIR_COST_COINS,
} from '../domain/progress';
import { errorMessage } from '../lib/apiClient';

type DialogMode = 'broken' | 'at-risk';

/** One at-risk nudge per expiry instant — re-checking sessionStorage after a redeploy or new tab is fine, it just means one more nudge. */
const AT_RISK_DISMISS_KEY = 'englisher.streakAtRiskDismissedFor';

/**
 * Mounted once per signed-in student session (see RequireRole). Surfaces two
 * moments the learner would otherwise only discover as a smaller streak
 * number somewhere: their streak already broke since the last visit (server
 * says so via `lastBrokenStreak`), or the grace window is about to close
 * while they are still on the site — polled against the server's own
 * `streakExpiresAtISO` rather than guessing a local midnight, so it always
 * agrees with ProgressService's math.
 */
export function StreakFreezeDialog() {
  const { progress, loading, setProgress } = useProgress();
  const [mode, setMode] = useState<DialogMode | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shownBrokenAt = useRef<string | null>(null);

  useEffect(() => {
    if (loading || mode) return;
    if (progress.lastBrokenStreak > 0 && shownBrokenAt.current !== progress.streakBrokenAtISO) {
      shownBrokenAt.current = progress.streakBrokenAtISO;
      setError(null);
      setMode('broken');
    }
  }, [loading, mode, progress.lastBrokenStreak, progress.streakBrokenAtISO]);

  useEffect(() => {
    if (loading || mode) return;
    if (progress.lastBrokenStreak > 0 || !progress.streakExpiresAtISO) return;
    const expiresAtISO = progress.streakExpiresAtISO;
    const expiresAt = new Date(expiresAtISO).getTime();

    const check = () => {
      if (expiresAt - Date.now() > STREAK_AT_RISK_WINDOW_MS) return;
      let dismissedFor: string | null = null;
      try { dismissedFor = sessionStorage.getItem(AT_RISK_DISMISS_KEY); } catch { /* private mode — just re-shows next tick */ }
      if (dismissedFor === expiresAtISO) return;
      setMode('at-risk');
    };
    check();
    const id = setInterval(check, 60_000);
    return () => clearInterval(id);
  }, [loading, mode, progress.lastBrokenStreak, progress.streakExpiresAtISO]);

  if (!mode) return null;

  const close = () => { setMode(null); setError(null); };

  const dismiss = async () => {
    if (mode === 'at-risk') {
      try { sessionStorage.setItem(AT_RISK_DISMISS_KEY, progress.streakExpiresAtISO || ''); } catch { /* nothing to persist without storage */ }
      close();
      return;
    }
    setBusy(true);
    try {
      setProgress(await dismissBrokenStreak());
    } catch {
      // Best-effort — closing locally is enough even if the server call fails.
    } finally {
      setBusy(false);
      close();
    }
  };

  const buy = async () => {
    setBusy(true);
    setError(null);
    try {
      setProgress(mode === 'broken' ? await repairStreak() : await buyStreakFreeze());
      close();
    } catch (err) {
      setError(errorMessage(err));
      setBusy(false);
    }
  };

  const cost = mode === 'broken' ? STREAK_REPAIR_COST_COINS : STREAK_FREEZE_COST_COINS;
  const canAfford = progress.coins >= cost;

  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 80, background: 'rgba(20,16,40,0.55)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20 }}>
      <div className="card screen-in" style={{ maxWidth: 360, width: '100%', textAlign: 'center', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {mode === 'broken' ? (
          <>
            <div style={{ fontSize: 40 }} aria-hidden>💔</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, margin: 0 }}>
              Your {progress.lastBrokenStreak}-day streak was lost
            </h2>
            <p style={{ fontSize: 14, color: 'var(--c-ink-soft)', fontWeight: 600, margin: 0 }}>
              Repair it for {STREAK_REPAIR_COST_COINS} coins and pick up right where you left off.
            </p>
          </>
        ) : (
          <>
            <div style={{ fontSize: 40 }} aria-hidden>⚠️</div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: 20, margin: 0 }}>
              Your {progress.streakDays}-day streak is about to expire!
            </h2>
            <p style={{ fontSize: 14, color: 'var(--c-ink-soft)', fontWeight: 600, margin: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
              {progress.streakFreezes > 0 ? (
                <>
                  <img src="/assets/icons/streak_freeze.svg" alt="" width={16} height={16} />
                  You have {progress.streakFreezes} freeze{progress.streakFreezes === 1 ? '' : 's'} available — or buy another for {STREAK_FREEZE_COST_COINS} coins.
                </>
              ) : (
                `Buy a streak freeze for ${STREAK_FREEZE_COST_COINS} coins to protect it if you miss today.`
              )}
            </p>
          </>
        )}

        {error && <div style={{ fontSize: 13, color: 'var(--c-danger)', fontWeight: 600 }}>{error}</div>}
        {!canAfford && !error && (
          <div style={{ fontSize: 12, color: 'var(--c-ink-faint)', fontWeight: 600 }}>Not enough coins yet — {cost - progress.coins} more to go.</div>
        )}

        <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginTop: 4 }}>
          <button onClick={dismiss} disabled={busy} className="btn btn--secondary" style={{ flex: 1 }}>Dismiss</button>
          <button
            onClick={buy}
            disabled={busy || !canAfford}
            className="btn btn--primary"
            style={{ flex: 1, opacity: busy || !canAfford ? 0.5 : 1 }}
          >
            {busy ? 'Please wait…' : mode === 'broken' ? `Repair (${cost})` : `Buy (${cost})`}
          </button>
        </div>
      </div>
    </div>
  );
}
