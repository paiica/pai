"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { api, ApiError } from "@/lib/api";

interface UserProfile {
  id: string;
  email: string;
  role: "super_admin" | "admin" | "professor" | "student";
  profile?: {
    first_name: string;
    last_name: string;
    display_name?: string;
    avatar_url?: string;
  };
}

interface AuthState {
  user: UserProfile | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  _hasHydrated: boolean;

  setHasHydrated: (v: boolean) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { email: string; password: string; first_name: string; last_name: string; phone?: string; country?: string; date_of_birth?: string; referral_code?: string }) => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<boolean>;
  fetchMe: () => Promise<void>;
}

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
    // quick succession (e.g. login immediately followed by logout) would
    // have its completion message satisfy the wrong listener and get
    // removed early, reintroducing a narrower version of the onload race.
    if (e.data?.type === "pai-sync-complete" && e.source === iframe.contentWindow) cleanup();
  }
  window.addEventListener("message", onMessage);
  setTimeout(cleanup, 4000);
  document.body.appendChild(iframe);
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isLoading: false,
      _hasHydrated: false,

      setHasHydrated: (v) => set({ _hasHydrated: v }),

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const data = await api.post<{
            data: { user: UserProfile; access_token: string; refresh_token: string };
          }>("/auth/login", { email, password });
          set({
            user: data.data.user,
            accessToken: data.data.access_token,
            refreshToken: data.data.refresh_token,
          });
          // Separate origin in production, so setting this store's own state
          // above doesn't touch the marketing site's independent session at
          // all — only logging in *through* the marketing site (via its
          // ssoLink handoff, which sets state directly rather than calling
          // this action, so this can't loop back on itself) currently syncs
          // the other direction. Push it forward the same way logout()
          // pushes a sign-out forward: a hidden iframe loading the
          // marketing site's own login-sync receiver with the new session.
          if (typeof window !== "undefined") {
            // Must be the canonical host: the bare domain 308-redirects to
          // this one, and a hidden iframe following a cross-subdomain
          // redirect isn't reliable the way a real top-level navigation is
          // — confirmed live: login-sync worked immediately, but
          // logout-sync silently never took effect while pointed at the
          // bare (redirecting) domain.
          const marketingUrl = process.env.NEXT_PUBLIC_MARKETING_URL || "https://www.paii.ca";
            const params = new URLSearchParams({ t: data.data.access_token, r: data.data.refresh_token });
            params.set("u", JSON.stringify(data.data.user));
            syncViaIframe(`${marketingUrl}/auth/login-sync?${params.toString()}`);
          }
        } finally {
          set({ isLoading: false });
        }
      },

      register: async (body) => {
        set({ isLoading: true });
        try {
          await api.post("/auth/register", body);
        } finally {
          set({ isLoading: false });
        }
      },

      logout: async () => {
        const { accessToken, refreshToken } = get();
        try {
          if (accessToken) {
            await api.post("/auth/logout", { refresh_token: refreshToken }, accessToken);
          }
        } catch {}
        set({ user: null, accessToken: null, refreshToken: null });
        // Separate origin in production, so clearing this store's own state
        // above doesn't touch the marketing site's independent session at
        // all. Load its logout-sync page in a hidden iframe so it clears its
        // own localStorage too — mirrors what the marketing site's own
        // logout() does in the other direction.
        if (typeof window !== "undefined") {
          // Must be the canonical host: the bare domain 308-redirects to
          // this one, and a hidden iframe following a cross-subdomain
          // redirect isn't reliable the way a real top-level navigation is
          // — confirmed live: login-sync worked immediately, but
          // logout-sync silently never took effect while pointed at the
          // bare (redirecting) domain.
          const marketingUrl = process.env.NEXT_PUBLIC_MARKETING_URL || "https://www.paii.ca";
          syncViaIframe(`${marketingUrl}/auth/logout-sync`);
        }
      },

      refreshTokens: async () => {
        const { refreshToken } = get();
        if (!refreshToken) return false;
        try {
          const data = await api.post<{
            data: { access_token: string; refresh_token: string };
          }>("/auth/refresh", { refresh_token: refreshToken });
          set({
            accessToken: data.data.access_token,
            refreshToken: data.data.refresh_token,
          });
          return true;
        } catch (err) {
          // Only sign the user out when the refresh token itself is genuinely
          // rejected (401/403). Network errors and 5xx should leave the session
          // intact so a transient backend blip doesn't log the user out.
          if (err instanceof ApiError && (err.status === 401 || err.status === 403)) {
            set({ user: null, accessToken: null, refreshToken: null });
          }
          return false;
        }
      },

      fetchMe: async () => {
        const { accessToken } = get();
        if (!accessToken) return;
        try {
          const data = await api.get<{ data: UserProfile }>("/auth/me", accessToken);
          set({ user: data.data });
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) {
            const refreshed = await get().refreshTokens();
            if (refreshed) {
              const data = await api.get<{ data: UserProfile }>("/auth/me", get().accessToken!);
              set({ user: data.data });
            }
          }
        }
      },
    }),
    {
      name: "pai-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);

// Auto-logout when another context (e.g. marketing-site iframe) clears our localStorage key.
// Zustand's createJSONStorage doesn't subscribe to storage events by default.
// The storage event fires in all same-origin tabs/windows except the one that made the change.
if (typeof window !== "undefined") {
  window.addEventListener("storage", (e) => {
    if (e.key === "pai-auth" && e.newValue === null) {
      useAuthStore.setState({ user: null, accessToken: null, refreshToken: null });
    }
  });
}
