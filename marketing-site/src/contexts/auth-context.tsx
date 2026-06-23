"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

const API = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api/v1";
const LMS = process.env.NEXT_PUBLIC_LMS_URL || "https://learn.paii.ca";
const AUTH_KEY = "pai-auth";

type UserProfile = {
  id: string;
  email: string;
  role: string;
  profile?: { first_name: string; last_name: string; avatar_url?: string };
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

  // Both apps share localhost:3000 as their origin (student portal is proxied at /lms/*).
  // localStorage is the same, so a plain link is all that's needed — no SSO params.
  const ssoLink = useCallback((path: string) => `${LMS}${path}`, []);

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
    // Student portal shares the same origin — clearing localStorage here is enough.
    // The storage event listener in auth.store.ts handles any open student-portal tabs.
  }, [accessToken]);

  return (
    <AuthContext.Provider value={{ user, accessToken, refreshToken, hydrated, login, logout, ssoLink }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
