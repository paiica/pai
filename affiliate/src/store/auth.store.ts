"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { api, ApiError } from "@/lib/api";
import type { AffiliateUser } from "@/types";

interface AuthState {
  user: AffiliateUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isLoading: boolean;
  _hasHydrated: boolean;

  setHasHydrated: (v: boolean) => void;
  setUser: (user: AffiliateUser | null) => void;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<boolean>;
  fetchMe: () => Promise<void>;
}

export interface RegisterData {
  email: string;
  password: string;
  first_name: string;
  last_name: string;
  phone?: string;
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
            user: AffiliateUser;
            access_token: string;
            refresh_token: string;
          }>("/auth/login", { email, password });

          if (result.user.role !== "sales_rep") {
            throw new Error("Access denied. This portal is for sales affiliates only.");
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

      register: async (formData) => {
        set({ isLoading: true });
        try {
          await api.post("/auth/register", {
            ...formData,
            role: "sales_rep",
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
          const user = await api.get<AffiliateUser>("/auth/me", accessToken);
          set({ user });
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) {
            const refreshed = await get().refreshTokens();
            if (refreshed) {
              const user = await api.get<AffiliateUser>("/auth/me");
              set({ user });
            }
          }
        }
      },
    }),
    {
      name: "pai-affiliate-auth",
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
