import { useEffect } from 'react';

// A placeholder for a Google AdSense display unit — wired ahead of actually
// applying to AdSense, so the layout, the env vars and the Dockerfile/CI
// plumbing are all in place the moment approval comes through and real slot
// ids exist. Until then this renders nothing: no empty "ad here" box for a
// learner (or an AdSense reviewer looking at the live site pre-approval) to
// see. See the "Ads on Englisher" write-up for the full sequence.
//
// Non-personalized ads only, unconditionally: Englisher's parent-dashboard
// feature (ParentAccess.tsx) means a real share of learners are minors, so
// this treats the whole site as child-directed rather than deciding per
// account. This JS flag is necessary but not sufficient — the site also has
// to be marked child-directed in the AdSense account itself when it's set up
// there; this alone does not satisfy Google's policy requirement.

type AdsByGoogleQueue = Record<string, unknown>[] & { requestNonPersonalizedAds?: number };

declare global {
  interface Window {
    adsbygoogle: AdsByGoogleQueue;
  }
}

export function AdSlot({ slotId }: { slotId?: string }) {
  const client = import.meta.env.VITE_ADSENSE_CLIENT_ID as string | undefined;

  useEffect(() => {
    if (!client || !slotId) return;
    try {
      const queue = (window.adsbygoogle = window.adsbygoogle || []);
      queue.requestNonPersonalizedAds = 1;
      queue.push({});
    } catch {
      // Blocked by the browser, or the loader script hasn't run yet — no ad
      // renders this pass, nothing else to do about it here.
    }
  }, [client, slotId]);

  // Not applied to AdSense yet, or this particular slot isn't configured —
  // render nothing rather than an empty placeholder box.
  if (!client || !slotId) return null;

  return (
    <ins
      className="adsbygoogle"
      style={{ display: 'block' }}
      data-ad-client={client}
      data-ad-slot={slotId}
      data-ad-format="auto"
    />
  );
}
