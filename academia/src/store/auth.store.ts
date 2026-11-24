"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { api, ApiError } from "@/lib/api";
import type { AcademiaUser, InstitutionMembership } from "@/types";

interface AuthState {
  user: AcademiaUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  memberships: InstitutionMembership[];
  currentInstitutionId: string | null;
  isLoading: boolean;
  _hasHydrated: boolean;

  setHasHydrated: (v: boolean) => void;
  setCurrentInstitution: (institutionId: string) => void;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshTokens: () => Promise<boolean>;
  fetchMe: () => Promise<void>;
}

// Only owner/admin memberships grant access to this portal at all — a
// professor-only membership belongs in the professors app, not here.
const ADMIN_ROLES = new Set(["owner", "admin"]);

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      memberships: [],
      currentInstitutionId: null,
      isLoading: false,
      _hasHydrated: false,

      setHasHydrated: (v) => set({ _hasHydrated: v }),
      setCurrentInstitution: (institutionId) => set({ currentInstitutionId: institutionId }),

      login: async (email, password) => {
        set({ isLoading: true });
        try {
          const result = await api.post<{
            user: AcademiaUser;
            access_token: string;
            refresh_token: string;
          }>("/auth/login", { email, password });

          const memberships = await api.get<InstitutionMembership[]>("/me/institution-memberships", result.access_token);
          const adminMemberships = memberships.filter((m) => ADMIN_ROLES.has(m.role));
          if (adminMemberships.length === 0) {
            throw new Error("This account isn't an admin at any institution. Contact your PAII account manager.");
          }

          set({
            user: result.user,
            accessToken: result.access_token,
            refreshToken: result.refresh_token,
            memberships: adminMemberships,
            currentInstitutionId: adminMemberships[0].institution.id,
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
        set({ user: null, accessToken: null, refreshToken: null, memberships: [], currentInstitutionId: null });
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
            set({ user: null, accessToken: null, refreshToken: null, memberships: [], currentInstitutionId: null });
          }
          return false;
        }
      },

      fetchMe: async () => {
        const { accessToken } = get();
        if (!accessToken) return;
        try {
          const [user, memberships] = await Promise.all([
            api.get<AcademiaUser>("/auth/me", accessToken),
            api.get<InstitutionMembership[]>("/me/institution-memberships", accessToken),
          ]);
          const adminMemberships = memberships.filter((m) => ADMIN_ROLES.has(m.role));
          set({
            user,
            memberships: adminMemberships,
            currentInstitutionId: get().currentInstitutionId && adminMemberships.some((m) => m.institution.id === get().currentInstitutionId)
              ? get().currentInstitutionId
              : adminMemberships[0]?.institution.id ?? null,
          });
        } catch (err) {
          if (err instanceof ApiError && err.status === 401) {
            const refreshed = await get().refreshTokens();
            if (refreshed) {
              const user = await api.get<AcademiaUser>("/auth/me");
              set({ user });
            }
          }
        }
      },
    }),
    {
      name: "pai-academia-auth",
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
        memberships: state.memberships,
        currentInstitutionId: state.currentInstitutionId,
      }),
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated(true);
      },
    }
  )
);
