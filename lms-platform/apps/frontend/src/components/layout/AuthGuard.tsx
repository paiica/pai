"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuthStore } from "@/store/auth.store";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  // A session is defined by having a token, not by already having a
  // resolved user profile object — e.g. right after the SSO handoff from
  // the marketing site, the token is valid immediately but the profile is
  // still being fetched (or a page reload happens before that finishes).
  // Gating on `user` instead bounced people with perfectly valid sessions
  // straight back to /login any time it happened to be momentarily null.
  const { accessToken, _hasHydrated } = useAuthStore();

  useEffect(() => {
    if (_hasHydrated && !accessToken) {
      router.replace("/login");
    }
  }, [_hasHydrated, accessToken]);

  if (!_hasHydrated) return null;
  if (!accessToken) return null;

  return <>{children}</>;
}
