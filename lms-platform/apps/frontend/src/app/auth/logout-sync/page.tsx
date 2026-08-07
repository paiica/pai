"use client";

import { useEffect } from "react";

// Loaded in a hidden iframe by the marketing site's logout() — clears this
// origin's own session so the two apps' independent localStorage copies
// (see auth.store.ts) don't drift out of sync when the student portal
// wasn't the one that initiated the sign-out. Any other open tabs on this
// origin pick the change up via the native `storage` event, the same way
// auth.store.ts already handles its own cross-tab sync.
export default function LogoutSyncPage() {
  useEffect(() => {
    localStorage.removeItem("pai-auth");
    // Tells the parent it's safe to remove this iframe now — onload alone
    // fires once the document loads, before this effect runs, so removing
    // on onload can kill the iframe before the localStorage write above
    // ever happens (see the syncViaIframe fix on the sender side).
    try { window.parent.postMessage({ type: "pai-sync-complete" }, "*"); } catch {}
  }, []);

  return null;
}
