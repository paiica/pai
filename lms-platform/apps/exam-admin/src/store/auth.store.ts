import { create } from "zustand";
import { persist } from "zustand/middleware";

const SESSION_COOKIE = "exam_admin_session";

// A presence flag only — holds no token/secret, so it can't be used to forge
// API access on its own (that still requires the real Bearer token above).
// It exists purely so middleware.ts can redirect a fully logged-out browser
// server-side before any (portal) page's HTML/JS ever ships, instead of
// relying entirely on the client-side useEffect redirect in that layout,
// which only runs after the page has already mounted.
function setSessionCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE}=1; path=/; max-age=${60 * 60 * 24 * 30}; SameSite=Lax`;
}

function clearSessionCookie() {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE}=; path=/; max-age=0`;
}

interface AuthState {
  accessToken: string | null;
  refreshToken: string | null;
  user: { id: string; email: string; role: string; profile?: any } | null;
  _hydrated: boolean;
  setSession: (token: string, refreshToken: string, user: AuthState["user"]) => void;
  setAccessToken: (token: string) => void;
  clear: () => void;
  setHydrated: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      accessToken: null,
      refreshToken: null,
      user: null,
      _hydrated: false,
      setSession: (accessToken, refreshToken, user) => {
        setSessionCookie();
        set({ accessToken, refreshToken, user });
      },
      setAccessToken: (accessToken) => set({ accessToken }),
      clear: () => {
        clearSessionCookie();
        set({ accessToken: null, refreshToken: null, user: null });
      },
      setHydrated: () => set({ _hydrated: true }),
    }),
    {
      name: "exam-admin-auth",
      onRehydrateStorage: () => (state) => { state?.setHydrated(); },
      // The refresh token is long-lived and grants indefinite re-access — it
      // never touches localStorage, only living in memory for the current
      // tab's lifetime. If an XSS reads localStorage (see sanitize.ts for
      // why that's now much harder), the worst it gets is the short-lived
      // access token, not a credential that outlives the session entirely.
      // A page reload past the access token's expiry now requires a fresh
      // login instead of silently refreshing forever — a deliberate
      // usability/security tradeoff without a backend httpOnly-cookie change.
      partialize: (state) => ({ accessToken: state.accessToken, user: state.user }),
    },
  ),
);
