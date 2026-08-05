"use client";

import { useEffect } from "react";

const AUTH_KEY = "pai-auth";

// Loaded in a hidden iframe by the student portal's login() — sets this
// origin's own session so a direct login on the student portal (not
// through the marketing site's own ssoLink handoff) still shows up here
// too. Just writes to localStorage and lets auth-context.tsx's own
// `storage` event listener pick the change up in any already-open tab on
// this origin, the same way it already does for logout-sync; this page
// itself renders nothing and doesn't need its own copy of that logic.
//
// URLSearchParams.get() already URL-decodes — do not add another
// decodeURIComponent() here (see the /auth/sso fix on the student portal
// for exactly what that bug looked like: a valid session treated as
// logged-out because the profile JSON failed to parse).
export default function LoginSyncPage() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const t = params.get("t");
    const r = params.get("r");
    const uRaw = params.get("u");
    if (!t) return;

    let user = null;
    try { if (uRaw) user = JSON.parse(uRaw); } catch {}

    localStorage.setItem(AUTH_KEY, JSON.stringify({
      state: { user, accessToken: t, refreshToken: r || null },
      version: 0,
    }));
  }, []);

  return null;
}
