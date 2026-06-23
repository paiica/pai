import { create } from "zustand";
import { persist } from "zustand/middleware";

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
      setSession: (accessToken, refreshToken, user) => set({ accessToken, refreshToken, user }),
      setAccessToken: (accessToken) => set({ accessToken }),
      clear: () => set({ accessToken: null, refreshToken: null, user: null }),
      setHydrated: () => set({ _hydrated: true }),
    }),
    {
      name: "exam-admin-auth",
      onRehydrateStorage: () => (state) => { state?.setHydrated(); },
    },
  ),
);
