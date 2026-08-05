"use client";

import { useEffect } from "react";

// Loaded in a hidden iframe by the student portal's logout() — clears this
// origin's own session so the two apps' independent localStorage copies
// (see auth-context.tsx) don't drift out of sync when this app wasn't the
// one that initiated the sign-out. Any other open tabs on this origin pick
// the change up via auth-context.tsx's own `storage` event listener.
//
// This route is carved out of the site-wide X-Frame-Options: DENY policy
// (see next.config.ts) with a scoped Content-Security-Policy that only
// allows framing from the student portal's own origin — nothing else on
// the site should ever be embeddable.
export default function LogoutSyncPage() {
  useEffect(() => {
    localStorage.removeItem("pai-auth");
  }, []);

  return null;
}
