"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { api, ApiError } from "@/lib/api";
import type { OrgUser } from "@/types";

interface AuthState {
  user: OrgUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  _hasHydrated: boolean;

  setHasHydrated: (v: boolean) => void;
  setUser: (user: OrgUser | null) => void;
  login: (email: string, password: string) => Promise<void>;
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
      setUser: (user) => set({ user }),

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          // api auto-unwraps { success, data } → we get the inner data object
          const result = await api.post<{
            user: OrgUser;
            access_token: string;
            refresh_token: string;
          }>("/auth/login", { email, password });

          if (!result.user.organization_id) {
            throw new Error("This account isn't linked to an organization. Contact your PAII account manager.");
          }

          set({
            user: result.user,
            accessToken: result.access_token,
            refreshToken: result.refresh_token,
          });
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
          const result = await api.post<{ access_token: string; refresh_token: string }>(
            "/auth/refresh",
            { refresh_token: refreshToken }
          );
          set({
            accessToken: result.access_token,
            refreshToken: result.refresh_token,
          });
          return true;
        } catch (err) {
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
          const user = await api.get<OrgUser>("/auth/me", accessToken);
          set({ user });
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) {
            const refreshed = await get().refreshTokens();
            if (refreshed) {
              const user = await api.get<OrgUser>("/auth/me");
              set({ user });
            }
          }
        }
      },
    }),
    {
      name: "pai-org-portal-auth",
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
