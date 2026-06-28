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
