"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";

export default function SSOPage() {
  const router = useRouter();

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const t    = urlParams.get("t");
    const r    = urlParams.get("r");
    const uRaw = urlParams.get("u");
    const next = urlParams.get("next") || "/dashboard";

    if (t) {
      // URLSearchParams.get() already URL-decodes — re-decoding an already-
      // decoded string here used to throw on any literal "%" in the JSON
      // (an email, a name, ...), silently caught, leaving `user` null. A
      // null user with a perfectly valid token then got treated as "not
      // logged in" by AuthGuard, which sent people straight back to
      // /login — every single time this page ran. Parse without the extra
      // decode as a same-tick fallback, but don't lean on it: fetchMe()
      // below refetches the real profile from the API regardless, so a
      // parse failure here just means a one-frame flash of no profile data,
      // not a bad session.
      let user = null;
      try { if (uRaw) user = JSON.parse(uRaw); } catch {}

      localStorage.setItem("pai-auth", JSON.stringify({
        state: { user, accessToken: t, refreshToken: r || null },
        version: 0,
      }));

      useAuthStore.setState({
        user,
        accessToken: t,
        refreshToken: r || null,
        _hasHydrated: true,
      });

      useAuthStore.getState().fetchMe();

      router.replace(next);
    } else {
      // No token — send to login
      router.replace("/login");
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-navy-900">
      <div className="w-8 h-8 rounded-full border-2 border-gold-400 border-t-transparent animate-spin" />
    </div>
  );
}
