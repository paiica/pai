"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { getRefCookie } from "@/lib/referral";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
const LMS = process.env.NEXT_PUBLIC_LMS_URL || "https://learn.paii.ca";
const AUTH_KEY = "pai-auth";

// Hidden iframes sync auth state to the other origin without a real
// navigation. iframe.onload only guarantees the framed document has
// loaded — for a Next.js page that's before React hydrates and its
// useEffect runs, so removing the iframe right on onload can kill it
// before the sync page ever gets to write/clear localStorage (confirmed
// live: this silently dropped logout-sync every time). Wait for the sync
// page's own "done" postMessage instead, with a timeout fallback so a
// blocked or unusually slow load can't leave the iframe stuck forever.
function syncViaIframe(url: string) {
  const iframe = document.createElement("iframe");
  iframe.src = url;
  iframe.style.display = "none";
  let done = false;
  function cleanup() {
    if (done) return;
    done = true;
    window.removeEventListener("message", onMessage);
    iframe.remove();
  }
  function onMessage(e: MessageEvent) {
    // Scoped to this iframe specifically — otherwise a second sync fired in
    // quick succession (e.g. logout immediately followed by login) would
    // have its completion message satisfy the wrong listener and get
    // removed early, reintroducing a narrower version of the onload race.
    if (e.data?.type === "pai-sync-complete" && e.source === iframe.contentWindow) cleanup();
  }
  window.addEventListener("message", onMessage);
  setTimeout(cleanup, 4000);
  document.body.appendChild(iframe);
}

type UserProfile = {
  id: string;
  email: string;
  role: string;
  profile?: { first_name: string; last_name: string; avatar_url?: string; language?: string };
};

type LoginResult = { user: UserProfile; accessToken: string; refreshToken: string };

type AuthContextType = {
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  hydrated: boolean;
  login: (email: string, password: string) => Promise<LoginResult>;
  logout: () => void;
  ssoLink: (path: string) => string;
};

const AuthContext = createContext<AuthContextType>({
  user: null, accessToken: null, refreshToken: null, hydrated: false,
  login: async () => ({} as LoginResult), logout: () => {}, ssoLink: (path) => `${LMS}${path}`,
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser]                   = useState<UserProfile | null>(null);
  const [accessToken, setAccessToken]     = useState<string | null>(null);
  const [refreshToken, setRefreshToken]   = useState<string | null>(null);
  const [hydrated, setHydrated]           = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(AUTH_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const state  = parsed.state ?? parsed;
        setUser(state.user ?? null);
        setAccessToken(state.accessToken ?? null);
        setRefreshToken(state.refreshToken ?? null);
      }
    } catch {}
    setHydrated(true);
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const res = await fetch(`${API}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Login failed");
    const { user: u, access_token, refresh_token } = data.data;
    localStorage.setItem(AUTH_KEY, JSON.stringify({
      state: { user: u, accessToken: access_token, refreshToken: refresh_token },
      version: 0,
    }));
    setUser(u);
    setAccessToken(access_token);
    setRefreshToken(refresh_token);
    return { user: u, accessToken: access_token, refreshToken: refresh_token };
  }, []);

  // In local dev, both apps share one origin (student portal proxied at
  // /lms/*), so localStorage is naturally shared and a plain link would be
  // enough. In production they're on separate origins (paii.ca vs
  // learn.paii.ca) — a plain link lands the student portal on its own login
  // page with no idea who you are. Route through its /auth/sso receiver
  // instead, handing off the current session via URL params (one-time, not
  // a standing link between the sessions — see the logout() comment below).
  // The affiliate ref code rides along inside `next` (rather than as its own
  // top-level param) purely so it survives to the final destination without
  // the /auth/sso page needing to know anything about referral tracking.
  const ssoLink = useCallback((path: string) => {
    const ref = getRefCookie();
    const targetPath = ref
      ? `${path}${path.includes("?") ? "&" : "?"}ref=${encodeURIComponent(ref)}`
      : path;

    if (!accessToken) return `${LMS}${targetPath}`;

    const params = new URLSearchParams({ t: accessToken, next: targetPath });
    if (refreshToken) params.set("r", refreshToken);
    if (user) params.set("u", JSON.stringify(user));
    return `${LMS}/auth/sso?${params.toString()}`;
  }, [accessToken, refreshToken, user]);

  const logout = useCallback(() => {
    const token = accessToken;
    localStorage.removeItem(AUTH_KEY);
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    if (token) {
      fetch(`${API}/auth/logout`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ refresh_token: null }),
      }).catch(() => {});
    }
    // Separate origin in production, so clearing this app's own localStorage
    // above doesn't touch the student portal's session at all. Load its
    // logout-sync page in a hidden iframe so it clears its own localStorage
    // too (that origin, in turn, notifies any other open student-portal tabs
    // the normal way — via the native `storage` event, which fires for every
    // other browsing context on that origin once its localStorage changes).
    syncViaIframe(`${LMS}/auth/logout-sync`);
  }, [accessToken]);

  // Mirrors auth.store.ts's cross-tab sync on the student portal side —
  // catches this app's own other open tabs signing in/out, and the student
  // portal's login-sync/logout-sync iframes (above) writing to this
  // origin's localStorage from the other direction, so an already-open
  // marketing-site tab updates live instead of only on next page load.
  useEffect(() => {
    function onStorage(e: StorageEvent) {
      if (e.key !== AUTH_KEY) return;
      if (e.newValue === null) {
        setUser(null);
        setAccessToken(null);
        setRefreshToken(null);
        return;
      }
      try {
        const parsed = JSON.parse(e.newValue);
        const state = parsed.state ?? parsed;
        setUser(state.user ?? null);
        setAccessToken(state.accessToken ?? null);
        setRefreshToken(state.refreshToken ?? null);
      } catch {}
    }
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  return (
    <AuthContext.Provider value={{ user, accessToken, refreshToken, hydrated, login, logout, ssoLink }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
